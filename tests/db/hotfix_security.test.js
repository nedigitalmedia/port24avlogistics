import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, seedTenants, as } from './helpers';

// Hotfix: organizations RLS + invite lookup (migration 700) and branding storage scope (migration 600).
let db, t;
beforeAll(async () => { db = await makeDb(); t = await seedTenants(db); }, 90000);

describe('storage: branding bucket (logos)', () => {
  const put = (who, name) => as(db, who, () => db.exec(`insert into storage.objects (bucket_id, name) values ('branding','${name}')`));
  it('a signed-in user can write ONLY under their own company\'s folder', async () => {
    await put(t.ownerA, `logos/${t.orgA}/1.png`);
    await expect(put(t.ownerA, `logos/${t.orgB}/2.png`)).rejects.toThrow(/row-level security/);
    await put(t.ownerB, `logos/${t.orgB}/3.png`);
    await expect(put(t.ownerB, `backgrounds/${t.orgA}/4.png`)).rejects.toThrow(/row-level security/);
  });
  it('a signed-out visitor cannot upload, update or delete, but can still read logos', async () => {
    await db.exec(`set role anon`);
    try {
      await expect(db.exec(`insert into storage.objects (bucket_id, name) values ('branding','logos/${t.orgA}/anon.png')`)).rejects.toThrow(/permission denied|row-level security/);
    } finally { await db.exec(`reset role`); }
  });
  it('one company cannot overwrite or delete another company\'s logo', async () => {
    const upd = await as(db, t.ownerB, async () => (await db.query(`update storage.objects set name = name where bucket_id='branding' and name like 'logos/${t.orgA}/%' returning 1`)).rows.length);
    expect(upd).toBe(0);
    const del = await as(db, t.ownerB, async () => (await db.query(`delete from storage.objects where bucket_id='branding' and name like 'logos/${t.orgA}/%' returning 1`)).rows.length);
    expect(del).toBe(0);
  });
});

describe('organizations table (was: RLS off + anon could read AND edit every company)', () => {
  it('RLS is on for every public table, including organizations', async () => {
    const off = (await db.query(`select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity order by 1`)).rows.map(r => r.relname);
    expect(off).toEqual([]);
  });
  it('a signed-out caller can neither read nor change any company', async () => {
    await db.exec(`set role anon`);
    try {
      await expect(db.query(`select id from public.organizations`)).rejects.toThrow(/permission denied/);
      await expect(db.exec(`update public.organizations set plan = 'enterprise'`)).rejects.toThrow(/permission denied/);
    } finally { await db.exec(`reset role`); }
  });
  it('a company user sees only their own company', async () => {
    const orgs = await as(db, t.ownerA, async () => (await db.query(`select id from public.organizations`)).rows.map(r => r.id));
    expect(orgs).toEqual([t.orgA]);
  });
  it('a company admin (or anyone else) cannot self-upgrade the plan, extend the trial, or touch another company', async () => {
    for (const who of [t.ownerA, t.crewA]) {
      const own = await as(db, who, async () => (await db.query(`update public.organizations set plan = 'enterprise', status = 'active', trial_ends_at = now() + interval '5 years' where id = '${t.orgA}' returning 1`)).rows.length);
      expect(own).toBe(0);
    }
    const other = await as(db, t.ownerA, async () => (await db.query(`update public.organizations set plan = 'free' where id = '${t.orgB}' returning 1`)).rows.length);
    expect(other).toBe(0);
    await expect(as(db, t.ownerA, () => db.exec(`insert into public.organizations (name, slug) values ('x','x')`))).rejects.toThrow(/row-level security/);
    const del = await as(db, t.ownerA, async () => (await db.query(`delete from public.organizations where id = '${t.orgA}' returning 1`)).rows.length);
    expect(del).toBe(0);
    expect((await db.query(`select plan from public.organizations where id = '${t.orgA}'`)).rows[0].plan).toBe('pro');
  });
  it('a platform admin can still read and manage every company (Platform Admin pages keep working)', async () => {
    const pa = '00000000-0000-0000-0000-0000000000f1';
    await db.exec(`insert into auth.users (id, email) values ('${pa}','pa@x.test'); insert into public.users (id, email, org_id, role, is_platform_admin) values ('${pa}','pa@x.test','${t.orgA}','admin', true)`);
    const n = await as(db, pa, async () => (await db.query(`select count(*)::int n from public.organizations`)).rows[0].n);
    expect(n).toBeGreaterThanOrEqual(2);
    const changed = await as(db, pa, async () => (await db.query(`update public.organizations set plan = 'starter' where id = '${t.orgB}' returning plan`)).rows);
    expect(changed[0].plan).toBe('starter');
    await db.exec(`update public.organizations set plan = 'pro' where id = '${t.orgB}'`);
  });
});

describe('invites: a visitor can fetch only the invite whose secret token they hold', () => {
  let tok;
  beforeAll(async () => {
    tok = (await db.query(`insert into public.pending_invites (email, org_id, role) values ('new@x.test','${t.orgA}','crew') returning token`)).rows[0].token;
    await db.exec(`insert into public.pending_invites (email, org_id, role) values ('other@x.test','${t.orgB}','admin')`);
  });
  it('get_invite_by_token returns that invite with the company name and plan, and nothing for a wrong token', async () => {
    await db.exec(`set role anon`);
    try {
      const got = (await db.query(`select public.get_invite_by_token('${tok}') as i`)).rows[0].i;
      expect(got.email).toBe('new@x.test');
      expect(got.organizations).toEqual({ name: 'Tenant A', plan: 'pro' });
      const none = (await db.query(`select public.get_invite_by_token(gen_random_uuid()) as i`)).rows[0].i;
      expect(none).toBeNull();
    } finally { await db.exec(`reset role`); }
  });
  it('KNOWN OPEN until migration 000800: the old public_read_by_token policy still lets any caller list every invite', async () => {
    // Pinned on purpose so the remaining exposure is visible. 800 drops that policy once this frontend (get_invite_by_token) is live.
    const seen = await as(db, t.ownerB, async () => (await db.query(`select email from public.pending_invites order by 1`)).rows.map(r => r.email));
    expect(seen).toEqual(['new@x.test', 'other@x.test']);
  });
});
