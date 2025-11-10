// pages/index.js
export default function Home() {
  return (
    <main style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      minHeight: '100vh',
      padding: '48px',
      background: 'linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)',
      color: '#0f172a'
    }}>
      <header style={{ display:'flex', alignItems:'center', gap:20 }}>
        <img
          src="/af_logo.png"
          alt="AstroFood logo"
          style={{ width:96, height:'auto', borderRadius:8, boxShadow:'0 4px 14px rgba(2,6,23,0.06)' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div>
          <h1 style={{ margin:0, fontSize:28 }}>AstroFood</h1>
          <p style={{ margin:0, color:'#475569' }}>Site en ligne — test & debug</p>
        </div>
      </header>

      <section style={{ marginTop:36 }}>
        <h2>Vérifications rapides</h2>
        <ul>
          <li>API test: <code>/api/create-purchase-intent</code></li>
          <li>Webhook: <code>/api/lemonsqueezy-webhook</code> (configuré côté LemonSqueezy)</li>
        </ul>
        <p style={{ marginTop:12 }}>
          Si le logo n’apparaît pas, uploade une image nommée <code>/public/af_logo.png</code> (via GitHub).
        </p>
      </section>
    </main>
  );
}
