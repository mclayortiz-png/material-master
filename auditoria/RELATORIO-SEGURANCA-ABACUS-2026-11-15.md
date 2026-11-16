# Achados de segurança da hospedagem AbacusAI — MATERIAL MASTER

**Evidência original:** captura da interface de segurança do AbacusAI fornecida pelo autor em 15/11/2026 (hora local de Brasília), com 5 achados abertos: 3 médios e 2 baixos. **Escopo verificado:** código do GitHub + relatório visual da hospedagem; sem acesso de escrita ao AbacusAI ou inspeção da resposta HTTP pública a partir da conta.

## Classificação e mitigação proposta

| Achado do AbacusAI | Gravidade | Evidência no código GitHub | Mitigação da PR #4 | Risco residual |
|---|---|---|---|---|
| Clickjacking | Médio | Cabeçalhos ausentes no next.config.js | CSP frame-ancestors e X-Frame-Options | Validar iframe do preview AbacusAI e resposta real da hospedagem |
| Verificador auxiliar público de credenciais | Médio | POST /api/auth/login comparava bcrypt sem limite de tentativas, devolvendo perfil em sucesso | Desativado: retorna 410 sem consultar DB, independentemente do corpo | Login principal Auth.js ainda requer defesa de rate limiting no provedor/borda |
| HSTS ausente | Médio | Sem Strict-Transport-Security | max-age=31536000 em NODE_ENV production; sem includeSubDomains/preload | A hospedagem/proxy deve preservar header na resposta externa e garantir HTTPS |
| X-Content-Type-Options ausente | Baixo | Header ausente | nosniff | Confirmar cabeçalho externo |
| CSP ausente | Baixo | Header ausente | Política mínima frame-ancestors, object-src, base-uri | Não há política completa script-src/style-src; endurecer após validar dependências de frontend |

## Evidências e critérios de aceite

- Branch de correção: `security/corrigir-achados-abacus`; PR #4 baseada na PR #3, para preservar os 48 testes de integração já criados.
- A rotina de autenticação da interface usa `signIn('credentials')` do Auth.js; a rota desativada servia somente como verificador auxiliar.
- Teste de integração negativo alterado para exigir 410 em `/api/auth/login`; um teste adicional verifica cabeçalhos. **49 casos propostos**, sujeitos a reexecução CI.
- Não mesclar nem publicar até aprovação explícita do autor, build + CI verde, revisão de compatibilidade de preview e prova externa dos cabeçalhos.
- Auditoria deve reaplicar o verificador AbacusAI no site **depois** do deploy autorizado e registrar a nova contagem de achados.
- Não confundir com cinco alertas anteriores do GitHub Dependabot: aqueles eram vulnerabilidades de dependências; esta auditoria cobre cabeçalhos e autenticação no ambiente publicado.
- Evitar acionar `Corrigir todos` isoladamente porque o projeto hospedado estava divergente da `main` do GitHub (relato do agente AbacusAI).
- Devemos revisar fluxo Auth.js para defesa de brute force e ataques de enumeração, preferindo rate limiting persistente por origem e conta no proxy/serviço de hospedagem em vez de contador em memória.

## Status

**Pendente:** CI da PR #4, revisão de preview e validação do aplicativo publicado. Nenhum novo deploy realizado por esta auditoria.

## Controle complementar — tentativas repetidas no login Auth.js

- **Achado:** o fluxo de credenciais verdadeiro, processado pelo Auth.js, também não impunha limite de tentativas. A desativação da rota auxiliar por si só era insuficiente.
- **Mitigação preparada:** módulo `lib/login-rate-limit.ts` chamado antes de consultar o usuário/bcrypt no `auth.ts`.
- **Persistência:** modelo Prisma `LoginRateLimit`, atualizado atomicamente por `INSERT ... ON CONFLICT ... RETURNING` em transação PostgreSQL; funciona entre instâncias do app.
- **Política:** janela fixa de 15 minutos, 20 tentativas por conta. Opcionalmente, cinco tentativas por conta+IP e 60 por IP quando `AUTH_TRUST_PROXY_HEADERS=true` e o proxy estiver configurado para sanitizar cabeçalhos IP.
- **Privacidade:** chaves com HMAC-SHA256 usando `AUTH_SECRET`/`NEXTAUTH_SECRET`; não armazenar e-mails/IPs brutos nesta tabela.
- **Experiência de autenticação:** usuário bloqueado recebe a mesma resposta genérica de credenciais inválidas; uma autenticação bem-sucedida limpa seu contador por conta.
- **Fail-closed:** erro no banco/segredo não libera autenticação sem o limitador.
- **Preparação de schema obrigatória:** gerar Prisma Client e aplicar criação **não destrutiva** da nova tabela no PostgreSQL de preview, inspecionando previamente o DDL; depois repetir o processo em produção apenas com autorização e backup. **Sem qualquer migração ou deploy realizado por esta PR.**
- **Testes adicionais:** testes unitários de chaves HMAC/normalização/origem de IP e cenário HTTP com conta temporária: tentativas inválidas, bloqueio de senha válida durante a janela, expiração simulada e recuperação.
- **Riscos adicionais:** bloqueio deliberado de contas por terceiros, ampliação ilimitada da tabela por endereços inventados, cabeçalhos IP falsificados e proteção de login distribuído exigem controle adicional no proxy/WAF. Não afirmar eliminação completa do risco de brute force sem validar a infraestrutura do AbacusAI.
- **Limpeza:** prever expurgo periódico dos registros de limite com `updatedAt` superior a 24 horas em um job de manutenção controlado.
- **Status:** alteração de código em PR #4; aplicação ao site **pendente de testes de CI, revisão, implantação e auditoria pós-deploy**.
