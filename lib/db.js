// lib/db.js
// Minimal DB helpers using Supabase (or adapt to your DB)
import { createClient } from '@supabase/supabase-js';
const supaUrl = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supaUrl || '', supaKey || '');

const INTENT_TABLE = process.env.INTENT_TABLE || 'purchase_intents';
const PURCHASES_TABLE = process.env.PURCHASES_TABLE || 'purchases';

// insert intent
export async function insertIntent(intent) {
  const { data, error } = await supabase.from(INTENT_TABLE).insert([intent]);
  if (error) throw error;
  return data[0];
}

export async function getIntentById(id) {
  const { data, error } = await supabase.from(INTENT_TABLE).select('*').eq('id', id).limit(1);
  if (error) throw error;
  return data && data[0];
}

export async function purchaseExists(order_id) {
  const { data, error } = await supabase.from(PURCHASES_TABLE).select('id').eq('order_id', order_id).limit(1);
  if (error) throw error;
  return (data && data.length > 0);
}

export async function markPurchaseProcessed({ order_id, recipe_id, file_url, customer_email, status = 'delivered' }) {
  const payload = { order_id, recipe_id, file_url, customer_email, status, created_at: new Date() };
  const { data, error } = await supabase.from(PURCHASES_TABLE).insert([payload]);
  if (error) throw error;
  return data[0];
}
