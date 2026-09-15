import { NextRequest, NextResponse } from "next/server";
import { assertImportPermission, confirmImport, csvTemplate, previewImport, type ImportKind } from "@/lib/services/imports";
import { requireRequestContext } from "@/lib/services/auth";

function kindFrom(params: { kind: string }): ImportKind {
  if (params.kind === "customers" || params.kind === "products") return params.kind;
  throw new Error("Type d’import invalide");
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur d’import";
  const status = message === "Authentification requise" ? 401 : message === "Action non autorisée" ? 403 : message.includes("limite") ? 413 : 400;
  return NextResponse.json({ error: message }, { status });
}

function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const kind = kindFrom(await params);
    assertImportPermission(kind, await requireRequestContext(request));
    return new NextResponse(csvTemplate(kind), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="modele-${kind}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  try {
    assertSameOrigin(request);
    const kind = kindFrom(await params);
    const body = await request.json();
    if (typeof body.csv !== "string") throw new Error("Le contenu CSV est invalide");
    const context = await requireRequestContext(request);
    return NextResponse.json(body.confirm ? await confirmImport(kind, body.csv, context) : await previewImport(kind, body.csv, context));
  } catch (error) {
    return errorResponse(error);
  }
}
