import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("employee portal schema documents tenant-scoped communication entities", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  const migration = await readFile("prisma/migrations/20260921000000_employee_portal_messaging/migration.sql", "utf8");
  assert.match(schema, /enum NotificationType/);
  assert.match(schema, /model ConversationParticipant/);
  assert.match(schema, /model MessageAttachment/);
  assert.match(schema, /dedupeKey\s+String\?\s+@unique/);
  assert.match(migration, /Notification_tenantId_fkey/);
  assert.match(migration, /Message_conversationId_clientId_key/);
});

test("employee APIs use safe JSON and participant-scoped attachment access", async () => {
  const [response, client, messaging] = await Promise.all([
    readFile("src/lib/api-response.ts", "utf8"),
    readFile("src/lib/client-api.ts", "utf8"),
    readFile("src/lib/services/messaging.ts", "utf8"),
  ]);
  assert.match(response, /parseJson/);
  assert.match(client, /response\.text\(\)/);
  assert.match(client, /contentType\.includes\("application\/json"\)/);
  assert.match(messaging, /participants: \{ some: \{ userId: context\.userId \} \}/);
  assert.match(messaging, /10 \* 1024 \* 1024/);
  assert.match(messaging, /attachmentKind/);
});

test("invitation delivery supports Resend and failure notification", async () => {
  const email = await readFile("src/lib/services/email.ts", "utf8");
  const team = await readFile("src/lib/services/team.ts", "utf8");
  assert.match(email, /api\.resend\.com\/emails/);
  assert.match(email, /RESEND_API_KEY/);
  assert.match(team, /INVITATION_EMAIL_FAILED/);
  assert.match(team, /Patientez une minute/);
  assert.match(team, /EMPLOYEE_ACCEPTED_INVITATION/);
});
