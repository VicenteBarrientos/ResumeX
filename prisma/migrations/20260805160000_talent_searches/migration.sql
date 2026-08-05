-- Talent Mapper persistence (T-4.1): user-owned searches, shortlist, notes.

CREATE TABLE "TalentSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL DEFAULT '',
    "criteriaJson" JSONB NOT NULL,
    "queriesJson" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "resultJson" JSONB,
    "worksReviewed" INTEGER NOT NULL DEFAULT 0,
    "uiStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShortlistEntry" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TalentSearch_userId_updatedAt_idx" ON "TalentSearch"("userId", "updatedAt");

CREATE INDEX "ShortlistEntry_searchId_idx" ON "ShortlistEntry"("searchId");

CREATE UNIQUE INDEX "ShortlistEntry_searchId_authorId_key" ON "ShortlistEntry"("searchId", "authorId");

CREATE INDEX "CandidateNote_searchId_idx" ON "CandidateNote"("searchId");

CREATE UNIQUE INDEX "CandidateNote_searchId_authorId_key" ON "CandidateNote"("searchId", "authorId");

ALTER TABLE "TalentSearch" ADD CONSTRAINT "TalentSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShortlistEntry" ADD CONSTRAINT "ShortlistEntry_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "TalentSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "TalentSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
