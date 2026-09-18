import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { changeMemberRole, getMember } from "@/lib/services/team";

export async function GET(request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) { try { const member = await getMember((await params).membershipId, await requireRequestContext(request)); if (!member) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 }); return NextResponse.json(member); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) { try { return NextResponse.json(await changeMemberRole((await params).membershipId, await request.json(), await requireRequestContext(request))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
