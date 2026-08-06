-- T-12.2: Application and Answer were the only user-scoped tables without an
-- index on userId, so every tracker/answers listing was a sequential scan.
-- Composite [userId, createdAt] because both listings filter by userId and
-- order by createdAt.
--
-- IF NOT EXISTS keeps this replayable: this repo has already had to recover a
-- half-applied migration (P3009) by hand.
--
-- No CONCURRENTLY: prisma migrate deploy wraps each migration in a transaction,
-- and CREATE INDEX CONCURRENTLY cannot run inside one. Both tables are small.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Application_userId_createdAt_idx" ON "Application"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Answer_userId_createdAt_idx" ON "Answer"("userId", "createdAt");
