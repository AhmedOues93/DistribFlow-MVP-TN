import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/services/auth";
import CustomersClient from "./customers-client";

export default async function CustomersPage() {
  const session = await getSessionContext((await cookies()).get("distribflow_session")?.value);
  if (!session) redirect("/connexion");
  return <CustomersClient role={session.role} />;
}
