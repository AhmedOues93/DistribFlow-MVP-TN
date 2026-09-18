import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { inviteMember, listInvitations } from "@/lib/services/team";

export async function GET(request: NextRequest) { try { return NextResponse.json(await listInvitations(await requireRequestContext(request))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
export async function POST(request: NextRequest) { try { return NextResponse.json(await inviteMember(await request.json(), await requireRequestContext(request)), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
