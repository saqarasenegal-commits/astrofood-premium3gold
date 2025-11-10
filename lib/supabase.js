// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key for uploads/signed url

if (!SUPA_URL || !SUPA_KEY) {
  console.warn('Supabase env vars not set (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
}

const supabase = createClient(SUPA_URL || '', SUPA_KEY || '');

export async function supabaseUploadBufferAndGetSignedUrl(path, buffer, contentType = 'application/pdf', expiresInSeconds = 60 * 60 * 24 * 3) {
  // bucket name 'purchases' assumed; create this bucket in Supabase UI (private)
  const bucket = process.env.SUPABASE_BUCKET || 'purchases';
  // upload
  const { data, error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false
  });
  if (uploadError) throw uploadError;
  // create signed url
  const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (signedErr) throw signedErr;
  return signedData.signedUrl;
}
