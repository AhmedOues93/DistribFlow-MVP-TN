import { MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { listMembers } from "@/lib/services/team";
import { jsonError, jsonOk } from "@/lib/api-response";

export async function GET(request: NextRequest) { try { const search = request.nextUrl.searchParams; return jsonOk(await listMembers(await requireRequestContext(request), { query: search.get("q") ?? undefined, status: (search.get("status") as MembershipStatus) || undefined, role: (search.get("role") as MembershipRole) || undefined })); } catch (error) { return jsonError(error); } }
