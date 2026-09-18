import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { resendInvitation } from "@/lib/services/team";

export async function POST(request: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) { try { return NextResponse.json(await resendInvitation((await params).invitationId, { ...(await requireRequestContext(request)), requestOrigin: request.nextUrl.origin })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
