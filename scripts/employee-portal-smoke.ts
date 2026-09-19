import { MembershipStatus, NotificationType, PrismaClient } from "@prisma/client";
import { onboard, startSession } from "../src/lib/services/auth";
import { createConversation, getConversation, listMessages, sendMessage } from "../src/lib/services/messaging";
import { acceptInvitation, inviteMember } from "../src/lib/services/team";
import { unreadCount } from "../src/lib/services/notifications";

const prisma = new PrismaClient();
function check(condition: unknown, message: string) { if (!condition) throw new Error(`Employee smoke check failed: ${message}`); }

async function main() {
  const suffix = Date.now(); const ownerEmail = `employee-smoke-owner-${suffix}@example.test`; const employeeEmail = `employee-smoke-worker-${suffix}@example.test`;
  const tenant = await onboard({ companyName: `Employee Smoke ${suffix}`, name: "Owner Smoke", email: ownerEmail, password: "SmokeOwner!2026" });
  try {
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { tenantId: tenant.tenantId, role: "OWNER" } });
    const invitation = await inviteMember({ name: "Worker Smoke", email: employeeEmail, role: "WAREHOUSE" }, { tenantId: tenant.tenantId, role: "OWNER", userId: ownerMembership.userId, requestOrigin: "http://localhost:3000" });
    check(invitation.emailSent === false && invitation.invitationUrl, "development invitation fallback is explicit");
    await acceptInvitation(invitation.invitationUrl!.split("/invitation/")[1], "SmokeWorker!2026");
    const worker = await prisma.user.findUniqueOrThrow({ where: { email: employeeEmail } });
    const membership = await prisma.membership.findUniqueOrThrow({ where: { tenantId_userId: { tenantId: tenant.tenantId, userId: worker.id } } });
    check(membership.status === MembershipStatus.ACTIVE, "worker membership is active");
    const ownerSession = await startSession({ email: ownerEmail, password: "SmokeOwner!2026" });
    const workerSession = await startSession({ email: employeeEmail, password: "SmokeWorker!2026" });
    check(workerSession.redirectTo === "/travailleur/preparation", "warehouse worker redirect is dedicated");
    const conversation = await createConversation({ type: "DIRECT", participantIds: [worker.id] }, { tenantId: tenant.tenantId, role: "OWNER", userId: ownerMembership.userId });
    await sendMessage(conversation.id, { body: "Message de contrôle", clientId: `smoke-${suffix}` }, { tenantId: tenant.tenantId, role: "OWNER", userId: ownerMembership.userId });
    const messages = await listMessages(conversation.id, { tenantId: tenant.tenantId, role: "WAREHOUSE", userId: worker.id });
    check(messages.length === 1 && messages[0].body === "Message de contrôle", "message is visible to tenant participant");
    check(await unreadCount({ tenantId: tenant.tenantId, role: "WAREHOUSE", userId: worker.id }) === 1, "message notification is delivered");
    check(await prisma.notification.count({ where: { tenantId: tenant.tenantId, type: NotificationType.INVITATION_EMAIL_FAILED } }) === 1, "email failure is notified");
    let isolated = false; const other = await prisma.tenant.create({ data: { name: `Other ${suffix}` } });
    try { await getConversation(conversation.id, { tenantId: other.id, role: "OWNER", userId: ownerMembership.userId }); } catch { isolated = true; } finally { await prisma.tenant.delete({ where: { id: other.id } }); }
    check(isolated, "conversation access is tenant scoped");
    void ownerSession;
    console.log("Employee portal PostgreSQL smoke passed: invitation, worker redirect, notifications, messaging, tenant isolation");
  } finally {
    await prisma.tenant.delete({ where: { id: tenant.tenantId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, employeeEmail] } } });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
