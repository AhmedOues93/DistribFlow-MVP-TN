import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function orderErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur serveur";
  let status = 500;
  if (message === "Authentification requise") status = 401;
  else if (message.includes("autorisé") || message.includes("autorisée")) status = 403;
  else if (message.includes("introuvable")) status = 404;
  else if (error instanceof ZodError || ["Statut invalide", "Page invalide", "Date invalide", "Entrepôt requis"].includes(message) || message.includes("obligatoire") || message.includes("numéro WhatsApp valide")) status = 400;
  else if (message.includes("modifiée") || message.includes("insuffisant") || message.includes("invalide") || message.includes("Transition") || message.includes("doit être confirmée") || message.includes("n’est pas") || message.includes("doivent être")) status = 409;
  else if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) status = 409;
  else if (error instanceof Error && error.name === "ZodError") status = 400;
  return NextResponse.json({ error: message }, { status });
}
