type InvitationEmail = { recipientName: string; recipientEmail: string; companyName: string; roleLabel: string; invitationUrl: string; expiresAt: Date };

function validatedOrigin(value: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("URL publique de l’application invalide"); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("URL publique de l’application invalide");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("L’URL publique doit utiliser HTTPS en production");
  return parsed.toString().replace(/\/$/, "");
}

export function applicationUrl(requestOrigin?: string) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return validatedOrigin(configured);
  if (requestOrigin) return validatedOrigin(requestOrigin);
  throw new Error("APP_URL ou l’origine de la requête est requis");
}

export function invitationUrl(token: string, requestOrigin?: string) { return `${applicationUrl(requestOrigin)}/invitation/${encodeURIComponent(token)}`; }

export function invitationEmailTemplate(input: InvitationEmail) {
  return { subject: `Invitation à rejoindre ${input.companyName} sur DistribFlow`, text: `Bonjour ${input.recipientName},\n\nVous êtes invité(e) à rejoindre ${input.companyName} sur DistribFlow comme ${input.roleLabel}. Cette invitation expire le ${input.expiresAt.toLocaleDateString("fr-TN")} .\n\nOuvrir l’invitation : ${input.invitationUrl}\n\nSi vous n’attendiez pas ce message, ignorez-le.`, html: `<p>Bonjour ${input.recipientName},</p><p>Vous êtes invité(e) à rejoindre <strong>${input.companyName}</strong> sur DistribFlow comme <strong>${input.roleLabel}</strong>.</p><p>Cette invitation expire le ${input.expiresAt.toLocaleDateString("fr-TN")}.</p><p><a href="${input.invitationUrl}">Ouvrir l’invitation</a></p><p>Si vous n’attendiez pas ce message, ignorez-le.</p>` };
}

export async function sendInvitationEmail(input: InvitationEmail) {
  const endpoint = process.env.EMAIL_WEBHOOK_URL;
  if (!endpoint) return false;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "DistribFlow <noreply@distribflow.tn>", to: input.recipientEmail, ...invitationEmailTemplate(input) }) });
  if (!response.ok) throw new Error("Le service email est indisponible");
  return true;
}
