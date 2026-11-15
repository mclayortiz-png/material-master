# Configuração do deploy de demonstração — MATERIAL MASTER

> **Estado: preparado, NÃO publicado.** Nenhum deploy foi executado. A publicação só ocorrerá mediante autorização expressa do autor do projeto.

## Objetivo
Disponibilizar um ambiente público para os cinco testadores da Situação 3, com **banco de dados isolado** do ambiente de desenvolvimento e **credenciais seguras** (nenhuma senha padrão documentada válida em produção).

## Opção A — Publicação pela plataforma Abacus.AI (recomendada para a demonstração)

| Passo | Ação | Responsável |
|---|---|---|
| 1 | No painel do app, **Configurações → Banco de dados → “Adicionar um banco de produção”**. Isso separa o banco de produção do banco de desenvolvimento (recurso avançado: depois será preciso “promover” o esquema do banco a cada mudança de modelo). | Autor |
| 2 | Definir as variáveis de ambiente de produção: `SEED_SENHA_ADMIN`, `SEED_SENHA_GESTOR`, `SEED_SENHA_CONSULTA` com senhas fortes e distintas (mínimo 12 caracteres, geradas por gerenciador de senhas) e `SEED_SENHAS_ALEATORIAS=true` como salvaguarda. `NEXTAUTH_SECRET`/`AUTH_SECRET` e `NEXTAUTH_URL` são gerenciados pela plataforma por ambiente. | Autor (valores) / assistente (cadastro das variáveis, sem exibir os valores) |
| 3 | Autorizar o deploy. | Autor |
| 4 | Executar o seed **uma única vez** contra o banco de produção com `NODE_ENV=production` (as senhas padrão nunca são aplicadas nesse modo). | Assistente, após autorização |
| 5 | Validar: login com `Admin@123` deve falhar (401); login com a senha definida em `SEED_SENHA_ADMIN` deve funcionar. | Assistente + autor |
| 6 | Criar, pela tela de usuários, uma conta **CONSULTA** ou **GESTOR_CADASTRO** por testador (nunca compartilhar a conta de administrador). Entregar credenciais por canal privado. | Autor |
| 7 | Após a rodada de testes: inativar as contas dos testadores e, se desejado, encerrar o deploy. | Autor |

**Custo:** a publicação e o banco de produção podem consumir créditos/recursos da sua conta; por isso dependem da sua autorização prévia.

## Opção B — Servidor próprio ou outro provedor (a partir do ZIP auditado)

```bash
# 1. Banco isolado (PostgreSQL 14+): usuário e banco exclusivos para a demonstração
createdb material_master_demo
# (ou: CREATE USER mm_demo WITH PASSWORD '<senha-forte>'; CREATE DATABASE material_master_demo OWNER mm_demo;)

# 2. Variáveis de ambiente (NUNCA em arquivo versionado)
export NODE_ENV=production
export DATABASE_URL='postgresql://mm_demo:<senha-forte>@<host>:5432/material_master_demo?schema=public'
export NEXTAUTH_SECRET="$(openssl rand -base64 32)"
export AUTH_SECRET="$NEXTAUTH_SECRET"
export NEXTAUTH_URL='https://<dominio-da-demonstracao>'
export SEED_SENHA_ADMIN='<senha-forte-1>' SEED_SENHA_GESTOR='<senha-forte-2>' SEED_SENHA_CONSULTA='<senha-forte-3>'

# 3. Instalação, banco, seed e build
cd nextjs_space
yarn install && yarn prisma generate && yarn prisma db push && yarn prisma db seed
yarn build && yarn start -p 3000   # atrás de um proxy reverso com HTTPS (nginx/Caddy)
```

Requisitos mínimos: Node.js 20+, 1 vCPU / 1 GB RAM, HTTPS obrigatório (cookies de sessão `Secure`).

## Checklist de segurança antes de liberar o endereço aos testadores
- [ ] Banco de produção separado do de desenvolvimento.
- [ ] `NODE_ENV=production` e `SEED_SENHA_*` definidas (ou senhas aleatórias anotadas em local seguro).
- [ ] Login com `Admin@123` / `Gestor@123` / `Consulta@123` retorna 401.
- [ ] Segredos de sessão gerados especificamente para o ambiente (não reutilizados do desenvolvimento).
- [ ] HTTPS ativo.
- [ ] Uma conta por testador, com perfil mínimo necessário.
- [ ] Plano de desativação do ambiente ao final da rodada.
