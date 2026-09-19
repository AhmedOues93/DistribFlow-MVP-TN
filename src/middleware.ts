import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) { if (request.nextUrl.pathname.startsWith("/travailleur") && request.nextUrl.pathname !== "/travailleur/connexion" && !request.cookies.has("distribflow_session")) return NextResponse.redirect(new URL("/travailleur/connexion", request.url)); return NextResponse.next(); }
export const config = { matcher: ["/travailleur/:path*"] };
