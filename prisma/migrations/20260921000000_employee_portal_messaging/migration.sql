CREATE TYPE "NotificationType" AS ENUM ('EMPLOYEE_ACCEPTED_INVITATION', 'INVITATION_EMAIL_FAILED', 'EMPLOYEE_MESSAGE', 'EMPLOYEE_ATTACHMENT');
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'OPERATIONAL');

ALTER TABLE "Tenant" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "rneIdentifier" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "businessActivity" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "addressLine" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "city" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "governorate" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Tunisie';
ALTER TABLE "Tenant" ADD COLUMN "phone" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "email" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "website" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "defaultLanguage" TEXT NOT NULL DEFAULT 'fr';

ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "User" ADD COLUMN "avatarObjectKey" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarMimeType" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarSize" INTEGER;
ALTER TABLE "User" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Invitation" ADD COLUMN "resendCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invitation" ADD COLUMN "lastSentAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN "lastDeliveryError" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "metadata" JSONB,
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_tenantId_recipientId_readAt_createdAt_idx" ON "Notification"("tenantId", "recipientId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL,
  "title" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Conversation_tenantId_updatedAt_idx" ON "Conversation"("tenantId", "updatedAt");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ConversationParticipant" (
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("conversationId", "userId")
);
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Message_conversationId_clientId_key" ON "Message"("conversationId", "clientId");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MessageAttachment_tenantId_messageId_idx" ON "MessageAttachment"("tenantId", "messageId");
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MessageReadState" (
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReadState_pkey" PRIMARY KEY ("messageId", "userId")
);
CREATE INDEX "MessageReadState_userId_readAt_idx" ON "MessageReadState"("userId", "readAt");
ALTER TABLE "MessageReadState" ADD CONSTRAINT "MessageReadState_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReadState" ADD CONSTRAINT "MessageReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
