import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
const r = (p) => path.resolve(__dirname, p);
export default defineConfig({
  root: __dirname,
  css: { postcss: path.resolve(__dirname, '..') },
  plugins: [react(), { name: 'mock-supabase', enforce: 'pre', resolveId(source) { if (/(^|\/)supabaseClient(\.js)?$/.test(source)) return r('mockSupabase.js'); if (/(^|\/)AuthContext(\.jsx)?$/.test(source)) return r('mockAuth.jsx'); return null; } }],
  server: { port: 5199, strictPort: true, fs: { strict: false } },
  resolve: {
    alias: [
      { find: '@/api/supabaseClient', replacement: r('mockSupabase.js') },
      { find: '@/lib/AuthContext', replacement: r('mockAuth.jsx') },
      { find: '@', replacement: r('../src') },
    ],
  },
});
