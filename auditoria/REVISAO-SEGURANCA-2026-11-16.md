# Revisão de segurança — MATERIAL MASTER

Data: 16/11/2026. Base analisada: `main`, commit `319a32d25a968445bedca74c76d51e267a1a586b`.

## Constatação inicial

A captura do AbacusAI indicava Next.js 16.4.1 vulnerável. A `main` também usava essa versão. As correções descritas no relato do preview não estavam sincronizadas: não existia `proxy.ts` e o endpoint `/api/auth/login` ainda validava credenciais e retornava dados de usuário. Esta revisão implementa as correções no código do GitHub.

Foram examinados autenticação, callbacks de sessão, APIs, perfis, consultas Prisma, validações, layout, recursos externos, dependências/lockfile e workflows. As APIs de negócio já verificavam sessão e perfis no servidor; as consultas SQL existentes eram parametrizadas e as respostas de usuário não incluíam hashes de senha.

## Correções

| Problema | Alteração |
|---|---|
| Next.js vulnerável | Next.js, SWC WASM e eslint-config-next 16.4.1 → 16.4.6. O advisory [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h) afeta 16.3.0–16.4.4; primeiro patch 16.4.5. O padrão `use cache`/`unstable_cache` do advisory não foi encontrado no app, mas a dependência foi atualizada. |
| minimatch vulnerável transitivo | TypeScript ESLint parser/plugin 8.18.0 → 8.73.0 elimina a cadeia com minimatch 9.0.9. Referência: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Yarn fixado em 4.9.4. |
| Verificador paralelo de credenciais | Rota removida. O teste continua rejeitando senha incorreta pelo fluxo oficial Auth.js e confirma que a rota antiga não valida sequer credenciais válidas. |
| Login e autocadastro ilimitados | Contadores PostgreSQL atômicos, compartilhados por processos, persistentes após reinício e com janela de 15 minutos. Consumo anterior à consulta de usuário/bcrypt. Falha do armazenamento impede autenticação. |
| Sessões válidas após reset de senha | `User.sessionVersion` incrementada atomicamente ao trocar senha ou inativar conta; callbacks conferem a versão em cada consulta de sessão. Reativar conta não restaura cookies anteriores. |
| Cabeçalhos ausentes / CSP permissiva | `nosniff`, HSTS fora de desenvolvimento, Referrer-Policy e Permissions-Policy. CSP com nonce criptográfico por resposta para Next/next-themes, sem `unsafe-inline` nem `unsafe-eval` em scripts de produção, `object-src 'none'`, `base-uri 'self'` e `form-action 'self'`. Documentos com nonce usam `private, no-store`. |
| Confiança em todos os tenants Abacus | `frame-ancestors 'self'` por padrão. Preview adicional configurável somente com origens HTTPS exatas. |
| Mutações próprias sem verificação explícita de origem | POST/PUT/PATCH/DELETE em APIs próprias exigem Origin igual à URL pública configurada. POST/PUT/PATCH exigem JSON; Auth.js mantém sua proteção CSRF específica. Clientes de API/scripts foram adaptados. |
| Erros internos enviados ao cliente | Respostas 500 genéricas; detalhes ficam no log do servidor. |
| Senha silenciosamente truncada por bcrypt | Novas senhas e resets limitados a 72 bytes UTF-8. Mantido suporte de login para contas anteriores. E-mail limitado a 254 caracteres no cadastro e login. |
| Detalhe/metadata dependiam somente do layout | Autenticação verificada antes das consultas locais de detalhe e metadados. Não foi afirmado vazamento anterior sem evidência dinâmica. |

Os limites contam tentativas válidas e inválidas. Por janela: login 10/conta, 30/IP confiável e 1000/global; cadastro 3/e-mail, 5/IP confiável e 100/global. Tentativas já bloqueadas por IP/conta não consomem a cota global. E-mails/IPs são armazenados somente como chaves HMAC; linhas expiradas há mais de 24h são removidas na primeira tentativa admitida de uma nova janela global.

O limite por IP exige `AUTH_TRUSTED_IP_HEADER` apontando para cabeçalho que a hospedagem sobrescreve com um único IP canônico do cliente. Listas de proxies não são aceitas. Sem essa garantia, mantenha a variável ausente: conta/global continuam protegidos, mas não há limitação real por IP.

## Verificações executadas em ambiente isolado

Node.js 24.22.1, Next.js 16.4.6, PostgreSQL 16 descartável, sem conexão ao banco publicado. Workflows continuam usando Node.js 22.

| Verificação | Resultado local |
|---|---|
| Instalação Yarn com lockfile imutável | Aprovada |
| `yarn npm audit --all --recursive --no-deprecations --json` | Exit 0; nenhum advisory aplicável |
| Bulk audit npm sobre 1034 pacotes do lockfile | Resposta vazia, sem advisories aplicáveis |
| `tsc --noEmit` e build de produção | Aprovados |
| Teste de CSP, nonces, allowlist e guard de origem | Aprovado |
| Integração HTTP + banco, suíte existente | 30/30 aprovados |
| Nova suíte de segurança HTTP + PostgreSQL | 10/10 aprovados |
| E2E existente com Chromium | 10/10 aprovados |
| Smoke de navegador/CSP | Login válido/inválido, navegação, tema, logout e proteção aprovados; zero violações CSP inesperadas e zero pageerrors |
| Injeção inline deliberada | Bloqueada por `script-src-elem` em modo enforce; código não executado |
| SQL aditivo executado duas vezes sobre banco QA | Aprovado; operação idempotente |

A suíte de segurança verifica cabeçalhos/nonce em HTML de produção, rota removida, origem hostil com cookie admin, limite de senha UTF-8, revogação após reset/inativação/reativação, bloqueio do login oficial, dez admissões sob concorrência, compartilhamento do bloqueio entre processo de teste e servidor HTTP, expiração, limite por IP e 1050 repetições bloqueadas sem drenar cota global, além de cadastro com HTTP 429/Retry-After. Ela recusa banco/servidor fora de localhost e exige banco terminado em `_qa` ou `_ci` e `SECURITY_TEST_DISPOSABLE=true`.

Os workflows de PR agora incluem os testes de CSP e de segurança. Resultados locais não são apresentados como execução do GitHub Actions; os checks da PR fornecem a evidência remota.

O E2E usou uma cópia temporária do script apenas para selecionar `/usr/bin/chromium`, pois o executável esperado no cache Playwright não estava disponível. O Chromium do ambiente recusou o certificado do helper externo Abacus. O mesmo JavaScript, baixado com `curl` e HTTPS verificado, executou em fixture sem violação CSP ou erro de página. A verificação TLS permaneceu habilitada; esse teste não comprova a cadeia TLS no ambiente final.

## Implantação da nova versão no AbacusAI

1. Integrar a PR aprovada e sincronizar o código completo, inclusive lockfile e `proxy.ts`, no projeto AbacusAI. Confirmar que o código em preview corresponde ao commit integrado.
2. No ambiente correto e com backup recuperável, aplicar a alteração **aditiva** antes de iniciar o novo servidor. A partir de `situacao-2-desenvolvimento/codigo-fonte/nextjs_space`, com `DATABASE_URL` já configurada:

   ```bash
   yarn prisma db execute --file prisma/security-hardening.sql --schema prisma/schema.prisma
   yarn prisma generate
   ```

   O projeto ainda não possui baseline de migrations; não substituir esse passo por `migrate deploy` sem preparar o histórico. Em banco QA novo, `prisma db push` usa o schema atualizado. Não executar seed em produção.

3. Manter `AUTH_SECRET` forte e configurar `AUTH_URL` ou `NEXTAUTH_URL` com a origem pública correta, sem host escolhido a partir de cabeçalhos não confiáveis. Se as duas variáveis existirem, manter o mesmo endereço; `AUTH_URL` tem precedência.
4. Para preview em iframe, confirmar a origem real do painel Abacus e defini-la em `CSP_FRAME_ANCESTORS`, como lista de origens HTTPS exatas separadas por vírgula. Sem a variável, o app funciona diretamente, mas incorporações externas são bloqueadas. Não copiar curingas `*.abacus.ai` / `*.abacusai.app`.
5. Confirmar com a plataforma qual cabeçalho de IP é sanitizado/sobrescrito antes de ativar `AUTH_TRUSTED_IP_HEADER`. Os demais limites funcionam sem essa configuração.
6. Compilar/publicar. Cookies emitidos antes da introdução de `sessionVersion` serão invalidados; usuários precisam entrar novamente. Validar login/cadastro, perfis e fluxos principais no preview e no domínio publicado e repetir a varredura de segurança após o deploy.

A alteração é aditiva ao banco, mas o código novo depende da tabela/coluna. Se o SQL não for aplicado, autenticação falhará. Uma reversão para a versão anterior remove as novas garantias de revogação e limitação; mantenha a atualização de segurança na estratégia de recuperação.

## Pendências e limites do resultado

- A hospedagem, o banco de produção e o deploy AbacusAI não foram modificados nesta revisão do GitHub.
- `style-src` mantém `unsafe-inline` para Radix/next-themes; isso não libera scripts inline. `unsafe-eval` é permitido somente em desenvolvimento para tooling.
- O script da própria plataforma `https://apps.abacus.ai/chatllm/appllm-lib.js` continua autorizado. CSP reduz a superfície de execução, mas não elimina toda possibilidade de XSS.
- A auditoria padrão também informa deprecações de ESLint 9, Recharts 2 e `@smithy/core` 3.32.0. Smithy possui um problema de redação de dados em logger customizado, corrigido em 3.38.1+ ([fonte oficial](https://github.com/aws/aws-sdk-js-v3/issues/8393)); não há import/configuração AWS SDK no código auditado. Tratar essa cadeia antes de introduzir uso de AWS/loggers. Deprecações não foram ocultadas nem confundidas com os advisories resolvidos.
- Este resultado cobre código e testes descritos; a verificação no domínio publicado continua necessária para encerrar os achados de produção.
