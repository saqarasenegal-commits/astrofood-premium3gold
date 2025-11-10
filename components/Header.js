// components/Header.js
import Link from 'next/link';

export default function Header() {
  return (
    <header style={{display:'flex', alignItems:'center', gap:16, padding:16, borderBottom:'1px solid #eee'}}>
      <Link href="/"><img src="/af_logo.png" alt="AstroFood logo" style={{width:64, height:'auto'}} onError={(e)=> e.currentTarget.style.display='none'} /></Link>
      <nav style={{display:'flex', gap:12}}>
        <Link href="/"><a>Accueil</a></Link>
        <Link href="/premium"><a>Premium</a></Link>
        <Link href="/chef-ai"><a>Chef-AI</a></Link>
      </nav>
    </header>
  );
}
