import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { getSessionDetails } from "@/lib/services/auth";
import { isTeamManager } from "@/lib/tenant";
import { MemberDetailClient } from "../team-client";

export default async function MemberPage({ params }: { params: Promise<{ membershipId: string }> }) { const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value); if (!session) redirect("/connexion"); if (!isTeamManager(session.role)) redirect("/dashboard"); return <ProtectedPage><MemberDetailClient membershipId={(await params).membershipId} /></ProtectedPage>; }
