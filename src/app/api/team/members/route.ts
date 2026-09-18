import { MembershipRole, MembershipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { listMembers } from "@/lib/services/team";

export async function GET(request: NextRequest) { try { const search = request.nextUrl.searchParams; return NextResponse.json(await listMembers(await requireRequestContext(request), { query: search.get("q") ?? undefined, status: (search.get("status") as MembershipStatus) || undefined, role: (search.get("role") as MembershipRole) || undefined })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
