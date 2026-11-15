# MATERIAL MASTER

Sistema web de gestão, padronização e governança de cadastros de materiais (MVP acadêmico — Projeto Integrador Transdisciplinar em Engenharia de Software II, Cruzeiro do Sul Virtual).

## Escopo do MVP

- Autenticação por e-mail e senha e controle de acesso por perfil (ADMINISTRADOR, GESTOR_CADASTRO, CONSULTA).
- Cadastro, consulta, edição e inativação lógica de materiais, com código sequencial imutável (`MAT-000001`).
- Hierarquia de classificação Família → Grupo → Subgrupo e unidades de medida.
- Administração de usuários e trilha de auditoria (histórico de alterações).
- Interface responsiva em português do Brasil.

Não fazem parte desta versão: dashboard com indicadores, fluxo de solicitações/aprovações, detecção de duplicidades e exportação CSV.

## Requisitos

- Node.js 20 ou superior e Yarn 4 (via `corepack enable`).
- PostgreSQL 14 ou superior.
- Python 3.10+ com Playwright (apenas para os testes E2E).

## Instalação a partir de uma cópia limpa

```bash
cd nextjs_space
cp .env.example .env            # edite DATABASE_URL, NEXTAUTH_SECRET e AUTH_SECRET
yarn install
yarn prisma generate
yarn prisma db push              # cria as tabelas no banco indicado em DATABASE_URL
yarn prisma db seed              # unidades, hierarquia, materiais de exemplo e contas de demonstração
yarn dev                         # http://localhost:3000
```

Gere os segredos com `openssl rand -base64 32` (um valor por ambiente; `AUTH_SECRET` e `NEXTAUTH_SECRET` iguais).

## Contas de demonstração

| Perfil | E-mail | Senha em desenvolvimento |
|---|---|---|
| Administrador | admin@materialmaster.com.br | `Admin@123` |
| Gestor de cadastro | gestor@materialmaster.com.br | `Gestor@123` |
| Consulta | consulta@materialmaster.com.br | `Consulta@123` |

As senhas acima são aplicadas pelo seed **somente em desenvolvimento**. Em produção (`NODE_ENV=production`) ou com `SEED_SENHAS_ALEATORIAS=true`, o seed usa as variáveis `SEED_SENHA_ADMIN`, `SEED_SENHA_GESTOR` e `SEED_SENHA_CONSULTA` ou gera senhas aleatórias exibidas uma única vez no console. Veja `nextjs_space/.env.example`.

## Verificação e testes

```bash
cd nextjs_space
yarn tsc --noEmit                                               # checagem de tipos
yarn build                                                      # build de produção
yarn tsx --require dotenv/config scripts/testes-integracao.ts   # 29 testes (servidor em execução)
python3 scripts/testes-e2e.py                                   # 10 fluxos de navegador (Playwright)
```

Use `TEST_BASE=http://host:porta` quando o servidor não estiver em `http://localhost:3000`.

## Estrutura

```
nextjs_space/
  app/            páginas e rotas de API (controladores)
  components/     componentes de interface (visão)
  lib/            regras de domínio, validações, autorização e auditoria (modelo/serviços)
  prisma/         esquema do banco de dados
  scripts/        seed e testes automatizados
```

## Segurança

- Nunca versione o arquivo `.env`; use `.env.example` como modelo.
- Exclusão física de registros é bloqueada (HTTP 405); a inativação é lógica, com motivo obrigatório e auditoria.
- O autocadastro público cria apenas usuários com perfil CONSULTA; perfis superiores são atribuídos por um administrador.
