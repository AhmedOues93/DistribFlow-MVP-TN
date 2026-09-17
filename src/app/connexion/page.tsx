"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/password-field";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const values = new FormData(event.currentTarget);
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Connexion impossible"); router.replace("/dashboard"); router.refresh(); }
    catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Connexion impossible"); }
    finally { setLoading(false); }
  }
  return <main className="auth-page"><section className="auth-visual"><Link className="brand" href="/"><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></Link><h2>Chaque tournée commence par une bonne décision.</h2><p>Centralisez vos clients, votre stock et vos commandes dans un espace pensé pour les équipes de distribution.</p><div className="auth-points"><span><Check size={13} /> Suivi opérationnel</span><span><ShieldCheck size={13} /> Données par entreprise</span></div></section><section className="auth-form-side"><form className="auth-card" onSubmit={submit}><div><h1>Bon retour</h1><p>Connectez-vous à votre espace de distribution.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<label>Adresse e-mail<input required name="email" type="email" autoComplete="email" /></label><label>Mot de passe<PasswordField name="password" autoComplete="current-password" /></label><button className="primary" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button><p className="auth-link">Pas encore de compte ? <Link href="/inscription">Créer mon entreprise</Link></p></form></section></main>;
}
