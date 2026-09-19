type InvitationEmail = { recipientName: string; recipientEmail: string; companyName: string; roleLabel: string; invitationUrl: string; expiresAt: Date; inviterName?: string; companyLogoUrl?: string };
type DeliveryResult = { sent: boolean; providerMessageId?: string; error?: string };

function validatedOrigin(value: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("URL publique de l’application invalide"); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("URL publique de l’application invalide");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("L’URL publique doit utiliser HTTPS en production");
  return parsed.toString().replace(/\/$/, "");
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character); }
export function applicationUrl(requestOrigin?: string) { const configured = process.env.APP_URL?.trim(); if (configured) return validatedOrigin(configured); if (requestOrigin) return validatedOrigin(requestOrigin); throw new Error("APP_URL ou l’origine de la requête est requis"); }
export function invitationUrl(token: string, requestOrigin?: string) { return `${applicationUrl(requestOrigin)}/invitation/${encodeURIComponent(token)}`; }

export function invitationEmailTemplate(input: InvitationEmail) {
  const name = escapeHtml(input.recipientName); const company = escapeHtml(input.companyName); const role = escapeHtml(input.roleLabel); const url = escapeHtml(input.invitationUrl); const inviter = input.inviterName ? `<p>Invitation envoyée par ${escapeHtml(input.inviterName)}.</p>` : ""; const logo = input.companyLogoUrl ? `<img src="${escapeHtml(input.companyLogoUrl)}" alt="" style="max-height:48px;max-width:180px" />` : "";
  return { subject: `Invitation à rejoindre ${input.companyName} sur DistribFlow`, text: `Bonjour ${input.recipientName},\n\nVous êtes invité(e) à rejoindre ${input.companyName} sur DistribFlow comme ${input.roleLabel}.${input.inviterName ? ` Invitation envoyée par ${input.inviterName}.` : ""} Cette invitation expire le ${input.expiresAt.toLocaleDateString("fr-TN")}.\n\nOuvrir l’invitation : ${input.invitationUrl}\n\nSi vous n’attendiez pas ce message, ignorez-le.`, html: `<div style="font-family:Arial,sans-serif;color:#12213f;max-width:620px;margin:auto;padding:32px">${logo}<p>Bonjour ${name},</p><p>Vous êtes invité(e) à rejoindre <strong>${company}</strong> sur DistribFlow comme <strong>${role}</strong>.</p>${inviter}<p>Cette invitation expire le ${input.expiresAt.toLocaleDateString("fr-TN")}.</p><p><a href="${url}" style="display:inline-block;background:#155eef;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Activer mon accès</a></p><p>Vous pourrez ensuite vous connecter à l’espace employé avec cette adresse email.</p><p style="font-size:12px;color:#667085">Si vous n’attendiez pas ce message, ignorez-le.</p></div>` };
}

async function sendWithResend(input: InvitationEmail): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY non configurée" };
  const template = invitationEmailTemplate(input);
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "DistribFlow <noreply@distribflow.tn>", to: [input.recipientEmail], ...template }) });
  if (!response.ok) return { sent: false, error: "Le service email est indisponible" };
  const payload = await response.json().catch(() => ({})) as { id?: string };
  return { sent: true, providerMessageId: payload.id };
}

async function sendWithWebhook(input: InvitationEmail): Promise<DeliveryResult> {
  const endpoint = process.env.EMAIL_WEBHOOK_URL;
  if (!endpoint) return { sent: false, error: "Aucun fournisseur email configuré" };
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "DistribFlow <noreply@distribflow.tn>", to: input.recipientEmail, ...invitationEmailTemplate(input) }) });
  return response.ok ? { sent: true } : { sent: false, error: "Le service email est indisponible" };
}

export async function sendInvitationEmail(input: InvitationEmail): Promise<DeliveryResult> {
  const result = process.env.RESEND_API_KEY ? await sendWithResend(input) : await sendWithWebhook(input);
  if (!result.sent && process.env.NODE_ENV === "production") throw new Error(result.error ?? "Le service email est indisponible");
  return result;
}
