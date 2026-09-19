import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { markConversationRead } from "@/lib/services/messaging";
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) { try { return jsonOk(await markConversationRead((await params).conversationId, await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
