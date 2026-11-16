# Arquivos gerenciados automaticamente pela plataforma de hospedagem

Este documento registra quais arquivos do diretório `situacao-2-desenvolvimento/codigo-fonte/nextjs_space`
são reescritos, substituídos ou mantidos pela plataforma de hospedagem (ambiente de preview/publicação do
MATERIAL MASTER) e, portanto, **não devem ser considerados fonte de verdade neste repositório** nem
sobrescritos cegamente a partir dele. Também registra as reconciliações efetivamente aplicadas no ambiente
hospedado após a integração da PR #5 (segurança), para que o repositório e o ambiente publicado fiquem alinhados.

## 1. Arquivos reescritos pela plataforma (não versionar alterações locais)

| Arquivo / caminho | Comportamento da plataforma | Consequência para o repositório |
|---|---|---|
| `next.config.js` | Regenerado pela plataforma a cada build/checkpoint. Alterações manuais são revertidas. | Os cabeçalhos de segurança adicionados pela PR #5 neste arquivo foram revertidos no ambiente hospedado; eles continuam aplicados por `proxy.ts` (`lib/security-headers.ts`), que é a fonte efetiva dos cabeçalhos. O bloco `headers()` do repositório é redundante, não conflitante. |
| `prisma/schema.prisma` — bloco `generator client` | O bloco (inclusive `output`) é reescrito no empacotamento; o Prisma Client é regenerado automaticamente. | Nunca editar o bloco `generator client`. Modelos, campos e índices continuam versionados normalmente. |
| `node_modules/` e `yarn.lock` | São *symlinks* para a instalação compartilhada da plataforma (Next.js **16.4.1**). O `yarn.lock` do repositório não é usado localmente. | O repositório mantém Next.js **16.4.6** e o `yarn.lock` gerado com Yarn 4.9.4 (mesma versão do CI). A diferença 16.4.1 × 16.4.6 é esperada e exclusiva do ambiente hospedado. |
| `.yarnrc.yml` | Configuração da plataforma com `npmMinimalAgeGate: 2880` (quarentena de 48 h para versões recém-publicadas). | Versões com menos de 48 h de publicação não instalam no ambiente hospedado. Por isso `@typescript-eslint/eslint-plugin` e `@typescript-eslint/parser` ficaram em **8.72.2** (8.73.0 estava em quarentena). O repositório usa apenas `nodeLinker: node-modules`. |
| `instrumentation-client.js` | Injetado no empacotamento (telemetria de erros de cliente da plataforma). | Não versionar. |
| `next-env.d.ts` | Gerado pelo Next.js. | Não versionar alterações. |
| `.abacus.donotdelete` | Arquivo de sistema da plataforma. | Nunca editar, mover ou versionar. |
| `.env` | Segredos e URLs do ambiente (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `CSP_FRAME_ANCESTORS`, …). `NEXTAUTH_URL`/`AUTH_URL` também são injetadas no processo em tempo de execução. | Nunca versionar. Use `.env.example` como referência. |
| `scripts/seed.ts` (cópia local) | A cópia hospedada contém uma conta interna de teste usada pelo verificador automático da plataforma. | A conta **não existe no repositório** e não deve ser adicionada. No ambiente hospedado ela foi rebaixada para o perfil CONSULTA (somente leitura) e sua sessão anterior foi invalidada. |
| `components/viz/` e `public/abacus-viz/` | Kit de visualização fornecido pela plataforma; nenhum código do MATERIAL MASTER o importa. | Não versionado. |

## 2. Reconciliações aplicadas no ambiente hospedado (conteúdo desta PR)

| Arquivo | Reconciliação | Motivo |
|---|---|---|
| `lib/security-headers.ts` | `apiMutationError` aceita mutações **somente** quando `Origin`, `Sec-Fetch-Site` **e** `Referer` estão simultaneamente ausentes (cliente não navegador). Qualquer `Origin` divergente, `Origin: null` literal, `Origin` vazio, `Sec-Fetch-Site: cross-site` ou `Referer` sem `Origin` → 403. `application/json` continua obrigatório (415) em POST/PUT/PATCH e a autorização por perfil continua em cada rota. | O verificador automático da plataforma chama as APIs sem cabeçalhos de navegador. Nenhum CORS com credenciais foi ampliado: respostas a `OPTIONS` com origem externa não carregam `Access-Control-Allow-*`. |
| `scripts/test-security-headers.ts` | Asserções atualizadas para a regra acima (inclui `Origin: null`, `Sec-Fetch-Site` sem `Origin`, `Referer` sem `Origin`, text/plain sem cabeçalhos → 415). | Manter o teste coerente com a exceção. |
| `tests/unit/security-headers.test.ts` (novo) | 10 testes unitários (Vitest) da mesma regra, da CSP e de `previewFrameOrigins`. | Cobertura automatizada no `yarn test:unit`. |
| `tests/unit/{codigo,hierarquia,validacoes}.test.ts`, `vitest.config.ts` | Suíte unitária criada no QA incremental e preservada no ambiente hospedado (29 testes). | Estavam apenas na branch `qa-incremental`; passam a integrar a `main`. |
| `scripts/testes-integracao.ts` | Versão ampliada (48 casos: autorização, auditoria, pesquisa, integridade). | Mesma suíte executada no ambiente hospedado. |
| `package.json` | `test:unit`; `@typescript-eslint/*` **8.72.2**; `vitest` **5.1.0** + `vite ^7` (peer obrigatório); `resolutions` com `minimatch@npm:^10.2.2 → 11.0.1` mantido. | Quarentena de 48 h (ver §1); `vitest` 3.x trazia dependências com avisos críticos na auditoria. |
| `yarn.lock` | Regenerado com Yarn **4.9.4** (`packageManager` do repositório). `minimatch` resolve apenas para **11.0.1** e **3.1.5**; nenhuma 10.x vulnerável. | Lockfile passa em `yarn install --immutable`. |

## 3. Evidências da revisão final (PostgreSQL descartável, nunca o banco compartilhado)

- `yarn install --immutable` → exit 0 no lockfile final.
- `yarn npm audit --all --recursive` → 0 críticas / 0 altas; 3 avisos moderados de depreciação (não são CVEs): `@smithy/core 3.32.0` (via AWS SDK), `eslint 9.33.0` (fim de suporte), `recharts 2.15.3` (ramo 2.x encerrado).
- `tsc --noEmit` → 0 erros; `next build` → sucesso; `vitest run` → 38/38.
- `scripts/test-security-headers.ts` → aprovado.
- `scripts/testes-integracao.ts` → **48/48**; `scripts/testes-seguranca.ts` → **10/10** (PostgreSQL 17 local descartável, `SECURITY_TEST_DISPOSABLE=true`).
- Observação operacional: no ambiente hospedado `AUTH_URL`/`NEXTAUTH_URL` são injetadas no processo e **prevalecem sobre `.env`**; ao reproduzir as suítes localmente, exportar `AUTH_URL`/`NEXTAUTH_URL` iguais a `TEST_BASE`, senão a verificação de origem responde 403 para todas as mutações.

## 4. Banco de dados em produção

- O SQL aditivo `prisma/security-hardening.sql` (tabela `AuthRateLimit`, coluna `User.sessionVersion`) **já está aplicado** no banco compartilhado. Nenhum `seed`, `reset` ou `db push` é necessário ou recomendado em produção.
- Backup recuperável (CSV por tabela + esquema de colunas + cópia do preview) está armazenado **fora do banco e fora do repositório**, com permissão restrita e soma SHA-256; a restauração de uma tabela foi testada em banco descartável. Nenhum dado ou segredo foi enviado ao GitHub.
