// lib/recipes.js
// Adapt this to your real recipe storage. This stub expects a Supabase table 'recipes'.
import { createClient } from '@supabase/supabase-js';
const supa = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');

export async function getRecipeById(recipeId) {
  if (!recipeId) return null;
  const { data, error } = await supa.from('recipes').select('*').eq('id', recipeId).limit(1);
  if (error) throw error;
  return data && data[0];
}
