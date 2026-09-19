import { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { inviteMember, listInvitations } from "@/lib/services/team";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";

export async function GET(request: NextRequest) { try { return jsonOk(await listInvitations(await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
export async function POST(request: NextRequest) { try { return jsonOk(await inviteMember(await parseJson(request), { ...(await requireRequestContext(request)), requestOrigin: request.nextUrl.origin }), 201); } catch (error) { return jsonError(error); } }
