// lib/db.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // We still export a thin wrapper to avoid runtime crashes — logs will help debug
  console.warn('Supabase environment variables not set: SUPABASE_URL or SUPABASE_SERVICE_KEY/ANON missing.');
}

let supabase;
if (!globalThis.__supabase) {
  globalThis.__supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    // optional config
    auth: { persistSession: false }
  });
}
supabase = globalThis.__supabase;

export default supabase;
