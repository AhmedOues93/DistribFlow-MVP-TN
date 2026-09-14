import Link from "next/link";
export default function NotFound(){return <main className="auth-page"><section className="auth-card"><h1>Page introuvable</h1><p>Cette page n’existe pas ou n’est plus disponible.</p><Link className="primary" href="/dashboard">Retour au tableau de bord</Link></section></main>}
