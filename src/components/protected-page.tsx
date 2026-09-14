import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionDetails } from "@/lib/services/auth";
import { AppShell } from "./app-shell";
export async function ProtectedPage({ children }: { children: React.ReactNode }) { const session=await getSessionDetails((await cookies()).get("distribflow_session")?.value); if(!session) redirect("/connexion"); return <AppShell session={session}>{children}</AppShell>; }
