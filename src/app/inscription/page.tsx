"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/password-field";

export default function RegistrationPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const values = new FormData(event.currentTarget);
    try { const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: values.get("companyName"), name: values.get("name"), email: values.get("email"), password: values.get("password") }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Inscription impossible"); const login = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) }); if (!login.ok) throw new Error("Compte créé. Connectez-vous pour continuer."); router.replace("/dashboard"); router.refresh(); }
    catch (registrationError) { setError(registrationError instanceof Error ? registrationError.message : "Inscription impossible"); }
    finally { setLoading(false); }
  }
  return <main className="auth-page"><section className="auth-visual"><Link className="brand" href="/"><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></Link><h2>Une vision claire du terrain.</h2><p>Un espace fiable pour orchestrer les flux de vos équipes et servir vos clients avec précision.</p><div className="auth-points"><span><Check size={13} /> Mise en route rapide</span><span><ShieldCheck size={13} /> Sécurité par tenant</span></div></section><section className="auth-form-side"><form className="auth-card" onSubmit={submit}><div><h1>Créez votre entreprise</h1><p>Commencez par votre compte propriétaire.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<label>Nom de l’entreprise<input required name="companyName" minLength={2} autoComplete="organization" /></label><label>Votre nom<input required name="name" minLength={2} autoComplete="name" /></label><label>Adresse e-mail<input required name="email" type="email" autoComplete="email" /></label><label>Mot de passe<PasswordField name="password" autoComplete="new-password" minLength={12} /><small>12 caractères minimum.</small></label><button className="primary" disabled={loading}>{loading ? "Création…" : "Créer mon compte"}</button><p className="auth-link">Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p></form></section></main>;
}
