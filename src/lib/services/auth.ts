import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { can, type Role } from "@/lib/tenant";

const scrypt = promisify(scryptCallback);
const registration = z.object({ companyName: z.string().min(2).max(100), name: z.string().min(2), email: z.string().email(), password: z.string().min(12).max(128) });
const login = z.object({ email: z.string().email(), password: z.string().min(1) });
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
async function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${(await scrypt(password, salt, 64) as Buffer).toString("hex")}`; }
async function verifyPassword(password: string, stored: string) { const [salt, expected] = stored.split(":"); const actual = (await scrypt(password, salt, 64) as Buffer); return timingSafeEqual(actual, Buffer.from(expected, "hex")); }

export async function onboard(input: unknown) { const data = registration.parse(input); const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }); if (existing) throw new Error("Cette adresse email est déjà utilisée"); return prisma.$transaction(async (tx) => { const tenant = await tx.tenant.create({ data: { name: data.companyName } }); const user = await tx.user.create({ data: { name: data.name, email: data.email.toLowerCase(), passwordHash: await hashPassword(data.password) } }); await tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: MembershipRole.OWNER } }); return { tenantId: tenant.id, userId: user.id }; }); }
export async function startSession(input: unknown) { const data = login.parse(input); const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() }, include: { memberships: { include: { tenant: true } } } }); if (!user || !(await verifyPassword(data.password, user.passwordHash))) throw new Error("Identifiants invalides"); const tenant = user.memberships.find((membership) => !membership.tenant.suspendedAt); if (!tenant) throw new Error("Aucune entreprise active"); const rawToken = randomBytes(32).toString("base64url"); await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) } }); return { token: rawToken, tenantId: tenant.tenantId, role: tenant.role }; }
export async function invite(input: { email: string; role: Role }, context: { tenantId: string; role: Role }) { if (!can(context.role, "members:write")) throw new Error("Action non autorisée"); const token = randomBytes(24).toString("base64url"); const record = await prisma.invitation.upsert({ where: { tenantId_email: { tenantId: context.tenantId, email: input.email.toLowerCase() } }, update: { role: input.role as MembershipRole, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), acceptedAt: null }, create: { tenantId: context.tenantId, email: input.email.toLowerCase(), role: input.role as MembershipRole, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } }); return { invitationId: record.id, token }; }
