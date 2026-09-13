"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router=useRouter(); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const values=new FormData(event.currentTarget); try { const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:values.get("email"),password:values.get("password")})}); const payload=await response.json(); if(!response.ok) throw new Error(payload.error ?? "Connexion impossible"); router.replace("/clients"); router.refresh(); } catch(loginError) { setError(loginError instanceof Error ? loginError.message : "Connexion impossible"); } finally { setLoading(false); } }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><a className="brand" href="/"><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></a><div><h1>Bon retour</h1><p>Connectez-vous à votre espace de distribution.</p></div>{error && <div className="form-error" role="alert">{error}</div>}<label>Adresse e-mail<input required name="email" type="email" autoComplete="email" /></label><label>Mot de passe<input required name="password" type="password" autoComplete="current-password" /></label><button className="primary" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button><p className="auth-link">Pas encore de compte ? <a href="/inscription">Créer mon entreprise</a></p></form></main>;
}
