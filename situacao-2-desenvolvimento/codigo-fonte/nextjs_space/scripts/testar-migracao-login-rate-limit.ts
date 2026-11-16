/**
 * Prova automatizada de migracao sem perda de dados.
 * Executa somente no PostgreSQL DESCARTAVEL do GitHub Actions.
 * Nunca executar em staging real ou producao.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const source = process.env.DATABASE_URL ?? ''
const url = new URL(source)
const database = url.pathname.replace(/^\//, '')
if (
  process.env.MIGRATION_QA_ONLY !== 'true' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  !['127.0.0.1', 'localhost'].includes(url.hostname) ||
  database !== 'material_master_ci'
) {
  throw new Error('Recusando execucao: este teste opera apenas no banco descartavel do GitHub Actions')
}
const qaSchema = 'qa_loginrate_migration'
const isolatedUrl = new URL(source)
isolatedUrl.searchParams.set('schema', qaSchema)
const principal = new PrismaClient()
const isolado = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } })
const script = path.resolve(process.cwd(), 'prisma/sql/20261116_login_rate_limit.sql')

function executarMigracao() {
  execFileSync('yarn', ['prisma', 'db', 'execute', '--file', script, '--url', isolatedUrl.toString()], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  })
}
function exigir(condicao: boolean, descricao: string) {
  if (!condicao) throw new Error(descricao)
}
async function main() {
  try {
    await principal.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "qa_loginrate_migration"')
    await isolado.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "QA_PreexistingRows" ("id" INTEGER PRIMARY KEY, "conteudo" TEXT NOT NULL)'
    )
    await isolado.$executeRawUnsafe(
      `INSERT INTO "QA_PreexistingRows" ("id", "conteudo") VALUES (1, 'registro-original-intacto')
       ON CONFLICT ("id") DO NOTHING`
    )
    const fixtureInicial = await isolado.$queryRawUnsafe<Array<{ conteudo: string }>>(
      'SELECT "conteudo" FROM "QA_PreexistingRows" WHERE "id" = 1'
    )
    exigir(fixtureInicial[0]?.conteudo === 'registro-original-intacto', 'Fixture inicial alterada')

    executarMigracao()
    const validas = await isolado.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT count(*)::bigint AS total FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'LoginRateLimit'`
    )
    exigir(Number(validas[0]?.total) === 4, 'Tabela LoginRateLimit deveria ter quatro colunas')

    // Cria um contador real e repete a mesma migracao para provar idempotencia sem perdas.
    const key = 'a:' + 'b'.repeat(64)
    await isolado.loginRateLimit.create({ data: { key, attempts: 7, windowStart: new Date(), updatedAt: new Date() } })
    executarMigracao()
    const registro = await isolado.loginRateLimit.findUnique({ where: { key } })
    exigir(registro?.attempts === 7, 'Migracao repetida modificou contador existente')
    const fixtureFinal = await isolado.$queryRawUnsafe<Array<{ conteudo: string }>>(
      'SELECT "conteudo" FROM "QA_PreexistingRows" WHERE "id" = 1'
    )
    exigir(fixtureFinal[0]?.conteudo === fixtureInicial[0]?.conteudo, 'Registro preexistente foi alterado')

    console.log('MIGRACAO LOGINRATELIMIT: APROVADA')
    console.log('DDL aditivo: tabela + indice criados em banco QA isolado')
    console.log('Reexecucao idempotente: contador preservado')
    console.log('Dados preexistentes: 1/1 registro preservado')
    console.log('Nenhum banco de producao foi acessado')
  } finally {
    await isolado.$disconnect()
    await principal.$disconnect()
  }
}

main().catch((erro: unknown) => {
  console.error('MIGRACAO LOGINRATELIMIT: REPROVADA', erro)
  process.exitCode = 1
})
