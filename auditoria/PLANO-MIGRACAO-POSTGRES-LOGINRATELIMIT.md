# Plano controlado de implantação — tabela LoginRateLimit

**Escopo:** banco PostgreSQL do MATERIAL MASTER, exclusivamente criação aditiva de uma tabela e seu índice.  
**Status:** SQL preparado no GitHub; teste automatizado em PostgreSQL isolado; **produção não alterada** enquanto não houver acesso autenticado e confirmação de backup.

## 1. Artefatos versionados

- Modelo Prisma: `situacao-2-desenvolvimento/codigo-fonte/nextjs_space/prisma/schema.prisma`, modelo `LoginRateLimit`.
- SQL transacional, idempotente e com verificação de estrutura: `situacao-2-desenvolvimento/codigo-fonte/nextjs_space/prisma/sql/20261116_login_rate_limit.sql`.
- Teste em schema QA e com dados preexistentes: `scripts/testar-migracao-login-rate-limit.ts`.
- Job GitHub Actions: `.github/workflows/ci-integracao.yml` roda teste isolado antes de `prisma db push` e da suíte HTTP.

## 2. Verificações obrigatórias antes de acessar produção

1. Confirmar o banco correto no console AbacusAI e se a aplicação utiliza um banco gerenciado pela plataforma.
2. Obter backup recuperável e comprovar possibilidade de restauração (preferencialmente snapshot ou `pg_dump` gerado fora da execução do aplicativo). **Não inserir credenciais em commits, logs públicos ou chat.**
3. Confirmar a versão atual do schema e se já existe tabela homônima: `SELECT to_regclass('"LoginRateLimit"');`.
4. Em conexão de leitura, registrar `SELECT count(*)` para `"User"`, `"Material"` e `"AuditLog"`, quando tabelas existentes.
5. Verificar que o role autorizado possui permissão `CREATE` no schema e que o usuário de runtime terá permissões para fazer `INSERT`, `SELECT`, `UPDATE` e `DELETE` na tabela nova.
6. Confirmar o schema correto (`public` no projeto de CI) com `SELECT current_schema();`; não executar em ambiente desconhecido.

## 3. Aplicação da mudança (somente após backup e autorização de implantação)

Com o Prisma CLI **6.7.0** fixado neste projeto e `DATABASE_URL` apontando para o banco ALVO validado, executar dentro da pasta `nextjs_space`:

```bash
yarn prisma db execute --file prisma/sql/20261116_login_rate_limit.sql --schema prisma/schema.prisma
```

O SQL usa `BEGIN` / `COMMIT`, `lock_timeout` de 5 segundos, `statement_timeout` de 30 segundos, cria apenas `"LoginRateLimit"` e `"LoginRateLimit_updatedAt_idx"`, valida colunas/índices e faz **ROLLBACK** se ocorrer erro. Não contém `DROP`, `TRUNCATE` nem `DELETE` de dados.

**Não usar** `prisma migrate reset`, `prisma db push --accept-data-loss`, `TRUNCATE` ou `DROP TABLE`. A operação não realiza seed nem cria ou altera usuários.

## 4. Aceite de integridade após execução

1. Verificar `SELECT to_regclass('"LoginRateLimit"');` e a existência do índice.
2. Validar as colunas `key` (VARCHAR(80), PK), `attempts` (INTEGER), `windowStart` (TIMESTAMP(3)), `updatedAt` (TIMESTAMP(3)).
3. Comparar os totais de registros pré/pós nas tabelas existentes, e validar amostras por chaves estáveis (contagens iguais são necessárias, mas não suficientes para prova de integridade).
4. Gerar Prisma Client compatível com o novo modelo; validar autenticação em preview e a recuperação após o bloqueio da janela.
5. Conferir que nenhuma ação de seed/reinicialização foi executada e que o banco já tem o novo schema ANTES de implantar `auth.ts` com rate limiting.
6. Reaplicar a verificação AbacusAI após o deploy autorizado; os achados devem ser julgados por evidência da resposta publicada.

## 5. Reversão

Em caso de erro no sistema, restaurar a versão anterior do aplicativo (rollback do deploy) e conservar a nova tabela: ela é aditiva e o aplicativo anterior simplesmente não a usa. **Não excluir a tabela para reverter o deploy.** Se houver discrepância de schema, interromper, verificar e restaurar apenas a partir de backup validado mediante aprovação específica.

## 6. Limites de acesso nesta etapa

As ferramentas conectadas neste chat permitem alterar GitHub e executar testes em PostgreSQL DESCARTÁVEL do GitHub Actions. **Não há conexão autenticada com o PostgreSQL hospedado no AbacusAI**. Consequentemente, o uso do SQL em QA é verificável pelos logs da PR, mas o estado do banco publicado não pode ser afirmado como alterado.

## 7. Critérios para liberar a PR nº 4

- Todos os testes unitários e integrados verdes, inclusive prova de migração aditiva.
- Sem divergência entre PR nº 3 e PR nº 4.
- Backup do ambiente publicado verificado.
- Criação da tabela no destino pretendido, antes do novo código de autenticação.
- Preview funcionando, com taxa de bloqueio validada e sem prejuízo das contas legítimas.
- Publicação separada da migração, sem automatizar ambas num único passo irreversível.
