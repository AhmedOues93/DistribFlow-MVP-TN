import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { getSessionDetails } from "@/lib/services/auth";
import CompanyBrandingClient from "./company-branding-client";

export default async function CompanySettingsPage() { const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value); if (!session) redirect("/connexion"); const canEdit = ["PLATFORM_ADMIN", "OWNER", "ADMIN"].includes(session.role); return <ProtectedPage><main className="content"><div className="page-heading"><div><p className="eyebrow">Espace entreprise</p><h1>Marque de l’entreprise</h1><p>Présentez une identité claire dans l’application et les documents imprimés.</p></div></div><CompanyBrandingClient canEdit={canEdit} /></main></ProtectedPage>; }
