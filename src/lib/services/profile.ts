import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTenant, type Role } from "@/lib/tenant";
import { hashPassword, verifyPassword } from "@/lib/services/auth";
import { objectStorage } from "@/lib/storage";

type Context = { tenantId?: string; userId: string; role: Role; sessionId?: string };
const profileSchema = z.object({ firstName: z.string().trim().max(80), lastName: z.string().trim().max(80), displayName: z.string().trim().max(120), phone: z.string().trim().max(30), preferredLanguage: z.enum(["fr", "ar"]).default("fr") });
const passwordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128) });

export async function getProfile(context: Context) {
  const tenantId = assertTenant(context.tenantId);
  const [user, membership, tenant] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { id: true, email: true, name: true, firstName: true, lastName: true, displayName: true, phone: true, preferredLanguage: true, avatarObjectKey: true, avatarMimeType: true, avatarSize: true } }),
    prisma.membership.findUniqueOrThrow({ where: { tenantId_userId: { tenantId, userId: context.userId } }, select: { role: true, status: true } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { id: true, name: true, displayName: true } }),
  ]);
  return { user, membership, tenant, avatarUrl: user.avatarObjectKey ? "/api/profile/avatar" : null };
}

export async function updateProfile(input: unknown, context: Context) {
  const data = profileSchema.parse(input); const name = data.displayName || [data.firstName, data.lastName].filter(Boolean).join(" ") || "Utilisateur";
  return prisma.user.update({ where: { id: context.userId }, data: { ...data, name }, select: { id: true, email: true, name: true, firstName: true, lastName: true, displayName: true, phone: true, preferredLanguage: true, avatarObjectKey: true, avatarMimeType: true, avatarSize: true } });
}

export async function changePassword(input: unknown, context: Context) {
  const data = passwordSchema.parse(input); const user = await prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) throw new Error("Le mot de passe actuel est incorrect");
  await prisma.user.update({ where: { id: context.userId }, data: { passwordHash: await hashPassword(data.newPassword), passwordSet: true } });
  return { changed: true };
}

export async function endOtherSessions(context: Context) { await prisma.session.deleteMany({ where: { userId: context.userId, ...(context.sessionId ? { id: { not: context.sessionId } } : {}) } }); return { ended: true }; }

function detectAvatar(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", mimeType: "image/png" };
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { extension: "jpg", mimeType: "image/jpeg" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { extension: "webp", mimeType: "image/webp" };
  return null;
}
export async function saveAvatar(buffer: Buffer, context: Context) {
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new Error("L’avatar doit peser au maximum 2 Mo");
  const image = detectAvatar(buffer); if (!image) throw new Error("Format refusé : utilisez PNG, JPEG ou WebP");
  const key = `avatars/${context.tenantId}/${context.userId}/${randomUUID()}.${image.extension}`; const storage = objectStorage(); await storage.put(key, buffer, image.mimeType);
  const current = await prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { avatarObjectKey: true } });
  try { const user = await prisma.user.update({ where: { id: context.userId }, data: { avatarObjectKey: key, avatarMimeType: image.mimeType, avatarSize: buffer.length, avatarUpdatedAt: new Date() }, select: { avatarObjectKey: true, avatarMimeType: true, avatarSize: true } }); if (current.avatarObjectKey) await storage.delete(current.avatarObjectKey); return { ...user, avatarUrl: "/api/profile/avatar" }; } catch (error) { await storage.delete(key).catch(() => undefined); throw error; }
}
export async function removeAvatar(context: Context) { const user = await prisma.user.findUniqueOrThrow({ where: { id: context.userId }, select: { avatarObjectKey: true } }); await prisma.user.update({ where: { id: context.userId }, data: { avatarObjectKey: null, avatarMimeType: null, avatarSize: null, avatarUpdatedAt: null } }); if (user.avatarObjectKey) await objectStorage().delete(user.avatarObjectKey); return { avatarUrl: null }; }
export async function readAvatar(context: Context) { const user = await prisma.user.findUnique({ where: { id: context.userId }, select: { avatarObjectKey: true, avatarMimeType: true } }); if (!user?.avatarObjectKey) return null; const object = await objectStorage().get(user.avatarObjectKey); return object ? { ...object, contentType: user.avatarMimeType ?? object.contentType } : null; }
