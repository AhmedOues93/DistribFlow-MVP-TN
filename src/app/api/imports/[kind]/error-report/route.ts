import { NextRequest, NextResponse } from "next/server";
import { assertImportPermission, errorReport, type CsvError, type ImportKind } from "@/lib/services/imports";
import { requireRequestContext } from "@/lib/services/auth";

function importKind(value: string): ImportKind {
  if (value === "customers" || value === "products") return value;
  throw new Error("Type d’import invalide");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée");
    const kind = importKind((await params).kind);
    assertImportPermission(kind, await requireRequestContext(request));
    const body = await request.json();
    const errors: CsvError[] = Array.isArray(body.errors) ? body.errors.slice(0, 2_000).filter((item: unknown): item is CsvError => typeof (item as CsvError | undefined)?.row === "number" && typeof (item as CsvError | undefined)?.field === "string" && typeof (item as CsvError | undefined)?.value === "string" && typeof (item as CsvError | undefined)?.message === "string") : [];
    return new NextResponse(errorReport(errors), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="erreurs-import-${kind}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur d’import";
    const status = message === "Authentification requise" ? 401 : message === "Action non autorisée" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
