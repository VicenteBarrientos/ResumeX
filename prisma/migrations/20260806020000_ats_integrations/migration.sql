-- ATS integrations for ResumeX Talent
-- Ownership: User (no Organization yet). Credentials encrypted at application layer.

CREATE TYPE "AtsProvider" AS ENUM ('RECRUITEE', 'ZOHO_RECRUIT', 'ASHBY');
CREATE TYPE "AtsConnectionMode" AS ENUM ('LIVE', 'SANDBOX', 'DEMO');
CREATE TYPE "AtsConnectionStatus" AS ENUM (
  'CONNECTED',
  'NEEDS_REAUTHENTICATION',
  'PERMISSION_ERROR',
  'CONFIGURATION_ERROR',
  'TEMPORARILY_UNAVAILABLE',
  'DISCONNECTED'
);

CREATE TABLE "AtsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AtsProvider" NOT NULL,
    "mode" "AtsConnectionMode" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "AtsConnectionStatus" NOT NULL,
    "encryptedCredentials" TEXT,
    "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "capabilities" JSONB,
    "lastTestedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AtsExternalMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "localEntityType" TEXT NOT NULL,
    "localEntityId" TEXT NOT NULL,
    "externalEntityType" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsExternalMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AtsTransfer" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "localCandidateKey" TEXT NOT NULL,
    "localSearchProjectId" TEXT,
    "externalJobId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "candidateSnapshot" JSONB NOT NULL,
    "requestSummary" JSONB NOT NULL,
    "resultSummary" JSONB,
    "externalCandidateId" TEXT,
    "externalApplicationId" TEXT,
    "completedOperations" JSONB,
    "failedOperation" TEXT,
    "errorCode" TEXT,
    "safeErrorMessage" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtsTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AtsWebhookEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "safeErrorMessage" TEXT,

    CONSTRAINT "AtsWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AtsOauthState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AtsProvider" NOT NULL,
    "nonce" TEXT NOT NULL,
    "connectionId" TEXT,
    "redirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtsOauthState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AtsConnection_userId_provider_idx" ON "AtsConnection"("userId", "provider");
CREATE INDEX "AtsConnection_provider_idx" ON "AtsConnection"("provider");
CREATE INDEX "AtsConnection_status_idx" ON "AtsConnection"("status");

CREATE UNIQUE INDEX "AtsExternalMapping_connectionId_localEntityType_localEntityId_externalEntityType_key"
  ON "AtsExternalMapping"("connectionId", "localEntityType", "localEntityId", "externalEntityType");
CREATE INDEX "AtsExternalMapping_connectionId_externalEntityId_idx"
  ON "AtsExternalMapping"("connectionId", "externalEntityId");

CREATE UNIQUE INDEX "AtsTransfer_connectionId_idempotencyKey_key"
  ON "AtsTransfer"("connectionId", "idempotencyKey");
CREATE INDEX "AtsTransfer_connectionId_localCandidateKey_idx"
  ON "AtsTransfer"("connectionId", "localCandidateKey");

CREATE UNIQUE INDEX "AtsWebhookEvent_connectionId_providerEventId_key"
  ON "AtsWebhookEvent"("connectionId", "providerEventId");
CREATE INDEX "AtsWebhookEvent_connectionId_receivedAt_idx"
  ON "AtsWebhookEvent"("connectionId", "receivedAt");

CREATE UNIQUE INDEX "AtsOauthState_nonce_key" ON "AtsOauthState"("nonce");
CREATE INDEX "AtsOauthState_userId_provider_idx" ON "AtsOauthState"("userId", "provider");
CREATE INDEX "AtsOauthState_expiresAt_idx" ON "AtsOauthState"("expiresAt");

ALTER TABLE "AtsConnection"
  ADD CONSTRAINT "AtsConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtsExternalMapping"
  ADD CONSTRAINT "AtsExternalMapping_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "AtsConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtsTransfer"
  ADD CONSTRAINT "AtsTransfer_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "AtsConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtsWebhookEvent"
  ADD CONSTRAINT "AtsWebhookEvent_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "AtsConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtsOauthState"
  ADD CONSTRAINT "AtsOauthState_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "AtsConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
