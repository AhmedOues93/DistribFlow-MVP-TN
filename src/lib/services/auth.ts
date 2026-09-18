import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { installStarterData } from "@/lib/services/bootstrap";
import { canonicalRole, roleRedirect, type Role } from "@/lib/tenant";

const scrypt = promisify(scryptCallback);
const registration = z.object({ companyName: z.string().trim().min(2).max(100), name: z.string().trim().min(2).max(100), email: z.string().email(), password: z.string().min(12).max(128) });
const login = z.object({ email: z.string().email(), password: z.string().min(1), tenantId: z.string().optional() });

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${(await scrypt(password, salt, 64) as Buffer).toString("hex")}`; }
async function verifyPassword(password: string, stored: string) { const [salt, expected] = stored.split(":"); if (!salt || !expected) return false; const actual = await scrypt(password, salt, 64) as Buffer; const expectedBuffer = Buffer.from(expected, "hex"); return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer); }

export type CompanyMembership = { tenantId: string; tenantName: string; role: Role; status: MembershipStatus };
export type SessionContext = { sessionId: string; tenantId: string; role: Role; userId: string };
export type SessionDetails = SessionContext & { userName: string; tenantName: string; tenantLogoUrl?: string; companies: CompanyMembership[] };

function activeCompanies(user: { memberships: Array<{ tenantId: string; role: MembershipRole; status: MembershipStatus; tenant: { id: string; name: string; suspendedAt: Date | null; logoObjectKey: string | null } }> }) {
  return user.memberships.filter((membership) => membership.status === MembershipStatus.ACTIVE && !membership.tenant.suspendedAt).map((membership) => ({ tenantId: membership.tenantId, tenantName: membership.tenant.name, role: membership.role as Role, status: membership.status }));
}

function selectedCompany(user: { memberships: Array<{ tenantId: string; role: MembershipRole; status: MembershipStatus; tenant: { id: string; name: string; suspendedAt: Date | null; logoObjectKey: string | null } }> }, tenantId?: string) {
  const memberships = user.memberships.filter((membership) => membership.status === MembershipStatus.ACTIVE && !membership.tenant.suspendedAt);
  return tenantId ? memberships.find((membership) => membership.tenantId === tenantId) : memberships[0];
}

export async function getSessionContext(token: string | undefined): Promise<SessionContext | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { memberships: { include: { tenant: true } } } } } });
  if (!session || session.expiresAt <= new Date()) return null;
  const membership = selectedCompany(session.user, session.activeTenantId ?? undefined);
  return membership ? { sessionId: session.id, tenantId: membership.tenantId, role: membership.role as Role, userId: session.userId } : null;
}

export async function requireRequestContext(request: NextRequest): Promise<SessionContext> { const context = await getSessionContext(request.cookies.get("distribflow_session")?.value); if (!context) throw new Error("Authentification requise"); return context; }

export async function getSessionDetails(token: string | undefined): Promise<SessionDetails | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { memberships: { include: { tenant: true } } } } } });
  if (!session || session.expiresAt <= new Date()) return null;
  const membership = selectedCompany(session.user, session.activeTenantId ?? undefined);
  if (!membership) return null;
  return { sessionId: session.id, userId: session.userId, userName: session.user.name, tenantId: membership.tenantId, tenantName: membership.tenant.name, tenantLogoUrl: membership.tenant.logoObjectKey ? "/api/tenant/branding/logo" : undefined, role: membership.role as Role, companies: activeCompanies(session.user) };
}

export async function endSession(token: string | undefined) { if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }); }

export async function onboard(input: unknown) {
  const data = registration.parse(input);
  const email = data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("Cette adresse email est déjà utilisée");
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: data.companyName } });
    const user = await tx.user.create({ data: { name: data.name, email, passwordHash: await hashPassword(data.password), passwordSet: true } });
    await tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE, activatedAt: new Date() } });
    await installStarterData(tx, tenant.id);
    return { tenantId: tenant.id, userId: user.id };
  });
}

export async function startSession(input: unknown) {
  const data = login.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() }, include: { memberships: { include: { tenant: true } } } });
  if (!user || !user.passwordSet || !(await verifyPassword(data.password, user.passwordHash))) throw new Error("Identifiants invalides");
  const membership = selectedCompany(user, data.tenantId);
  if (!membership) throw new Error(data.tenantId ? "Entreprise inaccessible" : "Aucune entreprise active");
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { userId: user.id, activeTenantId: membership.tenantId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) } });
  const companies = activeCompanies(user);
  return { token: rawToken, tenantId: membership.tenantId, role: membership.role as Role, redirectTo: roleRedirect(membership.role as Role), companies };
}

export async function switchCompany(token: string | undefined, tenantId: string) {
  if (!token) throw new Error("Authentification requise");
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { memberships: { include: { tenant: true } } } } } });
  if (!session || session.expiresAt <= new Date()) throw new Error("Session expirée");
  const membership = selectedCompany(session.user, tenantId);
  if (!membership) throw new Error("Entreprise inaccessible");
  await prisma.session.update({ where: { id: session.id }, data: { activeTenantId: tenantId } });
  return { tenantId, role: membership.role as Role, redirectTo: roleRedirect(membership.role as Role) };
}

export function normalizeRole(role: Role) { return canonicalRole(role); }
