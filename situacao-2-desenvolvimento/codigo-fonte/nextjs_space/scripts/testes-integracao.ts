/**
 * Testes automatizados do MATERIAL MASTER (integração via HTTP + banco).
 * Execução: yarn tsx --require dotenv/config scripts/testes-integracao.ts
 * Pré-requisito: servidor de desenvolvimento rodando (BASE, padrão http://localhost:3000) e seed aplicado.
 */
import { PrismaClient } from '@prisma/client'

const BASE = process.env.TEST_BASE ?? 'http://localhost:3000'
// Senhas das contas de demonstração (mesmas variáveis usadas pelo seed; padrões apenas para desenvolvimento).
const SENHA_ADMIN = process.env.SEED_SENHA_ADMIN ?? 'Admin@123'
const SENHA_GESTOR = process.env.SEED_SENHA_GESTOR ?? 'Gestor@123'
const SENHA_CONSULTA = process.env.SEED_SENHA_CONSULTA ?? 'Consulta@123'
// Limita o pool do script para não disputar as conexões do servidor (limite global baixo no banco).
const urlBanco = new URL(process.env.DATABASE_URL ?? '')
urlBanco.searchParams.set('connection_limit', '5')
const prisma = new PrismaClient({ datasources: { db: { url: urlBanco.toString() } } })

type Sessao = { cookie: string; nome: string }
const resultados: Array<{ nome: string; ok: boolean; detalhe?: string }> = []

async function teste(nome: string, fn: () => Promise<void>) {
  try {
    await fn()
    resultados.push({ nome, ok: true })
    console.log(`✓ ${nome}`)
  } catch (e) {
    resultados.push({ nome, ok: false, detalhe: (e as Error)?.message })
    console.log(`✗ ${nome}\n    ${(e as Error)?.message}`)
  }
}
function esperar(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// ---------- helpers de autenticação (fluxo real do Auth.js) ----------
function parseCookies(res: Response, jar: Record<string, string>) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';')
    const i = kv.indexOf('=')
    jar[kv.slice(0, i)] = kv.slice(i + 1)
  }
}
const cookieStr = (jar: Record<string, string>) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')

async function login(email: string, password: string): Promise<Sessao | null> {
  const jar: Record<string, string> = {}
  const r1 = await fetch(`${BASE}/api/auth/csrf`)
  parseCookies(r1, jar)
  const { csrfToken } = (await r1.json()) as { csrfToken: string }
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieStr(jar) },
    body: new URLSearchParams({ csrfToken, email, password }),
  })
  parseCookies(r2, jar)
  const r3 = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookieStr(jar) } })
  const sess = (await r3.json()) as { user?: { name?: string } }
  if (!sess?.user) return null
  return { cookie: cookieStr(jar), nome: sess.user.name ?? '' }
}

async function api(sessao: Sessao | null, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(sessao ? { cookie: sessao.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json: Record<string, unknown> = {}
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    json = {}
  }
  return { status: res.status, json }
}

async function pagina(sessao: Sessao | null, path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', headers: sessao ? { cookie: sessao.cookie } : {} })
  return { status: res.status, location: res.headers.get('location') ?? '' }
}

async function main() {
  console.log(`\n=== Testes de integração MATERIAL MASTER (${BASE}) ===\n`)

  // ---------- 1. Geração de código: unicidade sob concorrência ----------
  await teste('Código: 25 gerações concorrentes produzem 25 códigos únicos e sequenciais', async () => {
    const { gerarProximoCodigo } = await import('../lib/codigo')
    const antes = await prisma.codigoSequencia.findUnique({ where: { prefixo: 'MAT' } })
    const codigos = await Promise.all(Array.from({ length: 25 }, () => prisma.$transaction((tx) => gerarProximoCodigo(tx))))
    esperar(new Set(codigos).size === 25, `Colisão detectada: ${codigos.join(',')}`)
    esperar(codigos.every((c) => /^MAT-\d{6}$/.test(c)), 'Formato inválido')
    const depois = await prisma.codigoSequencia.findUnique({ where: { prefixo: 'MAT' } })
    esperar((depois?.ultimo ?? 0) - (antes?.ultimo ?? 0) === 25, 'Sequência não avançou exatamente 25')
  })

  // ---------- 2. Autenticação ----------
  let admin: Sessao | null = null
  let gestor: Sessao | null = null
  let consulta: Sessao | null = null
  await teste('Login: administrador, gestor e consulta autenticam com credenciais válidas', async () => {
    admin = await login('admin@materialmaster.com.br', SENHA_ADMIN)
    gestor = await login('gestor@materialmaster.com.br', SENHA_GESTOR)
    consulta = await login('consulta@materialmaster.com.br', SENHA_CONSULTA)
    esperar(Boolean(admin && gestor && consulta), 'Alguma sessão não foi criada')
  })
  await teste('Login: senha incorreta é rejeitada', async () => {
    const s = await login('admin@materialmaster.com.br', 'errada')
    esperar(s === null, 'Login com senha errada foi aceito')
    const r = await api(null, 'POST', '/api/auth/login', { email: 'admin@materialmaster.com.br', password: 'errada' })
    esperar(r.status === 410, `Endpoint auxiliar deve estar desativado (410); obtido ${r.status}`)
    esperar(!r.json.usuario, 'Endpoint desativado não deve divulgar dados do usuário')
  })

  await teste('Segurança: cabeçalhos HTTPS, MIME e antiframe', async () => {
    const resposta = await fetch(`${BASE}/login`)
    esperar(resposta.status === 200, 'Página de login não está acessível')
    const h = resposta.headers
    esperar(h.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options ausente')
    esperar(h.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options ausente')
    esperar(h.get('content-security-policy')?.includes('frame-ancestors') === true, 'CSP anti-clickjacking ausente')
    esperar(h.get('strict-transport-security')?.includes('max-age=') === true, 'HSTS ausente na compilação de produção')
  })
  await teste('Segurança: bloqueia força bruta por conta e libera após 15 minutos', async () => {
    const bcrypt = await import('bcryptjs')
    const { chavesLogin, LIMITES_LOGIN } = await import('../lib/login-rate-limit')
    const email = `qa-login-${Date.now()}-${process.pid}@example.invalid`
    const senha = 'SenhaQA-temporaria!2026'
    const usuario = await prisma.user.create({
      data: { name: 'Conta temporária de segurança', email, password: await bcrypt.hash(senha, 10), perfil: 'CONSULTA' },
    })
    const key = chavesLogin(email, new Request(`${BASE}/api/auth/callback/credentials`))[0].key
    try {
      for (let i = 0; i < LIMITES_LOGIN.porConta; i++) {
        const invalido = await login(email, 'senha-invalida')
        esperar(invalido === null, `Tentativa inválida número ${i + 1} não foi rejeitada`)
      }
      const bloqueado = await login(email, senha)
      esperar(bloqueado === null, 'Login válido deveria ser bloqueado após exceder o limite de tentativas')
      const contador = await prisma.loginRateLimit.findUnique({ where: { key } })
      esperar((contador?.attempts ?? 0) > LIMITES_LOGIN.porConta, 'Contador persistente não registrou o bloqueio')
      esperar(Boolean(contador && !contador.key.includes(email)), 'Registro de segurança não pode revelar e-mail em texto puro')
      // QA com banco descartável: simula término da janela sem aguardar tempo real.
      await prisma.loginRateLimit.update({
        where: { key },
        data: { windowStart: new Date(Date.now() - 16 * 60 * 1000) },
      })
      const recuperado = await login(email, senha)
      esperar(Boolean(recuperado), 'Login correto não voltou a funcionar após expirar a janela')
      const depois = await prisma.loginRateLimit.findUnique({ where: { key } })
      esperar(depois === null, 'Contador da conta deveria ser limpo após login válido')
    } finally {
      await prisma.auditLog.deleteMany({ where: { usuarioId: usuario.id } })
      await prisma.user.delete({ where: { id: usuario.id } })
      await prisma.loginRateLimit.deleteMany({ where: { key } })
    }
  })
  // ---------- 3. Autorização (servidor) ----------
  await teste('Autorização: APIs exigem autenticação (401 sem sessão)', async () => {
    for (const p of ['/api/materiais', '/api/familias', '/api/grupos', '/api/subgrupos', '/api/usuarios', '/api/unidades']) {
      const r = await api(null, 'GET', p)
      esperar(r.status === 401, `${p} retornou ${r.status}`)
    }
  })
  await teste('Autorização: páginas protegidas redirecionam anônimos para /login', async () => {
    for (const p of ['/inicio', '/materiais', '/materiais/novo', '/classificacoes', '/usuarios']) {
      const r = await pagina(null, p)
      esperar(r.status >= 300 && r.status < 400 && r.location.includes('/login'), `${p}: ${r.status} ${r.location}`)
    }
  })
  await teste('Autorização: perfil Consulta não cria material (403) nem acessa páginas de edição', async () => {
    const r = await api(consulta, 'POST', '/api/materiais', {})
    esperar(r.status === 403, `Esperado 403, obtido ${r.status}`)
    const p = await pagina(consulta, '/materiais/novo')
    esperar(p.location.includes('/sem-permissao'), `Página novo: ${p.status} ${p.location}`)
    const u = await api(consulta, 'GET', '/api/usuarios')
    esperar(u.status === 403, `Usuários: esperado 403, obtido ${u.status}`)
  })
  await teste('Autorização: perfil Gestor não gerencia classificações nem usuários (403)', async () => {
    const r1 = await api(gestor, 'POST', '/api/familias', { codigo: 'XXX', nome: 'Teste' })
    const r2 = await api(gestor, 'GET', '/api/usuarios')
    const r3 = await api(gestor, 'POST', '/api/usuarios', { name: 'X', email: 'x@x.com', password: '123456', perfil: 'CONSULTA' })
    esperar(r1.status === 403 && r2.status === 403 && r3.status === 403, `Status: ${r1.status}, ${r2.status}, ${r3.status}`)
    const p = await pagina(gestor, '/classificacoes')
    esperar(p.location.includes('/sem-permissao'), `Página classificações: ${p.status} ${p.location}`)
  })
  await teste('Autorização: perfil Consulta consegue listar e ver materiais', async () => {
    const r = await api(consulta, 'GET', '/api/materiais?pageSize=5')
    esperar(r.status === 200 && Array.isArray(r.json.itens) && (r.json.itens as unknown[]).length === 5, `Status ${r.status}`)
  })

  // ---------- 4. Materiais: validação, criação, edição, inativação ----------
  const fam = await prisma.familia.findUnique({ where: { codigo: 'MEC' } })
  const grp = await prisma.grupo.findFirst({ where: { familiaId: fam?.id, codigo: 'ROL' } })
  const sub = await prisma.subgrupo.findFirst({ where: { grupoId: grp?.id, codigo: 'ESF' } })
  const um = await prisma.unidadeMedida.findUnique({ where: { sigla: 'PC' } })
  const famOutra = await prisma.familia.findUnique({ where: { codigo: 'ELE' } })
  const base = { descricaoCurta: 'Rolamento de teste automatizado 6206', descricaoLonga: 'Criado pelos testes', unidadeMedidaId: um?.id, familiaId: fam?.id, grupoId: grp?.id, subgrupoId: sub?.id, fabricante: 'TESTE', partNumber: 'T-6206', ncm: '84821010' }

  await teste('Validação: material sem campos obrigatórios retorna 400 com mensagens pt-BR por campo', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { descricaoCurta: 'ab' })
    const campos = (r.json.campos ?? {}) as Record<string, string>
    esperar(r.status === 400, `Esperado 400, obtido ${r.status}`)
    esperar(Boolean(campos.descricaoCurta && campos.familiaId && campos.unidadeMedidaId), `Campos: ${JSON.stringify(campos)}`)
  })
  await teste('Validação: NCM com tamanho inválido é rejeitado', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { ...base, ncm: '1234' })
    esperar(r.status === 400 && String((r.json.campos as Record<string, string>)?.ncm ?? '').includes('8 dígitos'), `${r.status} ${JSON.stringify(r.json)}`)
  })
  await teste('Integridade: grupo de outra família é rejeitado no cadastro de material', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { ...base, familiaId: famOutra?.id })
    esperar(r.status === 400 && String(r.json.erro).includes('não pertence'), `${r.status} ${JSON.stringify(r.json)}`)
  })

  let materialId = ''
  let codigoGerado = ''
  await teste('Material: gestor cria material com código gerado automaticamente e auditoria de criação', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', base)
    const m = r.json.material as { id: string; codigo: string; status: string }
    esperar(r.status === 201 && Boolean(m?.id), `${r.status} ${JSON.stringify(r.json)}`)
    esperar(/^MAT-\d{6}$/.test(m.codigo) && m.status === 'ATIVO', 'Código/status inválidos')
    materialId = m.id
    codigoGerado = m.codigo
    const log = await prisma.auditLog.findFirst({ where: { entidade: 'Material', entidadeId: m.id, acao: 'CRIACAO' } })
    esperar(Boolean(log), 'Auditoria de criação ausente')
  })
  await teste('Material: código é imutável (tentativa de alterar retorna 400)', async () => {
    const r = await api(gestor, 'PUT', `/api/materiais/${materialId}`, { ...base, codigo: 'MAT-999999' })
    esperar(r.status === 400 && String(r.json.erro).includes('imutável'), `${r.status} ${JSON.stringify(r.json)}`)
    const m = await prisma.material.findUnique({ where: { id: materialId } })
    esperar(m?.codigo === codigoGerado, 'Código foi alterado!')
  })
  await teste('Material: edição registra atualizadoPor e trilha com alterações', async () => {
    const r = await api(admin, 'PUT', `/api/materiais/${materialId}`, { ...base, fabricante: 'TESTE EDITADO' })
    esperar(r.status === 200, `${r.status} ${JSON.stringify(r.json)}`)
    const m = r.json.material as { fabricante: string; atualizadoPor?: { name: string } }
    esperar(m.fabricante === 'TESTE EDITADO' && m.atualizadoPor?.name === 'Ana Administradora', 'Edição não aplicada')
    const log = await prisma.auditLog.findFirst({ where: { entidade: 'Material', entidadeId: materialId, acao: 'EDICAO' } })
    const det = (log?.detalhes ?? {}) as { alteracoes?: Record<string, unknown> }
    esperar(Boolean(det.alteracoes?.fabricante), 'Trilha de edição sem campo alterado')
  })
  await teste('Material: busca textual e filtro por família/status/paginação funcionam', async () => {
    const r = await api(consulta, 'GET', `/api/materiais?q=${encodeURIComponent('teste automatizado')}`)
    esperar(r.status === 200 && (r.json.itens as Array<{ id: string }>).some((i) => i.id === materialId), 'Busca textual não encontrou')
    const r2 = await api(consulta, 'GET', `/api/materiais?familiaId=${fam?.id}&status=ATIVO&pageSize=5&page=1`)
    const itens = r2.json.itens as Array<{ familiaId: string; status: string }>
    esperar(itens.length > 0 && itens.every((i) => i.familiaId === fam?.id && i.status === 'ATIVO'), 'Filtro incorreto')
    esperar(Number(r2.json.totalPaginas) >= 1 && Number(r2.json.pageSize) === 5, 'Paginação incorreta')
  })
  await teste('Material: inativação exige motivo, é lógica (registro preservado) e reativação funciona', async () => {
    const semMotivo = await api(gestor, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'INATIVO' })
    esperar(semMotivo.status === 400, `Sem motivo deveria falhar: ${semMotivo.status}`)
    const r = await api(gestor, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'INATIVO', motivo: 'Teste automatizado' })
    esperar(r.status === 200 && (r.json.material as { status: string }).status === 'INATIVO', `${r.status}`)
    const m = await prisma.material.findUnique({ where: { id: materialId } })
    esperar(m?.status === 'INATIVO', 'Registro não preservado/inativado')
    const log = await prisma.auditLog.findFirst({ where: { entidadeId: materialId, acao: 'INATIVACAO' } })
    esperar(Boolean(log), 'Auditoria de inativação ausente')
    const r2 = await api(gestor, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'ATIVO' })
    esperar(r2.status === 200 && (r2.json.material as { status: string }).status === 'ATIVO', 'Reativação falhou')
  })
  await teste('Material: exclusão física não é permitida (405)', async () => {
    const r = await api(admin, 'DELETE', `/api/materiais/${materialId}`)
    esperar(r.status === 405, `Esperado 405, obtido ${r.status}`)
  })
  await teste('Material: perfil Consulta não inativa material (403)', async () => {
    const r = await api(consulta, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'INATIVO', motivo: 'x' })
    esperar(r.status === 403, `Esperado 403, obtido ${r.status}`)
  })

  // ---------- 5. Hierarquia ----------
  const sufixo = String(Date.now()).slice(-5)
  let famTesteId = ''
  let grpTesteId = ''
  let subTesteId = ''
  await teste('Hierarquia: admin cria família, grupo e subgrupo; código duplicado retorna 409', async () => {
    const f = await api(admin, 'POST', '/api/familias', { codigo: `T${sufixo}`, nome: 'Família Teste' })
    esperar(f.status === 201, `Família: ${f.status} ${JSON.stringify(f.json)}`)
    famTesteId = (f.json.familia as { id: string }).id
    const dup = await api(admin, 'POST', '/api/familias', { codigo: `t${sufixo}`, nome: 'Dup' })
    esperar(dup.status === 409, `Duplicado: ${dup.status}`)
    const g = await api(admin, 'POST', '/api/grupos', { codigo: 'G1', nome: 'Grupo Teste', familiaId: famTesteId })
    esperar(g.status === 201, `Grupo: ${g.status}`)
    grpTesteId = (g.json.grupo as { id: string }).id
    const s = await api(admin, 'POST', '/api/subgrupos', { codigo: 'S1', nome: 'Subgrupo Teste', grupoId: grpTesteId })
    esperar(s.status === 201, `Subgrupo: ${s.status}`)
    subTesteId = (s.json.subgrupo as { id: string }).id
  })
  await teste('Hierarquia: validação de código inválido e nome curto (400)', async () => {
    const r = await api(admin, 'POST', '/api/familias', { codigo: 'A B!', nome: 'x' })
    esperar(r.status === 400 && Boolean((r.json.campos as Record<string, string>)?.codigo), `${r.status} ${JSON.stringify(r.json)}`)
  })
  await teste('Hierarquia: inativar família em uso exige confirmação (409) e com confirmação inativa', async () => {
    const r = await api(admin, 'PATCH', `/api/familias/${famTesteId}`, { ativo: false })
    esperar(r.status === 409 && r.json.requerConfirmacao === true, `Esperado 409 com aviso, obtido ${r.status}`)
    const r2 = await api(admin, 'PATCH', `/api/familias/${famTesteId}`, { ativo: false, confirmar: true })
    esperar(r2.status === 200 && (r2.json.familia as { ativo: boolean }).ativo === false, `Confirmação: ${r2.status}`)
  })
  await teste('Hierarquia: família inativa não pode ser usada em novo material', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { ...base, familiaId: famTesteId, grupoId: grpTesteId, subgrupoId: subTesteId })
    esperar(r.status === 400 && String(r.json.erro).includes('inativa'), `${r.status} ${JSON.stringify(r.json)}`)
  })
  await teste('Hierarquia: grupo não pode ser reativado se família pai estiver inativa; reativar família resolve', async () => {
    await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: false, confirmar: true })
    const r = await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: true })
    esperar(r.status === 409, `Esperado 409, obtido ${r.status}`)
    const rf = await api(admin, 'PATCH', `/api/familias/${famTesteId}`, { ativo: true })
    esperar(rf.status === 200, 'Reativar família falhou')
    const rg = await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: true })
    esperar(rg.status === 200, 'Reativar grupo falhou')
  })
  await teste('Hierarquia: grupo não pode ser movido para outra família se tiver materiais vinculados', async () => {
    const r = await api(admin, 'PUT', `/api/grupos/${grp?.id}`, { codigo: 'ROL', nome: 'Rolamentos', familiaId: famOutra?.id })
    esperar(r.status === 409, `Esperado 409, obtido ${r.status}`)
  })
  await teste('Hierarquia: exclusão física bloqueada (405)', async () => {
    const r = await api(admin, 'DELETE', `/api/familias/${famTesteId}`)
    esperar(r.status === 405, `Esperado 405, obtido ${r.status}`)
  })

  // ---------- 6. Usuários ----------
  let novoUsuarioId = ''
  await teste('Usuários: admin cria usuário, altera perfil e inativa; usuário inativo não loga', async () => {
    const email = `teste.${sufixo}@materialmaster.com.br`
    const r = await api(admin, 'POST', '/api/usuarios', { name: 'Usuário Teste', email, password: 'Teste@123', perfil: 'CONSULTA' })
    esperar(r.status === 201, `Criar: ${r.status} ${JSON.stringify(r.json)}`)
    novoUsuarioId = (r.json.usuario as { id: string }).id
    esperar(Boolean(await login(email, 'Teste@123')), 'Novo usuário não logou')
    const r2 = await api(admin, 'PUT', `/api/usuarios/${novoUsuarioId}`, { perfil: 'GESTOR_CADASTRO' })
    esperar(r2.status === 200 && (r2.json.usuario as { perfil: string }).perfil === 'GESTOR_CADASTRO', 'Alterar perfil falhou')
    const r3 = await api(admin, 'PUT', `/api/usuarios/${novoUsuarioId}`, { ativo: false })
    esperar(r3.status === 200, 'Inativar falhou')
    esperar((await login(email, 'Teste@123')) === null, 'Usuário inativo conseguiu logar')
  })
  await teste('Usuários: autocadastro público cria perfil CONSULTA e rejeita e-mail duplicado', async () => {
    const email = `auto.${sufixo}@materialmaster.com.br`
    const r = await api(null, 'POST', '/api/signup', { name: 'Auto Cadastro', email, password: '123456', perfil: 'ADMINISTRADOR' })
    esperar(r.status === 201 && (r.json.usuario as { perfil: string }).perfil === 'CONSULTA', `${r.status} ${JSON.stringify(r.json)}`)
    const dup = await api(null, 'POST', '/api/signup', { name: 'Auto Cadastro', email, password: '123456' })
    esperar(dup.status === 409, `Duplicado: ${dup.status}`)
  })
  await teste('Usuários: admin não pode inativar a própria conta', async () => {
    const eu = await prisma.user.findUnique({ where: { email: 'admin@materialmaster.com.br' } })
    const r = await api(admin, 'PUT', `/api/usuarios/${eu?.id}`, { ativo: false })
    esperar(r.status === 400, `Esperado 400, obtido ${r.status}`)
  })

  await teste('Sessão existente: mudança de perfil e inativação revogam acesso imediatamente', async () => {
    // Executar somente contra base de QA isolada; este teste cria e inativa usuário.
    const email = `sessao.${Date.now()}@materialmaster.com.br`
    const senha = 'Teste@123'
    const criado = await api(admin, 'POST', '/api/usuarios', { name: 'Sessão RBAC Teste', email, password: senha, perfil: 'ADMINISTRADOR' })
    esperar(criado.status === 201, `Criar administrador de teste: ${criado.status}`)
    const id = (criado.json.usuario as { id: string }).id
    const sessaoAntiga = await login(email, senha)
    esperar(Boolean(sessaoAntiga), 'Sessão inicial não criada')
    const acessoAntes = await api(sessaoAntiga, 'GET', '/api/usuarios')
    esperar(acessoAntes.status === 200, `Admin recém-criado deveria ter acesso: ${acessoAntes.status}`)

    const rebaixado = await api(admin, 'PUT', `/api/usuarios/${id}`, { perfil: 'CONSULTA' })
    esperar(rebaixado.status === 200, `Rebaixar usuário: ${rebaixado.status}`)
    const acessoDepois = await api(sessaoAntiga, 'GET', '/api/usuarios')
    esperar(acessoDepois.status === 403, `JWT antigo manteve acesso administrativo: ${acessoDepois.status}`)

    const inativado = await api(admin, 'PUT', `/api/usuarios/${id}`, { ativo: false })
    esperar(inativado.status === 200, `Inativar usuário: ${inativado.status}`)
    const bloqueado = await api(sessaoAntiga, 'GET', '/api/materiais')
    esperar(bloqueado.status === 401, `Conta inativa ainda acessa API: ${bloqueado.status}`)
    const paginaBloqueada = await pagina(sessaoAntiga, '/inicio')
    esperar(paginaBloqueada.location.includes('/login'), `Conta inativa ainda acessa página: ${paginaBloqueada.status}, ${paginaBloqueada.location}`)
  })

  // ---------- 7. Páginas renderizam para perfis autorizados ----------
  await teste('Páginas: início, materiais, detalhe, novo, classificações e usuários respondem 200 para o perfil correto', async () => {
    const checks: Array<[Sessao | null, string]> = [
      [consulta, '/inicio'], [consulta, '/materiais'], [consulta, `/materiais/${materialId}`],
      [gestor, '/materiais/novo'], [gestor, `/materiais/${materialId}/editar`],
      [admin, '/classificacoes'], [admin, '/usuarios'],
    ]
    for (const [s, p] of checks) {
      const r = await pagina(s, p)
      esperar(r.status === 200, `${p}: ${r.status} ${r.location}`)
    }
    const pub = await pagina(null, '/login')
    esperar(pub.status === 200, `/login: ${pub.status}`)
    const raiz = await pagina(null, '/')
    esperar(raiz.location.includes('/login'), `/: ${raiz.status} ${raiz.location}`)
  })

  // ---------- 8. QA incremental: autorização em TODAS as rotas de escrita ----------
  const idFake = 'id-inexistente'
  type Rota = [string, string, unknown]
  const rotasAdmin: Rota[] = [
    ['POST', '/api/familias', { codigo: 'QA1', nome: 'QA' }], ['PUT', `/api/familias/${idFake}`, { codigo: 'QA1', nome: 'QA' }], ['PATCH', `/api/familias/${idFake}`, { ativo: false }],
    ['POST', '/api/grupos', { codigo: 'QA1', nome: 'QA', familiaId: idFake }], ['PUT', `/api/grupos/${idFake}`, { codigo: 'QA1', nome: 'QA' }], ['PATCH', `/api/grupos/${idFake}`, { ativo: false }],
    ['POST', '/api/subgrupos', { codigo: 'QA1', nome: 'QA', grupoId: idFake }], ['PUT', `/api/subgrupos/${idFake}`, { codigo: 'QA1', nome: 'QA' }], ['PATCH', `/api/subgrupos/${idFake}`, { ativo: false }],
    ['POST', '/api/usuarios', { name: 'QA QA', email: 'qa@qa.com', password: 'Qa@12345', perfil: 'CONSULTA' }], ['PUT', `/api/usuarios/${idFake}`, { ativo: false }],
  ]
  const rotasGestor: Rota[] = [
    ['POST', '/api/materiais', base], ['PUT', `/api/materiais/${idFake}`, base], ['PATCH', `/api/materiais/${idFake}/status`, { status: 'INATIVO', motivo: 'QA' }],
  ]
  await teste('Autorização: anônimo recebe 401 em todas as rotas de escrita (14 rotas)', async () => {
    for (const [m, p, b] of [...rotasAdmin, ...rotasGestor]) {
      const r = await api(null, m, p, b)
      esperar(r.status === 401, `${m} ${p} retornou ${r.status}`)
    }
  })
  await teste('Autorização: perfil Consulta recebe 403 em todas as rotas de escrita (14 rotas)', async () => {
    for (const [m, p, b] of [...rotasAdmin, ...rotasGestor]) {
      const r = await api(consulta, m, p, b)
      esperar(r.status === 403, `${m} ${p} retornou ${r.status}`)
    }
  })
  await teste('Autorização: perfil Gestor recebe 403 em classificações e usuários (11 rotas) e passa da autorização em materiais', async () => {
    for (const [m, p, b] of rotasAdmin) {
      const r = await api(gestor, m, p, b)
      esperar(r.status === 403, `${m} ${p} retornou ${r.status}`)
    }
    for (const [m, p, b] of rotasGestor.slice(1)) {
      const r = await api(gestor, m, p, b)
      esperar(r.status === 404, `${m} ${p} (id inexistente) deveria passar da autorização e retornar 404, obteve ${r.status}`)
    }
  })
  await teste('Autorização: exclusão física é bloqueada para o administrador em todas as entidades (405)', async () => {
    for (const p of [`/api/materiais/${materialId}`, `/api/familias/${famTesteId}`, `/api/grupos/${grpTesteId}`, `/api/subgrupos/${subTesteId}`, `/api/usuarios/${novoUsuarioId}`]) {
      const r = await api(admin, 'DELETE', p)
      esperar(r.status === 405, `DELETE ${p} retornou ${r.status}`)
    }
  })

  // ---------- 9. QA incremental: trilha de auditoria ----------
  const adminDb = await prisma.user.findUnique({ where: { email: 'admin@materialmaster.com.br' } })
  const gestorDb = await prisma.user.findUnique({ where: { email: 'gestor@materialmaster.com.br' } })
  await teste('Auditoria: inativação de material registra INATIVACAO com motivo e autor; reativação registra REATIVACAO', async () => {
    const r = await api(gestor, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'INATIVO', motivo: 'Motivo QA incremental' })
    esperar(r.status === 200, `Inativar: ${r.status}`)
    const inat = await prisma.auditLog.findFirst({ where: { entidade: 'Material', entidadeId: materialId, acao: 'INATIVACAO' }, orderBy: { createdAt: 'desc' } })
    esperar((inat?.detalhes as { motivo?: string })?.motivo === 'Motivo QA incremental', `Motivo não registrado: ${JSON.stringify(inat?.detalhes)}`)
    esperar(inat?.usuarioId === gestorDb?.id, 'Autor da inativação incorreto')
    const r2 = await api(admin, 'PATCH', `/api/materiais/${materialId}/status`, { status: 'ATIVO' })
    esperar(r2.status === 200, `Reativar: ${r2.status}`)
    const reat = await prisma.auditLog.findFirst({ where: { entidade: 'Material', entidadeId: materialId, acao: 'REATIVACAO' }, orderBy: { createdAt: 'desc' } })
    esperar(Boolean(reat) && reat!.usuarioId === adminDb?.id && reat!.createdAt > inat!.createdAt, 'REATIVACAO ausente ou fora de ordem')
    const hist = await api(consulta, 'GET', `/api/materiais/${materialId}`)
    const acoes = ((hist.json.historico ?? hist.json.auditoria ?? []) as Array<{ acao: string }>).map((h) => h.acao)
    esperar(acoes.includes('INATIVACAO') && acoes.includes('REATIVACAO'), `Histórico do material não expõe inativação/reativação: ${acoes.join(',')}`)
  })
  await teste('Auditoria: usuário tem CRIACAO, EDICAO (perfil), INATIVACAO e REATIVACAO com autor administrador', async () => {
    const r = await api(admin, 'PUT', `/api/usuarios/${novoUsuarioId}`, { ativo: true })
    esperar(r.status === 200, `Reativar usuário: ${r.status}`)
    const logs = await prisma.auditLog.findMany({ where: { entidade: 'User', entidadeId: novoUsuarioId }, orderBy: { createdAt: 'asc' } })
    const acoes = logs.map((l) => l.acao)
    esperar(acoes[0] === 'CRIACAO', `Primeira ação deveria ser CRIACAO: ${acoes.join(',')}`)
    esperar(acoes.includes('EDICAO') && acoes.includes('INATIVACAO') && acoes.includes('REATIVACAO'), `Ações: ${acoes.join(',')}`)
    // O evento LOGIN é registrado pelo próprio usuário autenticado; as demais ações administrativas pelo administrador.
    const loginLog = logs.find((l) => l.acao === 'LOGIN')
    esperar(Boolean(loginLog) && loginLog!.usuarioId === novoUsuarioId, 'LOGIN do novo usuário não registrado em seu nome')
    esperar(logs.filter((l) => l.acao !== 'LOGIN').every((l) => l.usuarioId === adminDb?.id), 'Autor das ações administrativas deveria ser o administrador')
    const edicao = logs.find((l) => l.acao === 'EDICAO')
    esperar((edicao?.detalhes as { perfil?: string })?.perfil === 'GESTOR_CADASTRO', 'EDICAO não registra o novo perfil')
    esperar(logs.every((l) => !JSON.stringify(l.detalhes ?? {}).match(/\$2[aby]\$/)), 'Trilha não pode conter hash de senha')
  })
  await teste('Auditoria: autocadastro registra CRIACAO com origem autocadastro', async () => {
    const u = await prisma.user.findUnique({ where: { email: `auto.${sufixo}@materialmaster.com.br` } })
    const log = await prisma.auditLog.findFirst({ where: { entidade: 'User', entidadeId: u?.id ?? '', acao: 'CRIACAO' } })
    esperar((log?.detalhes as { origem?: string })?.origem === 'autocadastro', `Detalhes: ${JSON.stringify(log?.detalhes)}`)
  })
  await teste('Auditoria: família/grupo/subgrupo têm CRIACAO, EDICAO (de/para), INATIVACAO e REATIVACAO', async () => {
    const rf = await api(admin, 'PUT', `/api/familias/${famTesteId}`, { codigo: `T${sufixo}`, nome: 'Família Teste Editada' })
    esperar(rf.status === 200, `Editar família: ${rf.status} ${JSON.stringify(rf.json)}`)
    const rg = await api(admin, 'PUT', `/api/grupos/${grpTesteId}`, { codigo: 'G1', nome: 'Grupo Teste Editado' })
    esperar(rg.status === 200, `Editar grupo: ${rg.status} ${JSON.stringify(rg.json)}`)
    const rs = await api(admin, 'PUT', `/api/subgrupos/${subTesteId}`, { codigo: 'S1', nome: 'Subgrupo Teste Editado' })
    esperar(rs.status === 200, `Editar subgrupo: ${rs.status} ${JSON.stringify(rs.json)}`)
    const si = await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: false })
    esperar(si.status === 200, `Inativar subgrupo sem uso: ${si.status} ${JSON.stringify(si.json)}`)
    const sr = await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: true })
    esperar(sr.status === 200, `Reativar subgrupo: ${sr.status}`)
    for (const [entidade, id, nomeNovo] of [['Familia', famTesteId, 'Família Teste Editada'], ['Grupo', grpTesteId, 'Grupo Teste Editado'], ['Subgrupo', subTesteId, 'Subgrupo Teste Editado']] as const) {
      const logs = await prisma.auditLog.findMany({ where: { entidade, entidadeId: id }, orderBy: { createdAt: 'asc' } })
      const acoes = logs.map((l) => l.acao)
      esperar(acoes[0] === 'CRIACAO' && acoes.includes('EDICAO') && acoes.includes('INATIVACAO') && acoes.includes('REATIVACAO'), `${entidade}: ${acoes.join(',')}`)
      const ed = logs.filter((l) => l.acao === 'EDICAO').at(-1)
      const det = ed?.detalhes as { de?: { nome: string }; para?: { nome: string } }
      esperar(det?.para?.nome === nomeNovo && Boolean(det?.de?.nome) && det.de!.nome !== nomeNovo, `${entidade}: EDICAO sem de/para: ${JSON.stringify(det)}`)
      esperar(logs.every((l) => l.usuarioId === adminDb?.id), `${entidade}: autor incorreto`)
    }
  })

  // ---------- 10. QA incremental: pesquisa por grupo/subgrupo e busca vazia ----------
  await teste('Pesquisa: filtro por grupoId retorna apenas materiais do grupo e total coerente com o banco', async () => {
    const r = await api(consulta, 'GET', `/api/materiais?grupoId=${grp?.id}&pageSize=100`)
    const itens = r.json.itens as Array<{ grupoId: string }>
    const esperado = await prisma.material.count({ where: { grupoId: grp?.id } })
    esperar(r.status === 200 && itens.length > 0 && itens.every((i) => i.grupoId === grp?.id), 'Itens fora do grupo')
    esperar(Number(r.json.total) === esperado && itens.length === esperado, `total=${r.json.total} itens=${itens.length} banco=${esperado}`)
  })
  await teste('Pesquisa: filtro por subgrupoId e combinação subgrupo + texto', async () => {
    const r = await api(consulta, 'GET', `/api/materiais?subgrupoId=${sub?.id}&pageSize=100`)
    const itens = r.json.itens as Array<{ subgrupoId: string; id: string }>
    const esperado = await prisma.material.count({ where: { subgrupoId: sub?.id } })
    esperar(r.status === 200 && itens.every((i) => i.subgrupoId === sub?.id) && itens.length === esperado, `itens=${itens.length} banco=${esperado}`)
    const r2 = await api(consulta, 'GET', `/api/materiais?subgrupoId=${sub?.id}&q=${encodeURIComponent('teste automatizado')}`)
    const itens2 = r2.json.itens as Array<{ subgrupoId: string; id: string }>
    esperar(itens2.some((i) => i.id === materialId) && itens2.every((i) => i.subgrupoId === sub?.id), 'Combinação subgrupo + texto incorreta')
  })
  await teste('Pesquisa: grupo de outra família combinado com familiaId incompatível retorna vazio (sem erro)', async () => {
    const r = await api(consulta, 'GET', `/api/materiais?familiaId=${famOutra?.id}&grupoId=${grp?.id}`)
    esperar(r.status === 200 && (r.json.itens as unknown[]).length === 0 && Number(r.json.total) === 0, `${r.status} total=${r.json.total}`)
  })
  await teste('Pesquisa: busca sem resultados retorna 200, itens=[], total=0 e totalPaginas=1', async () => {
    const r = await api(consulta, 'GET', `/api/materiais?q=${encodeURIComponent('zzz-inexistente-' + sufixo)}`)
    esperar(r.status === 200, `Status ${r.status}`)
    esperar(Array.isArray(r.json.itens) && (r.json.itens as unknown[]).length === 0, 'itens deveria ser vazio')
    esperar(Number(r.json.total) === 0 && Number(r.json.totalPaginas) === 1, `total=${r.json.total} totalPaginas=${r.json.totalPaginas}`)
    const p = await pagina(consulta, `/materiais?q=${encodeURIComponent('zzz-inexistente-' + sufixo)}`)
    esperar(p.status === 200, `Página de materiais com busca vazia: ${p.status}`)
  })
  await teste('Pesquisa: página além do total e pageSize fora da faixa são normalizados (sem erro 500)', async () => {
    const r = await api(consulta, 'GET', '/api/materiais?page=9999&pageSize=1000')
    esperar(r.status === 200 && Number(r.json.pageSize) <= 100 && Array.isArray(r.json.itens), `${r.status} pageSize=${r.json.pageSize}`)
    const r2 = await api(consulta, 'GET', '/api/materiais?page=-1&pageSize=0')
    esperar(r2.status === 200 && Number(r2.json.page) >= 1 && Number(r2.json.pageSize) >= 5, `${r2.status} page=${r2.json.page} pageSize=${r2.json.pageSize}`)
  })

  // ---------- 11. QA incremental: integridade de grupos e subgrupos ----------
  let materialHierId = ''
  await teste('Integridade: subgrupo com material ativo exige confirmação para inativar (409) e inativa com confirmar=true', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { ...base, descricaoCurta: 'Material QA hierarquia', familiaId: famTesteId, grupoId: grpTesteId, subgrupoId: subTesteId })
    esperar(r.status === 201, `Criar material na hierarquia de teste: ${r.status} ${JSON.stringify(r.json)}`)
    materialHierId = (r.json.material as { id: string }).id
    const semConf = await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: false })
    esperar(semConf.status === 409 && semConf.json.requerConfirmacao === true, `Esperado 409 requerConfirmacao, obtido ${semConf.status} ${JSON.stringify(semConf.json)}`)
    const comConf = await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: false, confirmar: true })
    esperar(comConf.status === 200 && (comConf.json.subgrupo as { ativo: boolean }).ativo === false, `Com confirmação: ${comConf.status}`)
    const m = await prisma.material.findUnique({ where: { id: materialHierId } })
    esperar(m?.status === 'ATIVO', 'Inativar subgrupo não deve alterar o status do material existente')
  })
  await teste('Integridade: subgrupo inativo é rejeitado em novo material e na edição de material existente', async () => {
    const r = await api(gestor, 'POST', '/api/materiais', { ...base, familiaId: famTesteId, grupoId: grpTesteId, subgrupoId: subTesteId })
    esperar(r.status === 400 && String(r.json.erro).includes('inativo'), `Novo: ${r.status} ${JSON.stringify(r.json)}`)
    const r2 = await api(gestor, 'PUT', `/api/materiais/${materialHierId}`, { ...base, descricaoCurta: 'Material QA hierarquia editado', familiaId: famTesteId, grupoId: grpTesteId, subgrupoId: subTesteId })
    esperar(r2.status === 400 && String(r2.json.erro).includes('inativo'), `Edição: ${r2.status} ${JSON.stringify(r2.json)}`)
  })
  await teste('Integridade: grupo com subgrupo/material exige confirmação (409); subgrupo não reativa com grupo inativo (409)', async () => {
    await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: true })
    const semConf = await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: false })
    esperar(semConf.status === 409 && semConf.json.requerConfirmacao === true, `Grupo sem confirmação: ${semConf.status}`)
    const emUso = semConf.json.emUso as { subgrupos: number; materiais: number }
    esperar(emUso?.subgrupos >= 1 && emUso?.materiais >= 1, `Contagem em uso incorreta: ${JSON.stringify(emUso)}`)
    const comConf = await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: false, confirmar: true })
    esperar(comConf.status === 200, `Grupo com confirmação: ${comConf.status}`)
    await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: false, confirmar: true })
    const reat = await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: true })
    esperar(reat.status === 409 && String(reat.json.erro).includes('grupo pai'), `Reativar subgrupo com grupo inativo: ${reat.status} ${JSON.stringify(reat.json)}`)
    const novo = await api(gestor, 'POST', '/api/materiais', { ...base, familiaId: famTesteId, grupoId: grpTesteId, subgrupoId: subTesteId })
    esperar(novo.status === 400 && String(novo.json.erro).includes('grupo selecionado está inativo'), `Grupo inativo em novo material: ${novo.status} ${JSON.stringify(novo.json)}`)
    esperar((await api(admin, 'PATCH', `/api/grupos/${grpTesteId}`, { ativo: true })).status === 200, 'Reativar grupo')
    esperar((await api(admin, 'PATCH', `/api/subgrupos/${subTesteId}`, { ativo: true })).status === 200, 'Reativar subgrupo')
  })
  await teste('Integridade: subgrupo com materiais não pode ser movido para outro grupo (409); vazio pode', async () => {
    const r = await api(admin, 'PUT', `/api/subgrupos/${subTesteId}`, { codigo: 'S1', nome: 'Subgrupo Teste Editado', grupoId: grp?.id })
    esperar(r.status === 409, `Mover subgrupo com material: ${r.status} ${JSON.stringify(r.json)}`)
    const g2 = await api(admin, 'POST', '/api/grupos', { codigo: 'G2', nome: 'Grupo Teste 2', familiaId: famTesteId })
    esperar(g2.status === 201, `Criar G2: ${g2.status}`)
    const g2Id = (g2.json.grupo as { id: string }).id
    const s2 = await api(admin, 'POST', '/api/subgrupos', { codigo: 'S2', nome: 'Subgrupo Vazio', grupoId: grpTesteId })
    esperar(s2.status === 201, `Criar S2: ${s2.status}`)
    const s2Id = (s2.json.subgrupo as { id: string }).id
    const mv = await api(admin, 'PUT', `/api/subgrupos/${s2Id}`, { codigo: 'S2', nome: 'Subgrupo Vazio', grupoId: g2Id })
    esperar(mv.status === 200 && (mv.json.subgrupo as { grupoId: string }).grupoId === g2Id, `Mover subgrupo vazio: ${mv.status} ${JSON.stringify(mv.json)}`)
    const mvInv = await api(admin, 'PUT', `/api/subgrupos/${s2Id}`, { codigo: 'S2', nome: 'Subgrupo Vazio', grupoId: idFake })
    esperar(mvInv.status === 400 || mvInv.status === 404, `Mover para grupo inexistente: ${mvInv.status}`)
  })
  await teste('Integridade: código de grupo/subgrupo é único apenas dentro do pai (409 no mesmo pai, 201 em pai diferente)', async () => {
    const dup = await api(admin, 'POST', '/api/grupos', { codigo: 'g1', nome: 'Duplicado', familiaId: famTesteId })
    esperar(dup.status === 409, `Grupo duplicado na mesma família: ${dup.status}`)
    const outro = await api(admin, 'POST', '/api/grupos', { codigo: 'G1', nome: 'Mesmo código em outra família', familiaId: famOutra?.id })
    esperar(outro.status === 201 || outro.status === 409, `Grupo em outra família: ${outro.status}`)
    if (outro.status === 201) {
      const g = outro.json.grupo as { id: string; codigo: string }
      esperar(g.codigo === 'G1', 'Código não normalizado')
      await api(admin, 'PATCH', `/api/grupos/${g.id}`, { ativo: false, confirmar: true })
    }
    const dupS = await api(admin, 'POST', '/api/subgrupos', { codigo: 's1', nome: 'Duplicado', grupoId: grpTesteId })
    esperar(dupS.status === 409, `Subgrupo duplicado no mesmo grupo: ${dupS.status}`)
  })

  const ok = resultados.filter((r) => r.ok).length
  const falhas = resultados.filter((r) => !r.ok)
  console.log(`\n=== Resultado: ${ok}/${resultados.length} testes aprovados ===`)
  if (falhas.length) {
    console.log('Falhas:')
    for (const f of falhas) console.log(` - ${f.nome}: ${f.detalhe}`)
  }
  await prisma.$disconnect()
  process.exit(falhas.length ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
