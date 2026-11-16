import { describe, it, expect } from 'vitest'
import { materialSchema, classificacaoSchema, grupoSchema, subgrupoSchema, usuarioSchema, usuarioEdicaoSchema } from '@/lib/validacoes'

const materialValido = {
  descricaoCurta: 'Rolamento rígido de esferas 6205',
  unidadeMedidaId: 'un1',
  familiaId: 'fam1',
  grupoId: 'grp1',
  subgrupoId: 'sub1',
}

function mensagens(result: { success: boolean; error?: { issues: Array<{ message: string }> } }) {
  return result.success ? [] : result.error!.issues.map((i) => i.message)
}

describe('materialSchema', () => {
  it('aceita material mínimo válido e normaliza opcionais vazios para null', () => {
    const r = materialSchema.safeParse({ ...materialValido, descricaoLonga: '', fabricante: '', ncm: '' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.descricaoLonga).toBeNull()
      expect(r.data.fabricante).toBeNull()
      expect(r.data.ncm).toBeNull()
    }
  })

  it('rejeita descrição curta com menos de 3 caracteres (mensagem em pt-BR)', () => {
    const r = materialSchema.safeParse({ ...materialValido, descricaoCurta: 'ab' })
    expect(r.success).toBe(false)
    expect(mensagens(r)).toContain('Descrição curta deve ter pelo menos 3 caracteres.')
  })

  it('rejeita descrição curta acima de 120 caracteres', () => {
    const r = materialSchema.safeParse({ ...materialValido, descricaoCurta: 'x'.repeat(121) })
    expect(r.success).toBe(false)
    expect(mensagens(r)).toContain('Descrição curta deve ter no máximo 120 caracteres.')
  })

  it('exige família, grupo, subgrupo e unidade de medida', () => {
    const r = materialSchema.safeParse({ descricaoCurta: 'Material teste' })
    expect(r.success).toBe(false)
    const m = mensagens(r)
    expect(m).toContain('Família é obrigatória.')
    expect(m).toContain('Grupo é obrigatório.')
    expect(m).toContain('Subgrupo é obrigatório.')
    expect(m).toContain('Unidade de medida é obrigatória.')
  })

  it('NCM: aceita 8 dígitos com máscara e remove a pontuação', () => {
    const r = materialSchema.safeParse({ ...materialValido, ncm: '8482.10.10' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.ncm).toBe('84821010')
  })

  it('NCM: rejeita quantidade de dígitos diferente de 8', () => {
    const r = materialSchema.safeParse({ ...materialValido, ncm: '1234567' })
    expect(r.success).toBe(false)
    expect(mensagens(r)).toContain('NCM deve conter exatamente 8 dígitos.')
  })

  it('aplica trim na descrição curta', () => {
    const r = materialSchema.safeParse({ ...materialValido, descricaoCurta: '   Parafuso M8   ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.descricaoCurta).toBe('Parafuso M8')
  })
})

describe('classificacaoSchema / grupoSchema / subgrupoSchema', () => {
  it('converte o código para maiúsculas', () => {
    const r = classificacaoSchema.safeParse({ codigo: 'mec', nome: 'Mecânica' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.codigo).toBe('MEC')
  })

  it('rejeita código com caracteres especiais ou espaços', () => {
    for (const codigo of ['ME-C', 'ME C', 'MÉC', 'M.C']) {
      const r = classificacaoSchema.safeParse({ codigo, nome: 'Mecânica' })
      expect(r.success, `código ${codigo}`).toBe(false)
      expect(mensagens(r)).toContain('Código deve conter apenas letras e números.')
    }
  })

  it('rejeita código com mais de 10 caracteres e código vazio', () => {
    expect(mensagens(classificacaoSchema.safeParse({ codigo: 'ABCDEFGHIJK', nome: 'Nome' }))).toContain('Código deve ter no máximo 10 caracteres.')
    expect(mensagens(classificacaoSchema.safeParse({ codigo: '', nome: 'Nome' }))).toContain('Código é obrigatório.')
  })

  it('rejeita nome com menos de 2 ou mais de 80 caracteres', () => {
    expect(mensagens(classificacaoSchema.safeParse({ codigo: 'A1', nome: 'x' }))).toContain('Nome deve ter pelo menos 2 caracteres.')
    expect(mensagens(classificacaoSchema.safeParse({ codigo: 'A1', nome: 'x'.repeat(81) }))).toContain('Nome deve ter no máximo 80 caracteres.')
  })

  it('grupo exige familiaId e subgrupo exige grupoId', () => {
    expect(mensagens(grupoSchema.safeParse({ codigo: 'ROL', nome: 'Rolamentos' }))).toContain('Família é obrigatória.')
    expect(mensagens(subgrupoSchema.safeParse({ codigo: 'ESF', nome: 'Esferas' }))).toContain('Grupo é obrigatório.')
    expect(grupoSchema.safeParse({ codigo: 'ROL', nome: 'Rolamentos', familiaId: 'f1' }).success).toBe(true)
    expect(subgrupoSchema.safeParse({ codigo: 'ESF', nome: 'Esferas', grupoId: 'g1' }).success).toBe(true)
  })
})

describe('usuarioSchema / usuarioEdicaoSchema', () => {
  it('normaliza e-mail para minúsculas e aceita perfil válido', () => {
    const r = usuarioSchema.safeParse({ name: 'Maria Silva', email: '  MARIA@Empresa.COM ', password: 'Senha@123', perfil: 'CONSULTA' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('maria@empresa.com')
  })

  it('rejeita e-mail inválido, senha curta e perfil desconhecido', () => {
    const r = usuarioSchema.safeParse({ name: 'Maria Silva', email: 'nao-e-email', password: '123', perfil: 'ROOT' })
    expect(r.success).toBe(false)
    const m = mensagens(r)
    expect(m).toContain('Informe um e-mail válido.')
    expect(m).toContain('A senha deve ter pelo menos 6 caracteres.')
    expect(m).toContain('Perfil inválido.')
  })

  it('edição: todos os campos opcionais; senha vazia é aceita (não altera)', () => {
    expect(usuarioEdicaoSchema.safeParse({}).success).toBe(true)
    expect(usuarioEdicaoSchema.safeParse({ password: '' }).success).toBe(true)
    expect(usuarioEdicaoSchema.safeParse({ password: '12' }).success).toBe(false)
    expect(usuarioEdicaoSchema.safeParse({ ativo: 'sim' }).success).toBe(false)
  })
})
