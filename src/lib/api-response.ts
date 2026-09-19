import { NextResponse } from "next/server";

export function jsonOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function safeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message;
  if (!message || /prisma|unique constraint|invalid `|stack| at /i.test(message)) return fallback;
  return message;
}

export function jsonError(error: unknown, status = 400, fallback = "La demande n’a pas pu être traitée.") {
  return NextResponse.json({ error: safeMessage(error, fallback) }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function parseJson<T>(request: Request) {
  try {
    return await request.json() as T;
  } catch {
    throw new Error("Requête JSON invalide");
  }
}
