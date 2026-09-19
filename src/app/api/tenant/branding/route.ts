import { NextRequest } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { getBranding, removeLogo, saveLogo, updateCompanyProfile } from "@/lib/services/branding";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";

function response(error: unknown) { const message = error instanceof Error ? error.message : "Erreur serveur"; return jsonError(error, message.includes("Authentification") ? 401 : message.includes("réservée") ? 403 : 400); }
function assertSameOrigin(request: NextRequest) { const origin = request.headers.get("origin"); if (origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée"); }
export async function GET(request: NextRequest) { try { return jsonOk(await getBranding(await requireRequestContext(request))); } catch (error) { return response(error); } }
export async function PATCH(request: NextRequest) { try { assertSameOrigin(request); const context = await requireRequestContext(request); return jsonOk(await updateCompanyProfile(await parseJson(request), context)); } catch (error) { return response(error); } }
export async function POST(request: NextRequest) { try { assertSameOrigin(request); const context = await requireRequestContext(request); const data = await request.formData(); const file = data.get("logo"); if (!(file instanceof File)) throw new Error("Sélectionnez une image"); return jsonOk(await saveLogo(Buffer.from(await file.arrayBuffer()), context)); } catch (error) { return response(error); } }
export async function DELETE(request: NextRequest) { try { assertSameOrigin(request); return jsonOk(await removeLogo(await requireRequestContext(request))); } catch (error) { return response(error); } }
