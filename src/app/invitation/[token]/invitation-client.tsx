"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { apiFetch } from "@/lib/client-api";

type Invitation = { name: string; email: string; role: string; companyName: string; expiresAt: string; passwordRequired: boolean };
export default function InvitationClient({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [accepted, setAccepted] = useState(false);
  useEffect(() => { apiFetch<Invitation>(`/api/invitations/${token}`).then(setInvitation).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Invitation invalide")).finally(() => setLoading(false)); }, [token]);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setError(""); const body = Object.fromEntries(new FormData(event.currentTarget)); try { await apiFetch(`/api/invitations/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); setAccepted(true); } catch (acceptError) { setError(acceptError instanceof Error ? acceptError.message : "Activation impossible"); } finally { setLoading(false); } };
  if (loading) return <main className="auth-page"><section className="auth-form-side"><div className="auth-card"><span className="eyebrow">Invitation sécurisée</span><h1>Vérification en cours…</h1></div></section></main>;
  if (accepted) return <main className="auth-page"><section className="auth-form-side"><div className="auth-card"><span className="eyebrow">Accès activé</span><h1>Bienvenue dans l’équipe.</h1><p>Votre accès est prêt. Connectez-vous avec votre adresse email.</p><Link className="primary" href="/connexion">Aller à la connexion</Link></div></section></main>;
  if (error || !invitation) return <main className="auth-page"><section className="auth-form-side"><div className="auth-card"><span className="eyebrow">Invitation</span><h1>Invitation indisponible</h1><p>{error || "Cette invitation n’est plus valide."}</p><Link className="outline" href="/connexion">Retour à la connexion</Link></div></section></main>;
  return <main className="auth-page"><section className="auth-form-side"><form className="auth-card" onSubmit={submit}><span className="eyebrow">Invitation à rejoindre</span><div><h1>{invitation.companyName}</h1><p>{invitation.name}, vous êtes invité(e) comme {invitation.role}.</p></div><label>Adresse e-mail<input value={invitation.email} readOnly /></label>{invitation.passwordRequired && <label>Choisissez votre mot de passe<PasswordField name="password" autoComplete="new-password" minLength={12} /><small>12 caractères minimum.</small></label>}{error && <div className="form-error" role="alert">{error}</div>}<button className="primary" disabled={loading}>{loading ? "Activation…" : "Activer mon accès"}</button><p className="auth-link">Vous utiliserez ensuite la connexion habituelle.</p></form></section></main>;
}
