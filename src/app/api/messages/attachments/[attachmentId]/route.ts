import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { readAttachment } from "@/lib/services/messaging";
export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) { try { const attachment = await readAttachment((await params).attachmentId, await requireRequestContext(request)); return new NextResponse(attachment.body as BodyInit, { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `attachment; filename="${attachment.fileName.replace(/[\"\\\r\n]/g, "_")}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300" } }); } catch (error) { return jsonError(error, 404, "Pièce jointe introuvable"); } }
