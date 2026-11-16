-- Alteração aditiva para bancos existentes. Execute antes de iniciar a nova versão.
-- O projeto usa db push em bancos novos/QA e ainda não possui histórico de migrations.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
