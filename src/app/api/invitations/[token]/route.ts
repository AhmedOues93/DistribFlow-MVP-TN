import { NextRequest } from "next/server";
import { acceptInvitation, getInvitation } from "@/lib/services/team";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { try { return jsonOk(await getInvitation((await params).token)); } catch (error) { return jsonError(error, 400, "Invitation invalide"); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { try { const body = await parseJson<{ password?: string }>(request); return jsonOk(await acceptInvitation((await params).token, body.password)); } catch (error) { return jsonError(error, 400, "Invitation invalide"); } }
