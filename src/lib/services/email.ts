type InvitationEmail = { recipientName: string; recipientEmail: string; companyName: string; roleLabel: string; invitationUrl: string; expiresAt: Date };

export function invitationUrl(token: string) { return `${process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invitation/${token}`; }

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
