import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { listMessages, sendMessage } from "@/lib/services/messaging";
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) { try { return jsonOk(await listMessages((await params).conversationId, await requireRequestContext(request))); } catch (error) { return jsonError(error, 404, "Conversation introuvable"); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) { try { const form = await request.formData(); const file = form.get("file"); return jsonOk(await sendMessage((await params).conversationId, { body: String(form.get("body") ?? ""), clientId: String(form.get("clientId") ?? ""), file: file instanceof File ? { buffer: Buffer.from(await file.arrayBuffer()), fileName: file.name, mimeType: file.type } : undefined }, await requireRequestContext(request)), 201); } catch (error) { return jsonError(error); } }
