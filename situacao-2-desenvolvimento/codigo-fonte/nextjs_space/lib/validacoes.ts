import { z } from 'zod'

const texto = (min: number, max: number, campo: string) =>
  z
    .string({ error: `${campo} é obrigatório.` })
    .trim()
    .min(min, `${campo} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${campo} deve ter no máximo ${max} caracteres.`)

const opcional = (max: number, campo: string) =>
  z.string().trim().max(max, `${campo} deve ter no máximo ${max} caracteres.`).optional().or(z.literal('')).transform((v) => (v ? v : null))

export const materialSchema = z.object({
  descricaoCurta: texto(3, 120, 'Descrição curta'),
  descricaoLonga: opcional(2000, 'Descrição longa'),
  unidadeMedidaId: z.string({ error: 'Unidade de medida é obrigatória.' }).min(1, 'Unidade de medida é obrigatória.'),
  familiaId: z.string({ error: 'Família é obrigatória.' }).min(1, 'Família é obrigatória.'),
  grupoId: z.string({ error: 'Grupo é obrigatório.' }).min(1, 'Grupo é obrigatório.'),
  subgrupoId: z.string({ error: 'Subgrupo é obrigatório.' }).min(1, 'Subgrupo é obrigatório.'),
  fabricante: opcional(120, 'Fabricante'),
  partNumber: opcional(80, 'Part number / referência'),
  ncm: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v.replace(/\D/g, '') : ''))
    .refine((v) => v === '' || v.length === 8, 'NCM deve conter exatamente 8 dígitos.')
    .transform((v) => (v ? v : null)),
})
export type MaterialInput = z.infer<typeof materialSchema>

export const classificacaoSchema = z.object({
  codigo: z
    .string({ error: 'Código é obrigatório.' })
    .trim()
    .min(1, 'Código é obrigatório.')
    .max(10, 'Código deve ter no máximo 10 caracteres.')
    .regex(/^[A-Za-z0-9]+$/, 'Código deve conter apenas letras e números.')
    .transform((v) => v.toUpperCase()),
  nome: texto(2, 80, 'Nome'),
  ativo: z.boolean().optional(),
})

export const grupoSchema = classificacaoSchema.extend({
  familiaId: z.string({ error: 'Família é obrigatória.' }).min(1, 'Família é obrigatória.'),
})
export const subgrupoSchema = classificacaoSchema.extend({
  grupoId: z.string({ error: 'Grupo é obrigatório.' }).min(1, 'Grupo é obrigatório.'),
})

// bcrypt considera apenas os primeiros 72 bytes, incluindo caracteres UTF-8.
const senhaSchema = z
  .string({ error: 'Senha é obrigatória.' })
  .min(6, 'A senha deve ter pelo menos 6 caracteres.')
  .refine((senha) => senha.length <= 72 && new TextEncoder().encode(senha).length <= 72, 'A senha deve ter no máximo 72 bytes em UTF-8.')

export const usuarioSchema = z.object({
  name: texto(3, 100, 'Nome'),
  email: z.string({ error: 'E-mail é obrigatório.' }).trim().toLowerCase().max(254, 'E-mail muito longo.').email('Informe um e-mail válido.'),
  password: senhaSchema,
  perfil: z.enum(['ADMINISTRADOR', 'GESTOR_CADASTRO', 'CONSULTA'], { error: 'Perfil inválido.' }),
})

export const usuarioEdicaoSchema = z.object({
  name: texto(3, 100, 'Nome').optional(),
  perfil: z.enum(['ADMINISTRADOR', 'GESTOR_CADASTRO', 'CONSULTA'], { error: 'Perfil inválido.' }).optional(),
  ativo: z.boolean().optional(),
  password: senhaSchema.optional().or(z.literal('')),
})
