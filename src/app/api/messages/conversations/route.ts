import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { createConversation, listConversations } from "@/lib/services/messaging";
export async function GET(request: NextRequest) { try { return jsonOk(await listConversations(await requireRequestContext(request))); } catch (error) { return jsonError(error, 401); } }
export async function POST(request: NextRequest) { try { return jsonOk(await createConversation(await parseJson(request), await requireRequestContext(request)), 201); } catch (error) { return jsonError(error); } }
