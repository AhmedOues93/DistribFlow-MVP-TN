import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertTenant, type Role } from "@/lib/tenant";
import { objectStorage } from "@/lib/storage";

const maximumLogoSize = 2 * 1024 * 1024;
const brandingRoles: Role[] = ["PLATFORM_ADMIN", "OWNER", "ADMIN"];
type Context = { tenantId?: string; role: Role };

function tenant(context: Context) { const tenantId = assertTenant(context.tenantId); if (!brandingRoles.includes(context.role)) throw new Error("Action réservée aux responsables de l’entreprise"); return tenantId; }
function detectedImage(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", mimeType: "image/png" };
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { extension: "jpg", mimeType: "image/jpeg" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { extension: "webp", mimeType: "image/webp" };
  return null;
}
export function validateLogo(buffer: Buffer) { if (buffer.length === 0 || buffer.length > maximumLogoSize) throw new Error("Le logo doit peser au maximum 2 Mo"); const image = detectedImage(buffer); if (!image) throw new Error("Format refusé : utilisez PNG, JPEG ou WebP. SVG est désactivé pour la sécurité."); return image; }
export async function getBranding(context: { tenantId?: string }) { const tenantId = assertTenant(context.tenantId); const record = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true, logoObjectKey: true, logoMimeType: true, logoSize: true, logoUpdatedAt: true } }); return { ...record, logoUrl: record.logoObjectKey ? "/api/tenant/branding/logo" : null }; }
export async function updateCompanyName(input: unknown, context: Context) { const tenantId = tenant(context); const name = typeof input === "object" && input !== null && "name" in input ? String(input.name).trim() : ""; if (name.length < 2 || name.length > 120) throw new Error("Le nom de l’entreprise doit contenir entre 2 et 120 caractères"); return prisma.tenant.update({ where: { id: tenantId }, data: { name }, select: { name: true, logoObjectKey: true, logoMimeType: true, logoSize: true, logoUpdatedAt: true } }); }
export async function saveLogo(buffer: Buffer, context: Context) { const tenantId = tenant(context); const image = validateLogo(buffer); const key = `branding/${tenantId}/${randomUUID()}.${image.extension}`; const storage = objectStorage(); await storage.put(key, buffer, image.mimeType); const current = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { logoObjectKey: true } }); try { const result = await prisma.tenant.update({ where: { id: tenantId }, data: { logoObjectKey: key, logoMimeType: image.mimeType, logoSize: buffer.length, logoUpdatedAt: new Date() }, select: { name: true, logoObjectKey: true, logoMimeType: true, logoSize: true, logoUpdatedAt: true } }); if (current.logoObjectKey) await storage.delete(current.logoObjectKey); return result; } catch (error) { await storage.delete(key).catch(() => undefined); throw error; } }
export async function removeLogo(context: Context) { const tenantId = tenant(context); const current = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { logoObjectKey: true } }); const result = await prisma.tenant.update({ where: { id: tenantId }, data: { logoObjectKey: null, logoMimeType: null, logoSize: null, logoUpdatedAt: null }, select: { name: true, logoObjectKey: true, logoMimeType: true, logoSize: true, logoUpdatedAt: true } }); if (current.logoObjectKey) await objectStorage().delete(current.logoObjectKey); return result; }
export async function readLogo(context: { tenantId?: string }) { const tenantId = assertTenant(context.tenantId); const record = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { logoObjectKey: true, logoMimeType: true } }); if (!record?.logoObjectKey) return null; const object = await objectStorage().get(record.logoObjectKey); return object ? { ...object, contentType: record.logoMimeType ?? object.contentType } : null; }
export { maximumLogoSize };
