// pages/premium.js
import Header from '../components/Header';
import Link from 'next/link';

export default function Premium() {
  return (
    <>
      <Header />
      <main style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
        <section style={{ maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ fontSize: 40, marginBottom: 8 }}>AstroFood — Premium Gold</h1>
          <p style={{ color: '#475569' }}>Recettes IA par signe, cartes digitales imprimables, packs premium.</p>

          <div style={{ marginTop: 28, display:'flex', gap:12 }}>
            <Link href="/chef-ai"><button style={{padding:'12px 18px'}}>Lancer Chef-AI → Générer une recette</button></Link>
            <Link href="/card/test_recipe_123"><button style={{padding:'12px 18px'}}>Voir carte exemple</button></Link>
          </div>

          <hr style={{margin:'32px 0'}} />

          <h2>Comment ça marche</h2>
          <ol>
            <li>Génère une recette via Chef-AI</li>
            <li>Prévisualise la carte digitale</li>
            <li>Paye via LemonSqueezy → webhook génère PDF & envoie lien</li>
          </ol>

        </section>
      </main>
    </>
  );
}
