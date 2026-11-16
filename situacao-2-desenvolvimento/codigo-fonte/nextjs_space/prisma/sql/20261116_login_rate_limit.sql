-- MATERIAL MASTER - implantacao aditiva de LoginRateLimit (PostgreSQL 14+)
-- SEM DROP/TRUNCATE/DELETE/UPDATE em tabelas do produto.
-- Compatível com o model LoginRateLimit em prisma/schema.prisma.
-- Executar APOS backup verificado e preflight no banco-alvo; repetir e idempotente.
-- O comando usa o schema atual da conexao configurada no PostgreSQL.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS "LoginRateLimit" (
  "key"          VARCHAR(80) NOT NULL,
  "attempts"     INTEGER NOT NULL DEFAULT 0,
  "windowStart"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "LoginRateLimit_updatedAt_idx"
  ON "LoginRateLimit" ("updatedAt");

-- IF NOT EXISTS isoladamente nao valida a estrutura de tabela ja existente.
-- Falhar por completo, com rollback da transacao, se houver incompatibilidade.
DO $$
DECLARE
  n_colunas integer;
  n_validas integer;
  pk_valida boolean;
  idx_valido boolean;
BEGIN
  SELECT count(*) INTO n_colunas
  FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'LoginRateLimit';

  SELECT count(*) INTO n_validas
  FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'LoginRateLimit'
    AND (
      (column_name = 'key' AND data_type = 'character varying'
         AND character_maximum_length = 80 AND is_nullable = 'NO')
      OR (column_name = 'attempts' AND data_type = 'integer' AND is_nullable = 'NO')
      OR (column_name = 'windowStart'
         AND data_type = 'timestamp without time zone'
         AND datetime_precision = 3 AND is_nullable = 'NO')
      OR (column_name = 'updatedAt'
         AND data_type = 'timestamp without time zone'
         AND datetime_precision = 3 AND is_nullable = 'NO')
    );

  IF n_colunas <> 4 OR n_validas <> 4 THEN
    RAISE EXCEPTION 'LoginRateLimit: colunas nao conferem com schema Prisma: % colunas, % validas',
      n_colunas, n_validas;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM pg_index ix
    JOIN pg_class tb ON tb.oid = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = tb.relnamespace
    JOIN pg_attribute att ON att.attrelid = tb.oid AND att.attnum = ix.indkey[0]
    WHERE ns.nspname = current_schema() AND tb.relname = 'LoginRateLimit'
      AND ix.indisprimary AND ix.indnatts = 1 AND att.attname = 'key'
  ) INTO pk_valida;

  SELECT EXISTS(
    SELECT 1 FROM pg_index ix
    JOIN pg_class tb ON tb.oid = ix.indrelid
    JOIN pg_class idx ON idx.oid = ix.indexrelid
    JOIN pg_namespace ns ON ns.oid = tb.relnamespace
    JOIN pg_attribute att ON att.attrelid = tb.oid AND att.attnum = ix.indkey[0]
    WHERE ns.nspname = current_schema() AND tb.relname = 'LoginRateLimit'
      AND idx.relname = 'LoginRateLimit_updatedAt_idx'
      AND ix.indnatts = 1 AND att.attname = 'updatedAt'
  ) INTO idx_valido;

  IF NOT pk_valida OR NOT idx_valido THEN
    RAISE EXCEPTION 'LoginRateLimit: chave primaria ou indice updatedAt divergente';
  END IF;
END $$;

COMMIT;
