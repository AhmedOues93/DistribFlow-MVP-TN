import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionDetails } from "@/lib/services/auth";

export default async function EmployeeWorkspacePage() { const session = await getSessionDetails((await cookies()).get("distribflow_session")?.value); if (!session) redirect("/connexion"); redirect("/travailleur"); }
