// pages/api/chefai.js
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sign = 'taurus', lang = 'fr', email = null } = req.body || {};

  // Here you would call your AI (OpenAI) to generate a recipe. For now we return a demo recipe.
  const demo = {
    id: `recipe_${nanoid(8)}`,
    title: `${sign} — Recette spéciale`,
    sign,
    lang,
    ingredients: ['1 tasse de riz', '500g poisson', '2 tomates', '1 oignon', 'épices'],
    steps: ['Nettoyer le poisson', 'Préparer la sauce', 'Cuire le riz', 'Assembler'],
    notes: 'Recette générée par Chef-AI (demo)'
  };

  try {
    if (supabase) {
      const { data, error } = await supabase.from('recipes').insert([demo]).select().single();
      if (error) console.warn('Supabase insert error', error);
      else demo.id = data.id || demo.id;
    }
  } catch(err) {
    console.warn('Supabase failure', err);
  }

  // return recipe object
  return res.status(200).json(demo);
}
