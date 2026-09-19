import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { readAvatar, removeAvatar, saveAvatar } from "@/lib/services/profile";
export async function GET(request: NextRequest) { try { const avatar = await readAvatar(await requireRequestContext(request)); if (!avatar) return new NextResponse(null, { status: 404 }); return new NextResponse(avatar.body as BodyInit, { headers: { "Content-Type": avatar.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } }); } catch (error) { return jsonError(error, 404, "Avatar indisponible"); } }
export async function POST(request: NextRequest) { try { const file = (await request.formData()).get("avatar"); if (!(file instanceof File)) throw new Error("Sélectionnez une image"); return jsonOk(await saveAvatar(Buffer.from(await file.arrayBuffer()), await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
export async function DELETE(request: NextRequest) { try { return jsonOk(await removeAvatar(await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
