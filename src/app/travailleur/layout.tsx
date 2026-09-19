import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WorkerShell } from "@/components/worker-shell";
import { getSessionDetails } from "@/lib/services/auth";
import { canonicalRole } from "@/lib/tenant";
export default async function WorkerLayout({ children }: { children: React.ReactNode }) { const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value); if (!session) return children; if (["OWNER", "ADMIN", "PLATFORM_ADMIN"].includes(canonicalRole(session.role))) redirect("/dashboard"); return <WorkerShell session={session}>{children}</WorkerShell>; }
