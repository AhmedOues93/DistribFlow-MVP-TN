import { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { revokeInvitation } from "@/lib/services/team";
import { jsonError, jsonOk } from "@/lib/api-response";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) { try { return jsonOk(await revokeInvitation((await params).invitationId, await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
