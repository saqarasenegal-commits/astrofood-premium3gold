// pages/api/recipes/[id].js
import { createClient } from '@supabase/supabase-js';
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const { id } = req.query;
  const { data, error } = await supa.from('recipes').select('*').eq('id', id).limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Not found' });
  return res.status(200).json(data[0]);
}
