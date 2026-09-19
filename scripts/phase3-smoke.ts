import { MembershipStatus, OrderStatus, PrismaClient } from "@prisma/client";
import { installStarterData, getStarterDataPreview } from "../src/lib/services/bootstrap";
import { getSessionContext, hashPassword, onboard, startSession } from "../src/lib/services/auth";
import { acceptInvitation, changeMemberRole, changeMemberStatus, inviteMember, listMembers, revokeInvitation } from "../src/lib/services/team";
import { createDraft, duplicateOrder, getOrder, recordPreparedQuantities, transitionOrder, updateDraft } from "../src/lib/services/orders";
import { roleRedirect } from "../src/lib/tenant";

const prisma = new PrismaClient();
const context = { tenantId: "", role: "OWNER" as const, userId: "phase3-smoke" };

function check(condition: unknown, message: string) { if (!condition) throw new Error(`Smoke check failed: ${message}`); }

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { taxIdentifier: "TN-DF-DEMO" } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { tenantId: tenant.id, active: true } });
  const products = await prisma.product.findMany({ where: { tenantId: tenant.id, active: true, sku: { in: ["EAU-15", "JUS-1L"] } }, orderBy: { sku: "asc" } });
  check(products.length === 2, "seed provides two active products");
  const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { tenantId: tenant.id, active: true, stockLevels: { some: { productId: products[0].id, quantity: { gt: 0 } } } } });
  context.tenantId = tenant.id;
  const initialLevel = await prisma.stockLevel.findUniqueOrThrow({ where: { productId_warehouseId: { productId: products[0].id, warehouseId: warehouse.id } } });
  const draft = await createDraft({ customerId: customer.id, warehouseId: warehouse.id, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  check(draft.status === OrderStatus.DRAFT && draft.number.startsWith("CMD-"), "draft and tenant-scoped number");
  const edited = await updateDraft(draft.id, { customerId: customer.id, warehouseId: warehouse.id, version: draft.version, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "2", discount: "0" }, { productId: products[1].id, quantity: "1", discount: "0" }] }, context);
  check(edited.items.length === 2, "line add and update");
  const trimmed = await updateDraft(edited.id, { customerId: customer.id, warehouseId: warehouse.id, version: edited.version, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  check(trimmed.items.length === 1 && trimmed.items[0].quantity.eq(1), "line removal");
  const confirmed = await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: trimmed.version, idempotencyKey: "phase3-smoke-confirm" }, context);
  const repeated = await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: trimmed.version, idempotencyKey: "phase3-smoke-confirm" }, context);
  check(confirmed.status === OrderStatus.CONFIRMED && repeated.status === OrderStatus.CONFIRMED, "confirmation and idempotent retry");
  const preparing = await transitionOrder(trimmed.id, OrderStatus.IN_PREPARATION, { version: confirmed.version, idempotencyKey: "phase3-smoke-start" }, context);
  const prepared = await recordPreparedQuantities(trimmed.id, { version: preparing.version, lines: preparing.items.map((item) => ({ itemId: item.id, preparedQuantity: item.quantity.toString() })) }, context);
  const validated = await transitionOrder(trimmed.id, OrderStatus.PREPARED, { version: prepared.version, idempotencyKey: "phase3-smoke-prepared" }, context);
  const ready = await transitionOrder(trimmed.id, OrderStatus.READY_FOR_DELIVERY, { version: validated.version, idempotencyKey: "phase3-smoke-ready" }, context);
  check(ready.status === OrderStatus.READY_FOR_DELIVERY, "preparation lifecycle reaches ready for delivery");
  const duplicate = await duplicateOrder(trimmed.id, context);
  check(duplicate.status === OrderStatus.DRAFT && duplicate.id !== trimmed.id, "duplicate creates independent draft");
  const cancellable = await createDraft({ customerId: customer.id, warehouseId: warehouse.id, customerReference: "PHASE3-SMOKE-CANCEL", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  const cancelled = await transitionOrder(cancellable.id, OrderStatus.CANCELLED, { version: cancellable.version, note: "Test smoke", idempotencyKey: "phase3-smoke-cancel" }, context);
  const final = await prisma.salesOrder.findUniqueOrThrow({ where: { id: trimmed.id }, include: { reservations: true, statusHistory: true } });
  const auditCount = await prisma.auditEvent.count({ where: { tenantId: tenant.id, entity: "SalesOrder", entityId: trimmed.id } });
  const finalLevel = await prisma.stockLevel.findUniqueOrThrow({ where: { productId_warehouseId: { productId: products[0].id, warehouseId: warehouse.id } } });
  check(cancelled.status === OrderStatus.CANCELLED && cancelled.cancelReason === "Test smoke", "mandatory cancellation reason");
  check(final.reservations.some((reservation) => reservation.consumedQuantity.eq(reservation.quantity)), "reservation consumed");
  check(final.statusHistory.some((entry) => entry.toStatus === OrderStatus.READY_FOR_DELIVERY), "status history recorded");
  check(auditCount >= 6, "audit events recorded");
  check(initialLevel.quantity.minus(finalLevel.quantity).eq(1), "physical stock consumed exactly once");
  const isolatedTenant = await prisma.tenant.create({ data: { name: "Phase 3 smoke isolation" } });
  try {
    let crossTenantRejected = false;
    try { await getOrder(trimmed.id, { tenantId: isolatedTenant.id, role: "OWNER", userId: "phase3-smoke-other" }); } catch (error) { crossTenantRejected = error instanceof Error && error.message === "Commande introuvable"; }
    check(crossTenantRejected, "cross-tenant order read rejected");
  } finally { await prisma.tenant.delete({ where: { id: isolatedTenant.id } }); }
  let viewerRejected = false;
  try { await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: ready.version, idempotencyKey: "phase3-smoke-viewer" }, { tenantId: tenant.id, role: "VIEWER", userId: "phase3-smoke-viewer" }); } catch (error) { viewerRejected = error instanceof Error && error.message === "Action non autorisée"; }
  check(viewerRejected, "viewer transition rejected");
  const employeeEmail = `phase3-employee-${Date.now()}@example.test`;
  const ownerEmail = `phase3-owner-${Date.now()}@example.test`;
  const employeeTenant = await onboard({ companyName: "Smoke Distribution", name: "Propriétaire Smoke", email: ownerEmail, password: "SmokePassword!2026" });
  const starterPreview = await getStarterDataPreview(prisma, employeeTenant.tenantId);
  check(starterPreview.units.toAdd === 0 && starterPreview.categories.toAdd === 0 && starterPreview.warehouse.toAdd === 0, "registration installs starter data");
  await installStarterData(prisma, employeeTenant.tenantId);
  const idempotentPreview = await getStarterDataPreview(prisma, employeeTenant.tenantId);
  check(idempotentPreview.units.toAdd === 0 && idempotentPreview.categories.toAdd === 0 && idempotentPreview.warehouse.toAdd === 0, "starter data is idempotent");
  const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { tenantId: employeeTenant.tenantId, role: "OWNER" } });
  const invitation = await inviteMember({ name: "Commercial Smoke", email: employeeEmail, role: "SALES" }, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3002" });
  check(invitation.invitationUrl?.includes("/invitation/"), "development invitation link returned without exposing a token hash");
  let duplicateInvitationRejected = false;
  try { await inviteMember({ name: "Commercial Smoke", email: employeeEmail, role: "SALES" }, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3002" }); } catch (error) { duplicateInvitationRejected = error instanceof Error && error.message === "Une invitation active existe déjà"; }
  check(duplicateInvitationRejected, "duplicate active invitation rejected");
  const invitationToken = invitation.invitationUrl?.split("/invitation/")[1];
  check(Boolean(invitationToken), "invitation token is available only in development workflow");
  const accepted = await acceptInvitation(invitationToken!, "EmployeePassword!2026");
  const employeeUser = await prisma.user.findUniqueOrThrow({ where: { id: accepted.userId } });
  const employeeMembership = await prisma.membership.findUniqueOrThrow({ where: { tenantId_userId: { tenantId: employeeTenant.tenantId, userId: employeeUser.id } } });
  check(employeeMembership.status === MembershipStatus.ACTIVE && employeeUser.passwordSet, "invitation acceptance activates employee login");
  let singleUseRejected = false;
  try { await acceptInvitation(invitationToken!, "EmployeePassword!2026"); } catch (error) { singleUseRejected = error instanceof Error && error.message === "Invitation expirée ou invalide"; }
  check(singleUseRejected, "invitation is single use");
  const employeeSession = await startSession({ email: employeeEmail, password: "EmployeePassword!2026" });
  check(employeeSession.role === "SALES" && employeeSession.redirectTo === "/travailleur/commandes", "employee login uses role redirect");
  check(roleRedirect("OWNER") === "/dashboard" && roleRedirect("ADMIN") === "/dashboard" && roleRedirect("SALES") === "/travailleur/commandes" && roleRedirect("WAREHOUSE") === "/travailleur/preparation" && roleRedirect("DRIVER") === "/travailleur/livraisons" && roleRedirect("READ_ONLY") === "/travailleur", "all employee role redirects are explicit");
  let teamAccessRejected = false;
  try { await listMembers({ tenantId: employeeTenant.tenantId, role: "SALES", userId: employeeUser.id }); } catch (error) { teamAccessRejected = error instanceof Error && error.message === "Action non autorisée"; }
  check(teamAccessRejected, "sales employee cannot manage team");
  await changeMemberStatus(employeeMembership.id, MembershipStatus.SUSPENDED, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId });
  check((await getSessionContext(employeeSession.token)) === null, "suspended employee session is denied");
  await changeMemberStatus(employeeMembership.id, MembershipStatus.ACTIVE, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId });
  check((await getSessionContext(employeeSession.token))?.tenantId === employeeTenant.tenantId, "reactivated employee session is restored");
  let adminOwnerRejected = false;
  try { await changeMemberRole(ownerMembership.id, { role: "SALES" }, { tenantId: employeeTenant.tenantId, role: "ADMIN", userId: employeeUser.id }); } catch (error) { adminOwnerRejected = error instanceof Error && error.message === "Un administrateur ne peut pas modifier un propriétaire"; }
  check(adminOwnerRejected, "admin cannot modify owner");
  const existingEmail = `phase3-existing-${Date.now()}@example.test`;
  const existingUser = await prisma.user.create({ data: { name: "Utilisateur existant", email: existingEmail, passwordHash: await hashPassword("ExistingPassword!2026"), passwordSet: true } });
  const existingInvitation = await inviteMember({ name: "Utilisateur existant", email: existingEmail, role: "READ_ONLY" }, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3002" });
  const existingToken = existingInvitation.invitationUrl?.split("/invitation/")[1];
  const existingAccepted = await acceptInvitation(existingToken!, undefined);
  check(existingAccepted.userId === existingUser.id, "existing user acceptance keeps the account");
  const revokedEmail = `phase3-revoked-${Date.now()}@example.test`;
  const revokedInvitation = await inviteMember({ name: "Invitation révoquée", email: revokedEmail, role: "DRIVER" }, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3002" });
  await revokeInvitation(revokedInvitation.invitationId, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId });
  let revokedRejected = false;
  try { await acceptInvitation(revokedInvitation.invitationUrl!.split("/invitation/")[1], "RevokedPassword!2026"); } catch (error) { revokedRejected = error instanceof Error && error.message === "Invitation expirée ou invalide"; }
  check(revokedRejected, "revoked invitation cannot be accepted");
  const expiredEmail = `phase3-expired-${Date.now()}@example.test`;
  const expiredInvitation = await inviteMember({ name: "Invitation expirée", email: expiredEmail, role: "WAREHOUSE" }, { tenantId: employeeTenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3002" });
  await prisma.invitation.update({ where: { id: expiredInvitation.invitationId }, data: { expiresAt: new Date(0) } });
  let expiredRejected = false;
  try { await acceptInvitation(expiredInvitation.invitationUrl!.split("/invitation/")[1], "ExpiredPassword!2026"); } catch (error) { expiredRejected = error instanceof Error && error.message === "Invitation expirée ou invalide"; }
  check(expiredRejected, "expired invitation cannot be accepted");
  const teamAuditCount = await prisma.auditEvent.count({ where: { tenantId: employeeTenant.tenantId, entity: { in: ["Invitation", "Membership"] } } });
  check(teamAuditCount >= 8, "employee lifecycle is audited");
  const isolatedStarterTenant = await prisma.tenant.create({ data: { name: "Starter isolation smoke" } });
  try { const isolatedPreview = await getStarterDataPreview(prisma, isolatedStarterTenant.id); check(isolatedPreview.units.existing === 0 && isolatedPreview.categories.existing === 0 && isolatedPreview.warehouse.existing === 0, "starter data does not cross tenants"); } finally { await prisma.tenant.delete({ where: { id: isolatedStarterTenant.id } }); }
  await prisma.tenant.delete({ where: { id: employeeTenant.tenantId } });
  await prisma.user.deleteMany({ where: { email: { in: [employeeEmail, existingEmail, revokedEmail, expiredEmail, ownerEmail] } } });
  console.log(`Phase 3 PostgreSQL smoke passed: ${trimmed.number}, duplicate ${duplicate.number}, cancelled ${cancellable.number}, employee lifecycle and bootstrap`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
