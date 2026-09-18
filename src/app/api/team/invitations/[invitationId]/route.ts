import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { revokeInvitation } from "@/lib/services/team";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) { try { return NextResponse.json(await revokeInvitation((await params).invitationId, await requireRequestContext(request))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
