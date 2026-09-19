import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
import { startEmployeeSession } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await startEmployeeSession(await parseJson(request));
    (await cookies()).set("distribflow_session", session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1209600 });
    return jsonOk({ tenantId: session.tenantId, role: session.role, redirectTo: session.redirectTo });
  } catch (error) {
    return jsonError(error, 401, "Identifiants invalides");
  }
}
