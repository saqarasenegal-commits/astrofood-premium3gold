// lib/db.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase env missing: SUPABASE_URL or SUPABASE_SERVICE_KEY/ANON not set.');
}

let _supabase;
if (!globalThis.__supabase_client) {
  globalThis.__supabase_client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
}
_supabase = globalThis.__supabase_client;

/**
 * Utility helpers used by the server API endpoints.
 * - INTENT_TABLE and PURCHASES_TABLE must be set in Vercel env.
 */
const INTENT_TABLE = process.env.INTENT_TABLE || 'purchase_intents';
const PURCHASES_TABLE = process.env.PURCHASES_TABLE || 'purchases';
const PURCHASES_BUCKET = process.env.SUPABASE_BUCKET || 'purchases';

async function insertIntent(intentObj) {
  // intentObj: { id, recipe_id, email, checkout_url, metadata, created_at, status }
  const { data, error } = await _supabase
    .from(INTENT_TABLE)
    .insert([intentObj])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getIntentById(id) {
  const { data, error } = await _supabase
    .from(INTENT_TABLE)
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function markIntentCompleted(id, update = {}) {
  const { data, error } = await _supabase
    .from(INTENT_TABLE)
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function purchaseExists(purchaseId) {
  const { data, error } = await _supabase
    .from(PURCHASES_TABLE)
    .select('id')
    .eq('id', purchaseId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function insertPurchase(purchaseObj) {
  // purchaseObj: { id, intent_id, buyer_email, invoice_url, pdf_path, created_at, meta... }
  const { data, error } = await _supabase
    .from(PURCHASES_TABLE)
    .insert([purchaseObj])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function uploadFileToBucket(filename, bufferOrStream, options = {}) {
  // expects SUPABASE_BUCKET to exist and be configured
  const bucket = PURCHASES_BUCKET;
  if (!bucket) throw new Error('SUPABASE_BUCKET not configured');
  // bufferOrStream should be a Buffer or ReadableStream
  const { data, error } = await _supabase.storage.from(bucket).upload(filename, bufferOrStream, {
    upsert: false,
    contentType: options.contentType || 'application/pdf'
  });
  if (error) throw error;
  // create signed url if needed
  return data;
}

async function createSignedUrl(filepath, expiresSeconds = 60 * 60) {
  const { data, error } = await _supabase.storage.from(PURCHASES_BUCKET).createSignedUrl(filepath, expiresSeconds);
  if (error) throw error;
  return data;
}

export default _supabase;
export {
  insertIntent,
  getIntentById,
  markIntentCompleted,
  purchaseExists,
  insertPurchase,
  uploadFileToBucket,
  createSignedUrl
};
