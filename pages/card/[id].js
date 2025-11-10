// pages/card/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';

export default function CardPage() {
  const router = useRouter();
  const { id } = router.query;
  const [recipe, setRecipe] = useState(null);

  useEffect(()=>{
    if (!id) return;
    // fetch recipe data from your DB (recipes table) or fallback demo
    fetch(`/api/recipes/${id}`).then(r=>r.json()).then(setRecipe).catch(()=>setRecipe({
      id: 'test_recipe_123',
      title: 'Recette Démo — Thiébou Dieun',
      sign: 'taurus',
      lang: 'fr',
      ingredients: ['Riz', 'Poisson', 'Tomate'],
      steps: ['Cuire le riz','Préparer la sauce','Servir']
    }));
  },[id]);

  if (!recipe) return <div><Header /><main style={{padding:32}}>Chargement…</main></div>;

  return (
    <>
      <Header />
      <main style={{padding:32, maxWidth:900, margin:'0 auto'}}>
        <div style={{border:'1px solid #ddd', padding:24, borderRadius:8}}>
          <h1>{recipe.title}</h1>
          <p>Signe: {recipe.sign} • Lang: {recipe.lang}</p>
          <h3>Ingrédients</h3>
          <ul>{recipe.ingredients.map((i,idx)=><li key={idx}>{i}</li>)}</ul>
          <h3>Préparation</h3>
          <ol>{recipe.steps.map((s,idx)=><li key={idx}>{s}</li>)}</ol>

          <p style={{marginTop:20}}>
            Si cette carte a été achetée, tu recevras un email avec un lien de téléchargement (PDF).<br/>
            Sinon clique sur <strong>Acheter</strong> dans la page Chef-AI.
          </p>
        </div>
      </main>
    </>
  );
}
