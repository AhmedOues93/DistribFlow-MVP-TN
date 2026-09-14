import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/services/auth";

export default async function Home() {
  const session = await getSessionContext((await cookies()).get("distribflow_session")?.value);
  redirect(session ? "/dashboard" : "/connexion");
}
