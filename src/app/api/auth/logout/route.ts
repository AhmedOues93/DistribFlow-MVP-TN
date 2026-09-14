import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
  await endSession(request.cookies.get("distribflow_session")?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("distribflow_session", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
