import { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { resendInvitation } from "@/lib/services/team";
import { jsonError, jsonOk } from "@/lib/api-response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) { try { return jsonOk(await resendInvitation((await params).invitationId, { ...(await requireRequestContext(request)), requestOrigin: request.nextUrl.origin })); } catch (error) { return jsonError(error); } }
