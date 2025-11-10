// pages/chef-ai.js
import { useState } from 'react';
import Header from '../components/Header';

export default function ChefAI() {
  const [sign, setSign] = useState('taurus');
  const [lang, setLang] = useState('fr');
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generateRecipe() {
    setLoading(true);
    const res = await fetch('/api/chefai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sign, lang })
    });
    const json = await res.json();
    setRecipe(json);
    setLoading(false);
  }

  async function buyCard() {
    if (!recipe?.id) {
      alert('Génère la recette d’abord.');
      return;
    }
    const r = await fetch('/api/create-purchase-intent', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ recipe_id: recipe.id, email: recipe.email || '' })
    });
    const j = await r.json();
    if (j.checkout_url) window.location.href = j.checkout_url;
    else alert('Erreur création intent');
  }

  return (
    <>
      <Header />
      <main style={{padding:32}}>
        <h1>Chef-AI — Générateur de recette</h1>

        <div style={{display:'flex', gap:12, alignItems:'center', marginTop:12}}>
          <label>Sigil / Signe:
            <select value={sign} onChange={e=>setSign(e.target.value)} style={{marginLeft:8}}>
              <option value="aries">Aries</option>
              <option value="taurus">Taurus</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>

          <label>Langue:
            <select value={lang} onChange={e=>setLang(e.target.value)} style={{marginLeft:8}}>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>

          <button onClick={generateRecipe} disabled={loading} style={{padding:'8px 12px'}}>
            {loading ? 'Génération…' : 'Générer recette'}
          </button>
        </div>

        {recipe && (
          <article style={{marginTop:24, border:'1px solid #e6e6e6', padding:20, borderRadius:8, maxWidth:900}}>
            <h2>{recipe.title}</h2>
            <p><strong>Signe:</strong> {recipe.sign} — <strong>Lang:</strong> {recipe.lang}</p>
            <h3>Ingrédients</h3>
            <ul>{(recipe.ingredients||[]).map((i,idx)=><li key={idx}>{i}</li>)}</ul>
            <h3>Préparation</h3>
            <ol>{(recipe.steps||[]).map((s,idx)=><li key={idx}>{s}</li>)}</ol>

            <div style={{marginTop:16, display:'flex', gap:10}}>
              <button onClick={buyCard} style={{padding:'10px 14px'}}>Acheter la carte digitale</button>
              <a href={`/card/${encodeURIComponent(recipe.id)}`}><button style={{padding:'10px 14px'}}>Prévisualiser la carte</button></a>
            </div>
          </article>
        )}
      </main>
    </>
  );
}
