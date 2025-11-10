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

const INTENT_TABLE = process.env.INTENT_TABLE || 'purchase_intents';
const PURCHASES_TABLE = process.env.PURCHASES_TABLE || 'purchases';
const PURCHASES_BUCKET = process.env.SUPABASE_BUCKET || 'purchases';

async function insertIntent(intentObj) {
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
  const { data, error } = await _supabase
    .from(PURCHASES_TABLE)
    .insert([purchaseObj])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * markPurchaseProcessed
 * Met à jour l'enregistrement d'une purchase en marquant qu'elle a été traitée.
 * Exemple d'utilisation: markPurchaseProcessed(purchaseId, { status: 'processed', processed_at: new Date().toISOString() })
 */
async function markPurchaseProcessed(purchaseId, update = {}) {
  const { data, error } = await _supabase
    .from(PURCHASES_TABLE)
    .update(update)
    .eq('id', purchaseId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * uploadFileToBucket - upload un Buffer (ou Readable) vers le bucket configuré
 * Retourne l'objet upload (ou lève une erreur)
 */
async function uploadFileToBucket(filename, bufferOrStream, options = {}) {
  const bucket = PURCHASES_BUCKET;
  if (!bucket) throw new Error('SUPABASE_BUCKET not configured');
  const { data, error } = await _supabase.storage.from(bucket).upload(filename, bufferOrStream, {
    upsert: false,
    contentType: options.contentType || 'application/pdf'
  });
  if (error) throw error;
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
  markPurchaseProcessed,
  uploadFileToBucket,
  createSignedUrl
};

