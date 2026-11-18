import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

/** Migrations created AFTER the 2026-11-12 schema snapshot, applied in filename order. */
export function postSnapshotMigrations() {
  const dir = path.join(ROOT, 'supabase/migrations');
  return fs.readdirSync(dir).filter(f => f >= '20261117' && f.endsWith('.sql')).sort().map(f => path.join(dir, f));
}

/**
 * Fresh in-memory Postgres shaped like production: Supabase roles + auth stubs, the schema snapshot, then
 * every migration made since. `auth.uid()` reads the `request.jwt.claim.sub` setting so tests can "log in"
 * as a user with `await as(db, userId)` and exercise the real RLS policies.
 */
export async function makeDb({ migrations = true } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
    -- like Supabase's storage.foldername(): the directory parts of the path (everything but the file name)
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(coalesce(array_length(string_to_array(name, '/'), 1), 1) - 1, 0)] $$;
    alter table storage.objects enable row level security;
    create schema extensions;
  `);
  let sql = fs.readFileSync(path.join(ROOT, 'tests/db/baseline_schema.sql'), 'utf8').replace(/create extension[^\n]*\n/g, '');
  await db.exec(sql);
  await db.exec(`grant usage on schema public to anon, authenticated, service_role; grant all on all tables in schema public to anon, authenticated, service_role; grant all on all functions in schema public to anon, authenticated, service_role; grant usage on schema auth to anon, authenticated, service_role; grant usage on schema storage to anon, authenticated, service_role; grant all on all tables in schema storage to anon, authenticated, service_role; grant all on all functions in schema storage to anon, authenticated, service_role;`);
  // Supabase grants these automatically on tables/functions created later; mirror that so new migrations behave like production
  await db.exec(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role; alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
  if (migrations) {
    for (const f of postSnapshotMigrations()) {
      try { await db.exec(fs.readFileSync(f, 'utf8')); }
      catch (e) { throw new Error(`migration ${path.basename(f)} failed: ${e.message}`); }
    }
  }
  return db;
}

/** Run `fn` as an authenticated user (RLS applies). Always resets the role afterwards. */
export async function as(db, userId, fn) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); select set_config('request.jwt.claim.role', 'authenticated', false); set role authenticated;`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

/** Two synthetic tenants, each with an owner, to exercise isolation. Returns ids. */
export async function seedTenants(db) {
  const ids = {
    orgA: '00000000-0000-0000-0000-00000000000a', orgB: '00000000-0000-0000-0000-00000000000b',
    ownerA: '00000000-0000-0000-0000-0000000000a1', ownerB: '00000000-0000-0000-0000-0000000000b1',
    crewA: '00000000-0000-0000-0000-0000000000a2',
  };
  await db.exec(`
    insert into public.organizations (id, name, slug, plan) values ('${ids.orgA}','Tenant A','a','pro'), ('${ids.orgB}','Tenant B','b','pro');
    insert into auth.users (id, email) values ('${ids.ownerA}','a@x.test'), ('${ids.ownerB}','b@x.test'), ('${ids.crewA}','crew@x.test');
    insert into public.users (id, email, org_id, role) values ('${ids.ownerA}','a@x.test','${ids.orgA}','admin'), ('${ids.ownerB}','b@x.test','${ids.orgB}','admin'), ('${ids.crewA}','crew@x.test','${ids.orgA}','crew');
    insert into public.company_memberships (user_id, org_id, role, status) values ('${ids.ownerA}','${ids.orgA}','admin','active'), ('${ids.ownerB}','${ids.orgB}','admin','active'), ('${ids.crewA}','${ids.orgA}','crew','active');
  `);
  return ids;
}
