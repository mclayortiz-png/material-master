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
