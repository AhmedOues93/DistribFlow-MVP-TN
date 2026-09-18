import { randomBytes } from "node:crypto";
import { MembershipRole, MembershipStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/services/auth";
import { invitationUrl, sendInvitationEmail } from "@/lib/services/email";
import { assertTenant, can, employeeRoles, isTeamManager, type Role } from "@/lib/tenant";

type Context = { tenantId?: string; role: Role; userId: string; requestOrigin?: string };
type MemberStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
const inviteSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email(), role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "DRIVER", "READ_ONLY"]) });
const roleSchema = z.object({ role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "DRIVER", "READ_ONLY"]) });
const roleLabels: Record<string, string> = { ADMIN: "Administrateur", SALES: "Commercial", WAREHOUSE: "Responsable entrepôt", DRIVER: "Livreur", READ_ONLY: "Lecture seule", OWNER: "Propriétaire" };

function tenant(context: Context) { if (!can(context.role, "members:write") || !isTeamManager(context.role)) throw new Error("Action non autorisée"); return assertTenant(context.tenantId); }
function employeeRole(role: string): MembershipRole { if (!employeeRoles.includes(role as Role)) throw new Error("Rôle employé invalide"); return role as MembershipRole; }
function assertTarget(actor: Role, targetRole: MembershipRole) { if (actor === "ADMIN" && (targetRole === MembershipRole.OWNER || targetRole === MembershipRole.PLATFORM_ADMIN)) throw new Error("Un administrateur ne peut pas modifier un propriétaire"); }

async function assertOwnerInvariant(tx: Prisma.TransactionClient, tenantId: string, membership: { role: MembershipRole; status: MembershipStatus }, nextRole?: MembershipRole, nextStatus?: MembershipStatus) {
  const willStopBeingOwner = membership.role === MembershipRole.OWNER && (nextRole !== undefined && nextRole !== MembershipRole.OWNER || nextStatus !== undefined && nextStatus !== MembershipStatus.ACTIVE);
  if (!willStopBeingOwner) return;
  const owners = await tx.membership.count({ where: { tenantId, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE } });
  if (owners <= 1) throw new Error("Le dernier propriétaire actif doit être conservé");
}

export async function listMembers(context: Context, input: { query?: string; status?: MembershipStatus; role?: MembershipRole } = {}) {
  const tenantId = tenant(context);
  return prisma.membership.findMany({ where: { tenantId, ...(input.status ? { status: input.status } : {}), ...(input.role ? { role: input.role } : {}), ...(input.query ? { user: { OR: [{ name: { contains: input.query, mode: "insensitive" } }, { email: { contains: input.query, mode: "insensitive" } }] } } : {}) }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: [{ status: "asc" }, { user: { name: "asc" } }] });
}

export async function listInvitations(context: Context) {
  const tenantId = tenant(context);
  return prisma.invitation.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true }, orderBy: { expiresAt: "desc" } });
}

async function deliverInvitation(invitation: { id: string; name: string; email: string; role: MembershipRole; expiresAt: Date }, companyName: string, token: string, requestOrigin?: string) {
  const url = invitationUrl(token, requestOrigin);
  const emailSent = await sendInvitationEmail({ recipientName: invitation.name, recipientEmail: invitation.email, companyName, roleLabel: roleLabels[invitation.role] ?? invitation.role, invitationUrl: url, expiresAt: invitation.expiresAt });
  return { emailSent, invitationUrl: !emailSent && process.env.NODE_ENV !== "production" ? url : undefined };
}

export async function inviteMember(input: unknown, context: Context) {
  const tenantId = tenant(context);
  const data = inviteSchema.parse(input);
  const email = data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { where: { tenantId } } } });
  if (user?.memberships.some((membership) => membership.status === MembershipStatus.ACTIVE)) throw new Error("Cet employé appartient déjà à l’entreprise");
  const existing = await prisma.invitation.findUnique({ where: { tenantId_email: { tenantId, email } } });
  const now = new Date();
  if (existing && !existing.acceptedAt && !existing.revokedAt && existing.expiresAt > now) throw new Error("Une invitation active existe déjà");
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const record = await prisma.$transaction(async (tx) => {
    const targetUserId = user?.id ?? (await tx.user.create({ data: { name: data.name, email, passwordHash: await hashPassword(randomToken()), passwordSet: false } })).id;
    if (user) await tx.user.update({ where: { id: targetUserId }, data: { name: data.name } });
    const membership = user?.memberships[0];
    if (membership) await tx.membership.update({ where: { id: membership.id }, data: { role: employeeRole(data.role), status: MembershipStatus.INVITED, invitedAt: now, suspendedAt: null, archivedAt: null } });
    else await tx.membership.create({ data: { tenantId, userId: targetUserId, role: employeeRole(data.role), status: MembershipStatus.INVITED, invitedAt: now } });
    const invitation = existing ? await tx.invitation.update({ where: { id: existing.id }, data: { name: data.name, role: employeeRole(data.role), tokenHash: hashToken(token), expiresAt, acceptedAt: null, revokedAt: null, createdById: context.userId } }) : await tx.invitation.create({ data: { tenantId, name: data.name, email, role: employeeRole(data.role), tokenHash: hashToken(token), expiresAt, createdById: context.userId } });
    await tx.auditEvent.create({ data: { tenantId, actorId: context.userId, action: existing ? "INVITATION_RESENT" : "INVITATION_CREATED", entity: "Invitation", entityId: invitation.id, metadata: { role: invitation.role, email: invitation.email } } });
    return invitation;
  });
  const company = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } });
  return { ...(await deliverInvitation(record, company.name, token, context.requestOrigin)), invitationId: record.id };
}

export async function resendInvitation(invitationId: string, context: Context) {
  const tenantId = tenant(context);
  const current = await prisma.invitation.findFirst({ where: { id: invitationId, tenantId, acceptedAt: null, revokedAt: null } });
  if (!current) throw new Error("Invitation introuvable ou déjà traitée");
  const token = randomToken(); const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const record = await prisma.$transaction(async (tx) => { const updated = await tx.invitation.update({ where: { id: current.id }, data: { tokenHash: hashToken(token), expiresAt } }); await tx.auditEvent.create({ data: { tenantId, actorId: context.userId, action: "INVITATION_RESENT", entity: "Invitation", entityId: updated.id } }); return updated; });
  const company = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } });
  return { ...(await deliverInvitation(record, company.name, token, context.requestOrigin)), invitationId: record.id };
}

export async function revokeInvitation(invitationId: string, context: Context) {
  const tenantId = tenant(context);
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({ where: { id: invitationId, tenantId, acceptedAt: null, revokedAt: null } });
    if (!invitation) throw new Error("Invitation introuvable ou déjà traitée");
    await tx.invitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } });
    const user = await tx.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    if (user) await tx.membership.updateMany({ where: { tenantId, userId: user.id, status: MembershipStatus.INVITED }, data: { status: MembershipStatus.ARCHIVED, archivedAt: new Date() } });
    await tx.auditEvent.create({ data: { tenantId, actorId: context.userId, action: "INVITATION_REVOKED", entity: "Invitation", entityId: invitation.id } });
    return { invitationId: invitation.id };
  });
}

export async function acceptInvitation(token: string, password: string | undefined) {
  if (!token || token.length < 20) throw new Error("Invitation invalide");
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { tenant: true } });
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new Error("Invitation expirée ou invalide");
    const user = await tx.user.findUnique({ where: { email: invitation.email } });
    if (!user) throw new Error("Invitation invalide");
    if (!user.passwordSet) { if (!password || password.length < 12) throw new Error("Un mot de passe de 12 caractères est requis"); await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), passwordSet: true, name: invitation.name } }); }
    const membership = await tx.membership.update({ where: { tenantId_userId: { tenantId: invitation.tenantId, userId: user.id } }, data: { role: invitation.role, status: MembershipStatus.ACTIVE, activatedAt: new Date(), suspendedAt: null, archivedAt: null } });
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await tx.auditEvent.create({ data: { tenantId: invitation.tenantId, actorId: user.id, action: "INVITATION_ACCEPTED", entity: "Membership", entityId: membership.id, metadata: { invitationId: invitation.id } } });
    return { tenantId: invitation.tenantId, email: user.email, userId: user.id };
  });
}

export async function getInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { tenant: true } });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new Error("Invitation expirée ou invalide");
  const user = await prisma.user.findUnique({ where: { email: invitation.email }, select: { passwordSet: true } });
  return { name: invitation.name, email: invitation.email, role: roleLabels[invitation.role] ?? invitation.role, companyName: invitation.tenant.name, expiresAt: invitation.expiresAt, passwordRequired: !user?.passwordSet };
}

export async function getMember(membershipId: string, context: Context) {
  const tenantId = tenant(context);
  return prisma.membership.findFirst({ where: { id: membershipId, tenantId }, include: { user: { select: { id: true, name: true, email: true } }, tenant: { select: { name: true } } } });
}

export async function changeMemberRole(membershipId: string, input: unknown, context: Context) {
  const tenantId = tenant(context); const data = roleSchema.parse(input); const nextRole = employeeRole(data.role);
  return prisma.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({ where: { id: membershipId, tenantId } }); if (!member) throw new Error("Employé introuvable"); assertTarget(context.role, member.role); await assertOwnerInvariant(tx, tenantId, member, nextRole, undefined);
    const result = await tx.membership.update({ where: { id: member.id }, data: { role: nextRole } }); await tx.auditEvent.create({ data: { tenantId, actorId: context.userId, action: "MEMBERSHIP_ROLE_CHANGED", entity: "Membership", entityId: member.id, metadata: { role: nextRole } } }); return result;
  });
}

export async function changeMemberStatus(membershipId: string, status: MemberStatus, context: Context) {
  const tenantId = tenant(context); if (![MembershipStatus.SUSPENDED, MembershipStatus.ACTIVE, MembershipStatus.ARCHIVED].includes(status)) throw new Error("Statut invalide");
  return prisma.$transaction(async (tx) => {
    const member = await tx.membership.findFirst({ where: { id: membershipId, tenantId } }); if (!member) throw new Error("Employé introuvable"); assertTarget(context.role, member.role); await assertOwnerInvariant(tx, tenantId, member, undefined, status);
    const result = await tx.membership.update({ where: { id: member.id }, data: { status, suspendedAt: status === MembershipStatus.SUSPENDED ? new Date() : null, archivedAt: status === MembershipStatus.ARCHIVED ? new Date() : null, activatedAt: status === MembershipStatus.ACTIVE ? new Date() : member.activatedAt } }); await tx.auditEvent.create({ data: { tenantId, actorId: context.userId, action: `MEMBERSHIP_${status}`, entity: "Membership", entityId: member.id } }); return result;
  });
}

export function randomToken() { return randomBytes(24).toString("base64url"); }
