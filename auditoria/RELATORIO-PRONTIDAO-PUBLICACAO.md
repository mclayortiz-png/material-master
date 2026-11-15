# Relatório de prontidão para publicação — MATERIAL MASTER

**Data:** 14/11/2026 · **Escopo:** auditoria final de segurança, reprodutibilidade e consistência do MVP antes da publicação no GitHub e do deploy de demonstração.
**Escopo funcional preservado:** nenhuma funcionalidade foi adicionada ou removida (sem dashboard, fluxo de aprovação, detecção de duplicidades ou exportação CSV).
**Deploy:** não realizado — aguarda autorização (configuração em `deploy-demonstracao.md`).

## 1. Resumo executivo

| Item | Resultado |
|---|---|
| Segredos reais no ZIP anterior (337 arquivos) | **Nenhum** `.env`, chave ou string de conexão real encontrada |
| Arquivos indevidos no ZIP anterior | 132 arquivos de log da plataforma (`.logs/`), cache do Yarn (1,2 MB), `tsconfig.tsbuildinfo`, arquivos internos da hospedagem, kit de visualização não utilizado e caminhos absolutos do ambiente — **removidos** no novo ZIP (182 arquivos, 0,9 MB) |
| Senhas padrão das contas demo em produção | **Corrigido**: o seed nunca aplica `Admin@123`/`Gestor@123`/`Consulta@123` com `NODE_ENV=production` (verificado: 401 após seed de produção) |
| `.gitignore` / `.env.example` | **Refeitos** (segredos, chaves, logs, artefatos; apenas valores fictícios) |
| Instalação a partir de cópia limpa | **Confirmada**: `yarn install` do zero + `prisma generate/db push/db seed` em schema isolado + build + servidor de produção |
| tsc / build / 29 testes de integração / 10 E2E | **Aprovados** no ambiente de desenvolvimento **e** na cópia limpa (logs em `logs/`) |
| Inconsistências documentação × código | 6 corrigidas (mensagens, comandos de instalação, nome do ZIP, seed) |
| Roteiro do vídeo | Afirmação de que “cinco colegas testaram” **substituída** por texto condicional |

## 2. Problemas encontrados e correções (rastreabilidade)

| # | Severidade | Problema | Correção | Arquivo(s) | Evidência |
|---|---|---|---|---|---|
| P1 | Alta | Seed aplicava senhas públicas (`Admin@123` etc.) em qualquer ambiente, inclusive produção, e re-hasheava a senha a cada execução, revertendo trocas feitas pelo administrador | Em `NODE_ENV=production` (ou `SEED_SENHAS_ALEATORIAS=true`) o seed usa `SEED_SENHA_ADMIN/GESTOR/CONSULTA` ou gera senhas aleatórias (`crypto.randomBytes`) exibidas uma única vez; senhas de usuários existentes só são sobrescritas em produção com `SEED_ATUALIZAR_SENHAS=true` | `nextjs_space/scripts/seed.ts` | `logs/12-copia-limpa-seed-producao.log`: login com senha padrão 200 antes → **401 depois**; senha via variável → 200 |
| P2 | Alta | ZIP anterior incluía 132 logs internos da plataforma de hospedagem, cache do Yarn, `tsconfig.tsbuildinfo`, `.yarnrc.yml` com caminhos do servidor e arquivos de controle da plataforma | Novo processo de empacotamento com cópia sanitizada (staging) e verificações automáticas que falham se houver `.env`, chave, string de conexão real ou referência ao ambiente de hospedagem | `auditoria/preparar-publicacao.sh` | Saída: “Verificações de segurança da cópia: OK”; ZIP com 182 arquivos |
| P3 | Média | `prisma/schema.prisma` com `output` absoluto (`/home/ubuntu/...`) e `binaryTargets` do servidor; `next.config.js` com host de preview da plataforma; `scripts/testes-e2e.py` gravava capturas em `/home/ubuntu/e2e/` | Na cópia publicada: gerador Prisma sem caminho absoluto, `allowedDevOrigins` apenas `127.0.0.1`; no projeto: capturas em pasta relativa `e2e-screens/` (variável `E2E_SCREENSHOTS`) e `TEST_BASE` suportado nos E2E | `preparar-publicacao.sh`, `scripts/testes-e2e.py` | Cópia limpa compila e roda (`logs/08`, `10`, `11`) |
| P4 | Média | `.gitignore` não excluía `.env*`, chaves (`*.pem`, `*.key`, `*.p12`), `*.log`, relatórios de teste, arquivos de SO | `.gitignore` completo (com exceção explícita `!.env.example`) | `.gitignore` | Arquivo no ZIP |
| P5 | Média | `.env.example` mínimo (3 linhas), sem `AUTH_SECRET`, `NEXTAUTH_URL` nem orientação de geração de segredos | `.env.example` comentado com valores fictícios, instrução `openssl rand -base64 32`, variáveis `SEED_*` e `TEST_BASE` | `nextjs_space/.env.example` | Arquivo no ZIP |
| P6 | Baixa | Scripts de teste com senhas literais | Leem `SEED_SENHA_*` (padrões só para desenvolvimento) | `scripts/testes-integracao.ts`, `scripts/testes-e2e.py` | 29/29 e 10/10 após a mudança |
| P7 | Baixa | Conta de teste interna da plataforma de hospedagem presente no seed | Removida da cópia publicada (não faz parte do produto) | `preparar-publicacao.sh` | verificação automática no script |
| P8 | Baixa | Kit de visualização do template (`components/viz/`, `public/abacus-viz/`) não referenciado por nenhuma tela | Excluído da cópia publicada; `tsc` e build confirmam que nada depende dele | `preparar-publicacao.sh` | `logs/08-copia-limpa-tsc-build.log` |
| D1 | Doc | Manual (7.9) e IHC (05) citavam mensagens que não existem no código (“Já existe um registro com este código.”, “Você não tem permissão para esta ação.”) | Textos alinhados às mensagens reais das rotas `familias/grupos/subgrupos` e de `lib/authz.ts` | `07-manual-de-uso.md`, `05-ihc-telas-e-mensagens.md` | diff dos documentos |
| D2 | Doc | Manual (7.10) mandava rodar `scripts/seed.ts` diretamente, omitindo `prisma generate`, `AUTH_SECRET` e o `safe-seed.ts` configurado em `package.json` | Passo a passo corrigido (`yarn prisma db seed`), pré-requisitos e política de senhas | `07-manual-de-uso.md` | — |
| D3 | Doc | LEIA-ME apontava para o ZIP antigo; sem verificação pré-push | Nome do novo ZIP, comandos de conferência antes do `git push` | `00-LEIA-ME.md` | — |
| D4 | Doc | Roteiro do vídeo afirmava “Cinco colegas testaram” antes da realização dos testes | Fala reescrita no futuro/condicional, com instrução para atualizar só com dados reais | `10-roteiro-video-apresentacao.md` | — |
| D5 | Doc | Relatório de testes sem a reexecução desta auditoria; projeto de banco não mencionava a política de senhas do seed | Seção 8.4.1 adicionada; 3.5 ajustado | `08-...md`, `03-...md` | `logs/` |

## 3. Verificações executadas e resultados reais

| Verificação | Onde | Resultado | Log |
|---|---|---|---|
| Varredura de segredos no ZIP anterior e no projeto (`.env*`, `*.pem`, `*.key`, tokens, `postgres://`, `SECRET=`) | projeto + ZIP | 0 arquivos `.env`; única ocorrência de string de conexão é o valor fictício do `.env.example` | seção 2 |
| Revisão das 16 rotas de API | `app/api/**` | Todas chamam `exigirSessao`; escritas em famílias/grupos/subgrupos/usuários restritas a ADMINISTRADOR; materiais a ADMINISTRADOR+GESTOR; `DELETE` responde 405; autocadastro cria apenas CONSULTA; guardas de último administrador e auto-inativação presentes | — |
| Checagem de tipos (`tsc --noEmit`) | desenvolvimento | 0 erros | `logs/01-typescript.log` |
| Build de produção + lint SSR + smoke de autenticação | desenvolvimento | Sucesso | `logs/02-build-preview.log` |
| Testes de integração | desenvolvimento | **29/29** | `logs/03-testes-integracao.log` |
| Testes E2E (Playwright) | desenvolvimento | **10/10** | `logs/04-testes-e2e.log` |
| `yarn install` do zero a partir do ZIP auditado | cópia limpa | Sucesso (Yarn 4.13, 714 pacotes) | `logs/05-copia-limpa-yarn-install.log` |
| `prisma generate` + `db push` em schema isolado `auditoria_limpa` | cópia limpa | Sucesso | `logs/06-copia-limpa-prisma.log` |
| `prisma db seed` (safe-seed → seed) | cópia limpa | 23 materiais criados, 3 usuários demo | `logs/07-copia-limpa-seed.log` |
| `tsc` + `yarn build` | cópia limpa | Sucesso | `logs/08-copia-limpa-tsc-build.log` |
| Servidor de produção (`yarn start`, porta 3100) | cópia limpa | HTTP 200 em `/login` | `logs/09-copia-limpa-servidor.log` |
| Testes de integração contra a cópia limpa | cópia limpa | **29/29** | `logs/10-copia-limpa-testes-integracao.log` |
| Testes E2E contra a cópia limpa | cópia limpa | **10/10** | `logs/11-copia-limpa-testes-e2e.log` |
| Seed em modo produção | cópia limpa | senha padrão: 200 → **401**; `SEED_SENHA_ADMIN`: 200 | `logs/12-copia-limpa-seed-producao.log` |

Observações de honestidade: (a) a cópia limpa foi instalada na mesma máquina do desenvolvimento, com o cache do Yarn disponível (por isso o `install` levou 13 s); não foi testada em outro sistema operacional. (b) O banco “isolado” foi um **schema separado** no mesmo servidor de banco de dados, não um servidor distinto. (c) O schema `auditoria_limpa` foi criado para este teste e **não foi removido** porque a remoção de schemas no banco hospedado exige sua autorização explícita; ele não interfere na aplicação (que usa `public`) e pode ser removido com `DROP SCHEMA auditoria_limpa CASCADE;` quando você autorizar.

## 4. Arquivos alterados no projeto (todos rastreáveis por diff)

- `nextjs_space/scripts/seed.ts` — política de senhas por ambiente (P1).
- `nextjs_space/scripts/testes-integracao.ts`, `nextjs_space/scripts/testes-e2e.py` — senhas via variáveis, `TEST_BASE`, capturas em pasta relativa (P3, P6).
- `nextjs_space/.env.example` — modelo completo com valores fictícios (P5).
- `.gitignore` — completo (P4).
- Nenhuma alteração em rotas, telas, regras de domínio ou esquema do banco.

Artefatos fora do projeto: `auditoria/preparar-publicacao.sh` (empacotamento reprodutível), `auditoria/README-repositorio.md` (vira o `README.md` do repositório), `auditoria/deploy-demonstracao.md`, `auditoria/logs/`.

## 5. Riscos remanescentes (não corrigidos nesta etapa, por escopo)

| Risco | Impacto | Mitigação sugerida |
|---|---|---|
| Sem limitação de tentativas de login (NextAuth e `POST /api/auth/login`) | Força bruta contra contas conhecidas | Rate limiting por IP/e-mail e bloqueio temporário após N falhas (próxima fase) |
| `POST /api/auth/login` existe em paralelo ao fluxo NextAuth (usado pelos testes) | Superfície extra de autenticação | Restringir a `NODE_ENV!=='production'` ou remover após adaptar os testes |
| `typescript.ignoreBuildErrors: true` em `next.config.js` | Build pode passar com erro de tipo | Mantido por compatibilidade com a plataforma; `tsc --noEmit` deve continuar no pipeline (0 erros hoje) |
| Sem cabeçalhos de segurança (CSP, HSTS, X-Content-Type-Options) | Endurecimento de navegador ausente | Configurar no proxy reverso ou em `headers()` ao publicar fora da plataforma |
| Política de senha de usuários apenas por tamanho mínimo; sem troca obrigatória no primeiro acesso | Senhas fracas criadas por administradores | Regras de complexidade e flag “trocar senha no próximo login” |
| Dados residuais de teste no banco de desenvolvimento (materiais “E2E…”, famílias “E##”, usuários “auto.*”) e schema `auditoria_limpa` | Ruído em demonstrações a partir do banco de desenvolvimento | Usar banco de produção separado para a demo (deploy-demonstracao.md); limpeza mediante autorização |
| Sem testes unitários isolados de `lib/` | Regressões finas não detectadas sem servidor | Vitest para `hierarquia.ts`, `validacoes.ts`, `codigo.ts` |
| Dependência de `prisma generate` com aviso de descontinuação (saída padrão, Prisma 7) | Quebra futura ao atualizar o Prisma | Definir `output` relativo ao migrar para Prisma 7 |

## 6. Instruções de publicação

### 6.1 GitHub (feito por você, na sua máquina)
1. Descompacte `material_master_codigo_auditado.zip`; a pasta `material-master/` já contém `README.md`, `.gitignore` e `nextjs_space/.env.example`.
2. (Opcional) Monte a estrutura acadêmica do `00-LEIA-ME.md`, movendo o código para `situacao-2-desenvolvimento/codigo-fonte/` e copiando os `.md` do pacote de documentação. Se fizer isso, copie também o `.gitignore` para a raiz do repositório.
3. `git init && git add . && git status` — confirme que **nenhum** `.env` aparece (apenas `.env.example`).
4. `git commit -m "PIT II - Material Master: MVP auditado" && git branch -M main && git remote add origin <url> && git push -u origin main`.
5. Nunca rode o seed em produção sem `NODE_ENV=production`.

### 6.2 Deploy de demonstração
Siga `deploy-demonstracao.md`. **Nada será publicado até você autorizar expressamente**; quando autorizar, informe também se prefere a Opção A (plataforma, com banco de produção separado) ou a Opção B (servidor próprio).

### 6.3 Para regerar o ZIP após novas alterações
`bash auditoria/preparar-publicacao.sh` — recria a cópia sanitizada, executa as verificações de segurança e gera `material_master_codigo_auditado.zip`.

## 7. Conclusão
O código está **pronto para publicação no GitHub** com o ZIP auditado. O deploy de demonstração está **preparado e pendente de autorização**. Os riscos da seção 5 não impedem a publicação acadêmica, mas devem ser tratados antes de um uso corporativo real.
