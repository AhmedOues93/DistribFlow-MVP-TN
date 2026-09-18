import { NextRequest, NextResponse } from "next/server";
import { acceptInvitation, getInvitation } from "@/lib/services/team";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { try { return NextResponse.json(await getInvitation((await params).token)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation invalide" }, { status: 400 }); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { try { const body = await request.json(); return NextResponse.json(await acceptInvitation((await params).token, body.password)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation invalide" }, { status: 400 }); } }
