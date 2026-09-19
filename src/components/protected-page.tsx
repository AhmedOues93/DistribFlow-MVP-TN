import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionDetails } from "@/lib/services/auth";
import { canonicalRole } from "@/lib/tenant";
import { AppShell } from "./app-shell";
export async function ProtectedPage({ children }: { children: React.ReactNode }) { const session=await getSessionDetails((await cookies()).get("distribflow_session")?.value); if(!session) redirect("/connexion"); if (["SALES", "WAREHOUSE", "DRIVER", "READ_ONLY"].includes(canonicalRole(session.role))) redirect("/travailleur"); return <AppShell session={session}>{children}</AppShell>; }
