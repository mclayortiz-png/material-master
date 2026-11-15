import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// ----- Política de senhas das contas de demonstração -----
// Em desenvolvimento, as contas usam as senhas padrão documentadas (Admin@123 etc.).
// Em produção (NODE_ENV=production) ou quando SEED_SENHAS_ALEATORIAS=true, as senhas
// padrão NUNCA são aplicadas: usa-se o valor de SEED_SENHA_ADMIN / SEED_SENHA_GESTOR /
// SEED_SENHA_CONSULTA ou, na ausência, uma senha aleatória exibida uma única vez no console.
const AMBIENTE_PRODUCAO =
  process.env.NODE_ENV === 'production' || process.env.SEED_SENHAS_ALEATORIAS === 'true'
// Em produção as senhas de usuários já existentes não são sobrescritas pelo seed,
// salvo se SEED_ATUALIZAR_SENHAS=true.
const ATUALIZAR_SENHAS = !AMBIENTE_PRODUCAO || process.env.SEED_ATUALIZAR_SENHAS === 'true'
const senhasGeradas: Array<[string, string]> = []

function senhaSeed(variavel: string, padraoDev: string, rotulo: string): string {
  const valor = process.env[variavel]
  if (valor && valor.length >= 8) return valor
  if (AMBIENTE_PRODUCAO) {
    const gerada = randomBytes(12).toString('base64url')
    senhasGeradas.push([rotulo, gerada])
    return gerada
  }
  return padraoDev
}

async function main() {
  // ----- Usuários -----
  const usuarios = [
    { name: 'Ana Administradora', email: 'admin@materialmaster.com.br', password: senhaSeed('SEED_SENHA_ADMIN', 'Admin@123', 'admin@materialmaster.com.br'), perfil: 'ADMINISTRADOR' as const },
    { name: 'Gustavo Gestor', email: 'gestor@materialmaster.com.br', password: senhaSeed('SEED_SENHA_GESTOR', 'Gestor@123', 'gestor@materialmaster.com.br'), perfil: 'GESTOR_CADASTRO' as const },
    { name: 'Carla Consulta', email: 'consulta@materialmaster.com.br', password: senhaSeed('SEED_SENHA_CONSULTA', 'Consulta@123', 'consulta@materialmaster.com.br'), perfil: 'CONSULTA' as const },
  ]
  const usuariosCriados: Record<string, string> = {}
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10)
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, perfil: u.perfil, ativo: true, ...(ATUALIZAR_SENHAS ? { password: hash } : {}) },
      create: { name: u.name, email: u.email, password: hash, perfil: u.perfil },
    })
    usuariosCriados[u.perfil] = row.id
  }
  const adminId = usuariosCriados['ADMINISTRADOR']
  const gestorId = usuariosCriados['GESTOR_CADASTRO']

  // ----- Unidades de medida -----
  const unidades = [
    ['UN', 'Unidade'], ['PC', 'Peça'], ['M', 'Metro'], ['KG', 'Quilograma'], ['L', 'Litro'],
    ['CX', 'Caixa'], ['PAR', 'Par'], ['RL', 'Rolo'], ['JG', 'Jogo'], ['GL', 'Galão'],
  ]
  const um: Record<string, string> = {}
  for (const [sigla, nome] of unidades) {
    const r = await prisma.unidadeMedida.upsert({ where: { sigla }, update: { nome }, create: { sigla, nome } })
    um[sigla] = r.id
  }

  // ----- Hierarquia -----
  type Sub = { codigo: string; nome: string }
  type Grp = { codigo: string; nome: string; subgrupos: Sub[] }
  type Fam = { codigo: string; nome: string; grupos: Grp[] }
  const hierarquia: Fam[] = [
    { codigo: 'ELE', nome: 'Elétricos', grupos: [
      { codigo: 'CAB', nome: 'Cabos e Fios', subgrupos: [{ codigo: 'FLX', nome: 'Cabo Flexível' }, { codigo: 'RIG', nome: 'Cabo Rígido' }] },
      { codigo: 'DIS', nome: 'Disjuntores e Proteção', subgrupos: [{ codigo: 'MON', nome: 'Disjuntor Monopolar' }, { codigo: 'TRI', nome: 'Disjuntor Tripolar' }] },
      { codigo: 'ILU', nome: 'Iluminação', subgrupos: [{ codigo: 'LED', nome: 'Lâmpadas LED' }, { codigo: 'LUM', nome: 'Luminárias' }] },
    ] },
    { codigo: 'MEC', nome: 'Mecânicos', grupos: [
      { codigo: 'ROL', nome: 'Rolamentos', subgrupos: [{ codigo: 'ESF', nome: 'Rolamento de Esferas' }, { codigo: 'ROLO', nome: 'Rolamento de Rolos' }] },
      { codigo: 'FIX', nome: 'Fixação', subgrupos: [{ codigo: 'PAR', nome: 'Parafusos' }, { codigo: 'POR', nome: 'Porcas e Arruelas' }] },
      { codigo: 'COR', nome: 'Correias e Transmissão', subgrupos: [{ codigo: 'CRV', nome: 'Correia em V' }, { codigo: 'CRD', nome: 'Correia Dentada' }] },
    ] },
    { codigo: 'HID', nome: 'Hidráulicos', grupos: [
      { codigo: 'TUB', nome: 'Tubos e Conexões', subgrupos: [{ codigo: 'PVC', nome: 'PVC' }, { codigo: 'ACO', nome: 'Aço Carbono' }] },
      { codigo: 'VAL', nome: 'Válvulas', subgrupos: [{ codigo: 'ESF', nome: 'Válvula Esfera' }, { codigo: 'GAV', nome: 'Válvula Gaveta' }] },
    ] },
    { codigo: 'EPI', nome: 'EPIs', grupos: [
      { codigo: 'CAB', nome: 'Proteção da Cabeça', subgrupos: [{ codigo: 'CAP', nome: 'Capacetes' }, { codigo: 'OCU', nome: 'Óculos de Proteção' }] },
      { codigo: 'MAO', nome: 'Proteção das Mãos', subgrupos: [{ codigo: 'LUV', nome: 'Luvas' }] },
      { codigo: 'PES', nome: 'Proteção dos Pés', subgrupos: [{ codigo: 'BOT', nome: 'Botinas' }] },
    ] },
    { codigo: 'LUB', nome: 'Lubrificantes e Químicos', grupos: [
      { codigo: 'OLE', nome: 'Óleos', subgrupos: [{ codigo: 'HID', nome: 'Óleo Hidráulico' }, { codigo: 'MOT', nome: 'Óleo de Motor' }] },
      { codigo: 'GRX', nome: 'Graxas', subgrupos: [{ codigo: 'LIT', nome: 'Graxa de Lítio' }] },
    ] },
  ]

  const ids: Record<string, { fam: string; grp: string; sub: string }> = {}
  for (const f of hierarquia) {
    const fam = await prisma.familia.upsert({ where: { codigo: f.codigo }, update: { nome: f.nome }, create: { codigo: f.codigo, nome: f.nome } })
    for (const g of f.grupos) {
      const grp = await prisma.grupo.upsert({
        where: { familiaId_codigo: { familiaId: fam.id, codigo: g.codigo } },
        update: { nome: g.nome },
        create: { codigo: g.codigo, nome: g.nome, familiaId: fam.id },
      })
      for (const s of g.subgrupos) {
        const sub = await prisma.subgrupo.upsert({
          where: { grupoId_codigo: { grupoId: grp.id, codigo: s.codigo } },
          update: { nome: s.nome },
          create: { codigo: s.codigo, nome: s.nome, grupoId: grp.id },
        })
        ids[`${f.codigo}.${g.codigo}.${s.codigo}`] = { fam: fam.id, grp: grp.id, sub: sub.id }
      }
    }
  }

  // ----- Materiais de exemplo -----
  type Mat = { key: string; descricaoCurta: string; descricaoLonga: string; um: string; fabricante?: string; partNumber?: string; ncm?: string; inativo?: boolean }
  const materiais: Mat[] = [
    { key: 'ELE.CAB.FLX', descricaoCurta: 'Cabo flexível 2,5 mm² 750V azul', descricaoLonga: 'Cabo flexível de cobre, seção 2,5 mm², isolação PVC 750V, cor azul, rolo de 100 m. Norma NBR NM 247-3.', um: 'RL', fabricante: 'Prysmian', partNumber: 'FLX-25-AZ', ncm: '85444900' },
    { key: 'ELE.CAB.FLX', descricaoCurta: 'Cabo flexível 4 mm² 750V preto', descricaoLonga: 'Cabo flexível de cobre, seção 4 mm², isolação PVC 750V, cor preta, rolo de 100 m.', um: 'RL', fabricante: 'Sil', partNumber: 'FLX-4-PT', ncm: '85444900' },
    { key: 'ELE.DIS.MON', descricaoCurta: 'Disjuntor monopolar 20A curva C', descricaoLonga: 'Disjuntor termomagnético monopolar 20A, curva C, 3kA, padrão DIN.', um: 'UN', fabricante: 'Siemens', partNumber: '5SX1120-7', ncm: '85362000' },
    { key: 'ELE.DIS.TRI', descricaoCurta: 'Disjuntor tripolar 63A curva C', descricaoLonga: 'Disjuntor termomagnético tripolar 63A, curva C, 6kA, padrão DIN.', um: 'UN', fabricante: 'Schneider', partNumber: 'A9F74363', ncm: '85362000' },
    { key: 'ELE.ILU.LED', descricaoCurta: 'Lâmpada LED bulbo 9W bivolt 6500K', descricaoLonga: 'Lâmpada LED bulbo A60, 9W, bivolt, 6500K (branco frio), base E27, 806 lm.', um: 'UN', fabricante: 'Philips', partNumber: 'LED-A60-9W', ncm: '85395200' },
    { key: 'ELE.ILU.LUM', descricaoCurta: 'Luminária LED industrial high bay 150W', descricaoLonga: 'Luminária LED tipo high bay 150W, 5000K, IP65, para galpões industriais.', um: 'UN', fabricante: 'Intral', partNumber: 'HB-150', ncm: '94054900' },
    { key: 'MEC.ROL.ESF', descricaoCurta: 'Rolamento rígido de esferas 6205-2RS', descricaoLonga: 'Rolamento rígido de uma carreira de esferas 6205-2RS, 25x52x15 mm, vedação dupla de borracha.', um: 'PC', fabricante: 'SKF', partNumber: '6205-2RS1', ncm: '84821010' },
    { key: 'MEC.ROL.ESF', descricaoCurta: 'Rolamento rígido de esferas 6305-ZZ', descricaoLonga: 'Rolamento rígido de esferas 6305-ZZ, 25x62x17 mm, blindagem metálica.', um: 'PC', fabricante: 'NSK', partNumber: '6305ZZ', ncm: '84821010' },
    { key: 'MEC.ROL.ROLO', descricaoCurta: 'Rolamento de rolos cônicos 30205', descricaoLonga: 'Rolamento de rolos cônicos 30205, 25x52x16,25 mm.', um: 'PC', fabricante: 'Timken', partNumber: '30205', ncm: '84822010' },
    { key: 'MEC.FIX.PAR', descricaoCurta: 'Parafuso sextavado M10x40 classe 8.8 zincado', descricaoLonga: 'Parafuso sextavado rosca total M10 x 40 mm, classe 8.8, acabamento zincado branco, DIN 933.', um: 'PC', fabricante: 'Ciser', partNumber: 'SX-M10X40-88', ncm: '73181500' },
    { key: 'MEC.FIX.POR', descricaoCurta: 'Porca sextavada M10 classe 8 zincada', descricaoLonga: 'Porca sextavada M10, classe 8, zincada, DIN 934.', um: 'PC', fabricante: 'Ciser', partNumber: 'PS-M10-8', ncm: '73181600' },
    { key: 'MEC.COR.CRV', descricaoCurta: 'Correia em V perfil A-42', descricaoLonga: 'Correia em V clássica, perfil A, comprimento 42 polegadas.', um: 'PC', fabricante: 'Gates', partNumber: 'A42', ncm: '40103400' },
    { key: 'HID.TUB.PVC', descricaoCurta: 'Tubo PVC soldável 50 mm 6 m', descricaoLonga: 'Tubo PVC soldável marrom para água fria, DN 50 mm, barra de 6 m, NBR 5648.', um: 'PC', fabricante: 'Tigre', partNumber: '10121102', ncm: '39172300' },
    { key: 'HID.TUB.ACO', descricaoCurta: 'Tubo aço carbono SCH40 2" 6 m', descricaoLonga: 'Tubo de aço carbono sem costura, ASTM A106 Gr. B, SCH 40, diâmetro 2", barra de 6 m.', um: 'PC', fabricante: 'Vallourec', partNumber: 'A106-2-S40', ncm: '73041900' },
    { key: 'HID.VAL.ESF', descricaoCurta: 'Válvula esfera latão 1" passagem plena', descricaoLonga: 'Válvula de esfera em latão, 1" BSP, passagem plena, classe 400 WOG, alavanca em aço.', um: 'UN', fabricante: 'Deca', partNumber: 'VE-1-PP', ncm: '84818092' },
    { key: 'HID.VAL.GAV', descricaoCurta: 'Válvula gaveta ferro fundido 3" flangeada', descricaoLonga: 'Válvula gaveta em ferro fundido, 3", extremidades flangeadas ANSI 125, haste ascendente.', um: 'UN', fabricante: 'Niagara', partNumber: 'VG-3-FL', ncm: '84818091' },
    { key: 'EPI.CAB.CAP', descricaoCurta: 'Capacete de segurança classe B branco', descricaoLonga: 'Capacete de segurança aba frontal, classe B, cor branca, com carneira e jugular. CA 31469.', um: 'UN', fabricante: 'MSA', partNumber: 'V-GARD-BR', ncm: '65061000' },
    { key: 'EPI.CAB.OCU', descricaoCurta: 'Óculos de proteção incolor antiembaçante', descricaoLonga: 'Óculos de segurança com lente incolor em policarbonato, tratamento antiembaçante e antirrisco. CA 34082.', um: 'UN', fabricante: '3M', partNumber: 'VIRTUA-INC', ncm: '90049090' },
    { key: 'EPI.MAO.LUV', descricaoCurta: 'Luva de vaqueta cano curto tamanho G', descricaoLonga: 'Luva de segurança em vaqueta, cano curto, reforço na palma, tamanho G. CA 11263.', um: 'PAR', fabricante: 'Danny', partNumber: 'LV-VQ-G', ncm: '42032900' },
    { key: 'EPI.PES.BOT', descricaoCurta: 'Botina de segurança bico de aço nº 42', descricaoLonga: 'Botina de segurança em couro, bico de aço, solado PU bidensidade, elástico lateral, nº 42. CA 38215.', um: 'PAR', fabricante: 'Marluvas', partNumber: 'BT-50B26-42', ncm: '64039900' },
    { key: 'LUB.OLE.HID', descricaoCurta: 'Óleo hidráulico ISO VG 68 balde 20 L', descricaoLonga: 'óleo hidráulico mineral antidesgaste ISO VG 68, balde de 20 litros.', um: 'GL', fabricante: 'Shell', partNumber: 'TELLUS-S2-M68', ncm: '27101932' },
    { key: 'LUB.GRX.LIT', descricaoCurta: 'Graxa de lítio EP2 balde 20 kg', descricaoLonga: 'Graxa à base de sabão de lítio, NLGI 2, com aditivos EP, balde de 20 kg.', um: 'KG', fabricante: 'Mobil', partNumber: 'MOBILUX-EP2', ncm: '27101990' },
    { key: 'MEC.COR.CRD', descricaoCurta: 'Correia dentada HTD 8M-1200-30 (descontinuada)', descricaoLonga: 'Correia sincronizadora HTD perfil 8M, 1200 mm, largura 30 mm. Substituída por novo modelo.', um: 'PC', fabricante: 'Optibelt', partNumber: '8M-1200-30', ncm: '40103500', inativo: true },
  ]

  // Geração de códigos via sequência (mesma lógica da aplicação)
  const existentes = await prisma.material.count()
  if (existentes === 0) {
    for (let i = 0; i < materiais.length; i++) {
      const m = materiais[i]
      const h = ids[m.key]
      if (!h) continue
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO "CodigoSequencia" ("prefixo", "ultimo") VALUES ('MAT', 0) ON CONFLICT ("prefixo") DO NOTHING`
        const rows = await tx.$queryRaw<Array<{ ultimo: number }>>`UPDATE "CodigoSequencia" SET "ultimo" = "ultimo" + 1 WHERE "prefixo" = 'MAT' RETURNING "ultimo"`
        const codigo = `MAT-${String(Number(rows?.[0]?.ultimo ?? 0)).padStart(6, '0')}`
        const criadoPorId = i % 2 === 0 ? gestorId : adminId
        const mat = await tx.material.create({
          data: {
            codigo,
            descricaoCurta: m.descricaoCurta,
            descricaoLonga: m.descricaoLonga,
            unidadeMedidaId: um[m.um],
            familiaId: h.fam,
            grupoId: h.grp,
            subgrupoId: h.sub,
            fabricante: m.fabricante ?? null,
            partNumber: m.partNumber ?? null,
            ncm: m.ncm ?? null,
            status: m.inativo ? 'INATIVO' : 'ATIVO',
            criadoPorId,
          },
        })
        await tx.auditLog.create({ data: { entidade: 'Material', entidadeId: mat.id, acao: 'CRIACAO', usuarioId: criadoPorId, detalhes: { codigo, origem: 'seed' } } })
        if (m.inativo) {
          await tx.auditLog.create({ data: { entidade: 'Material', entidadeId: mat.id, acao: 'INATIVACAO', usuarioId: adminId, detalhes: { motivo: 'Item descontinuado', origem: 'seed' } } })
        }
      })
    }
    console.log(`Seed: ${materiais.length} materiais criados.`)
  } else {
    console.log(`Seed: ${existentes} materiais já existentes, nenhum material criado.`)
  }
  if (senhasGeradas.length > 0) {
    console.log('\nATENÇÃO: senhas geradas aleatoriamente para as contas de demonstração (exibidas UMA única vez):')
    for (const [email, senha] of senhasGeradas) console.log(`  ${email}  ->  ${senha}`)
    console.log('Guarde-as em local seguro ou defina SEED_SENHA_ADMIN / SEED_SENHA_GESTOR / SEED_SENHA_CONSULTA antes de rodar o seed.\n')
  }
  console.log('Seed concluído.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
