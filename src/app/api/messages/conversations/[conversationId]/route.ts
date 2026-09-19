import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { getConversation } from "@/lib/services/messaging";
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) { try { return jsonOk(await getConversation((await params).conversationId, await requireRequestContext(request))); } catch (error) { return jsonError(error, 404, "Conversation introuvable"); } }
