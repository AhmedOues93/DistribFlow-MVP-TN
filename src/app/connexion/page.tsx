"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/password-field";

type Company = { tenantId: string; tenantName: string; role: string };

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const values = new FormData(event.currentTarget);
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Connexion impossible"); if (payload.companies?.length > 1) { setCompanies(payload.companies); setSelectedCompany(payload.tenantId); } else { router.replace(payload.redirectTo ?? "/dashboard"); router.refresh(); } }
    catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Connexion impossible"); }
    finally { setLoading(false); }
  }
  async function chooseCompany() { setLoading(true); setError(""); try { const response = await fetch("/api/auth/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: selectedCompany }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Changement impossible"); router.replace(payload.redirectTo ?? "/dashboard"); router.refresh(); } catch (switchError) { setError(switchError instanceof Error ? switchError.message : "Changement impossible"); } finally { setLoading(false); } }
  return <main className="auth-page"><section className="auth-visual"><Link className="brand" href="/"><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></Link><h2>Chaque tournée commence par une bonne décision.</h2><p>Centralisez vos clients, votre stock et vos commandes dans un espace pensé pour les équipes de distribution.</p><div className="auth-points"><span><Check size={13} /> Suivi opérationnel</span><span><ShieldCheck size={13} /> Données par entreprise</span></div></section><section className="auth-form-side">{companies.length > 1 ? <div className="auth-card"><div><h1>Choisissez votre entreprise</h1><p>Votre compte dispose de plusieurs espaces actifs.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<label>Entreprise<select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>{companies.map((company) => <option key={company.tenantId} value={company.tenantId}>{company.tenantName}</option>)}</select></label><button className="primary" disabled={loading} onClick={() => void chooseCompany()}>{loading ? "Ouverture…" : "Ouvrir l’espace"}</button></div> : <form className="auth-card" onSubmit={submit}><div><h1>Bon retour</h1><p>Connectez-vous à votre espace de distribution.</p><p className="auth-helper">Les propriétaires créent leur entreprise. Les employés invités activent leur accès depuis le lien reçu, puis se connectent ici.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<label>Adresse e-mail<input required name="email" type="email" autoComplete="email" /></label><label>Mot de passe<PasswordField name="password" autoComplete="current-password" /></label><button className="primary" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button><p className="auth-link">Vous êtes propriétaire et démarrez ? <Link href="/inscription">Créer mon entreprise</Link></p></form>}</section></main>;
}
