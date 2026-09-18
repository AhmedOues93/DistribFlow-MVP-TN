import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";
import { ProtectedPage } from "@/components/protected-page";
import { StarterDataClient } from "@/components/starter-data-client";
import { getSessionDetails } from "@/lib/services/auth";

const roleLabels: Record<string, string> = { PLATFORM_ADMIN: "Administrateur plateforme", OWNER: "Propriétaire", ADMIN: "Administrateur", SALES: "Commercial", WAREHOUSE: "Responsable entrepôt", READ_ONLY: "Lecture seule", SALES_AGENT: "Commercial", WAREHOUSE_MANAGER: "Responsable entrepôt", DRIVER: "Livreur", ACCOUNTANT: "Comptable", VIEWER: "Lecteur" };

export default async function ProfilePage() {
  const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value);
  if (!session) redirect("/connexion");
  return <ProtectedPage><main className="content"><div className="page-heading"><div><p className="eyebrow">Espace entreprise</p><h1>Profil & paramètres</h1><p>Retrouvez votre identité, vos droits d’accès et les repères de sécurité de votre espace.</p></div></div><div className="dashboard-grid"><section className="panel"><div className="panel-title"><div><h2>Votre profil</h2><p>Identité actuellement connectée.</p></div><div className="avatar user-avatar"><UserRound size={17} /></div></div><div className="order-summary"><div><strong>Nom</strong><span>{session.userName}</span></div><div><strong>Rôle</strong><span>{roleLabels[session.role] ?? session.role}</span></div><div><strong>Entreprise</strong><span>{session.tenantName}</span></div></div></section><section className="panel" id="preferences"><div className="panel-title"><div><h2>Accès & sécurité</h2><p>Les permissions sont appliquées par entreprise.</p></div><ShieldCheck size={22} color="var(--copper-600)" /></div><div className="empty-state"><strong>Session protégée</strong><p>DistribFlow limite chaque lecture et chaque action à votre entreprise et à votre rôle.</p></div></section></div>{(session.role === "OWNER" || session.role === "PLATFORM_ADMIN") && <section className="panel"><div className="panel-title"><div><h2>Configuration de démarrage</h2><p>Ajoutez les unités, catégories et l’entrepôt standard manquants, sans modifier vos données.</p></div></div><StarterDataClient /></section>}</main></ProtectedPage>;
}
