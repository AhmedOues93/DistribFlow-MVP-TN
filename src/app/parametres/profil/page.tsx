import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { getSessionDetails } from "@/lib/services/auth";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value);
  if (!session) redirect("/connexion");
  return <ProtectedPage><main className="content"><div className="page-heading"><div><p className="eyebrow">Espace entreprise</p><h1>Profil & paramètres</h1><p>Gérez votre identité, votre sécurité et vos préférences.</p></div></div><ProfileClient /></main></ProtectedPage>;
}
