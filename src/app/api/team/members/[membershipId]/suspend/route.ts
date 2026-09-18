import { MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { changeMemberStatus } from "@/lib/services/team";

export async function POST(request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) { try { return NextResponse.json(await changeMemberStatus((await params).membershipId, MembershipStatus.SUSPENDED, await requireRequestContext(request))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
