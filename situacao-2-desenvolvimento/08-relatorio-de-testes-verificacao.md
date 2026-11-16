# 08 — Relatório de testes (verificação)

Seguindo o Modelo V apresentado na disciplina, a verificação foi feita em três níveis automatizados. A **validação** com usuários reais (Situação 3) está planejada e documentada no template 09 — ainda não realizada.

## 8.1 Nível 1 — Verificação estática
| Verificação | Resultado |
|---|---|
| Checagem de tipos (TypeScript, `tsc --noEmit`) | 0 erros |
| Build de produção | Sucesso |
| Lint de hidratação SSR | Sem violações |

## 8.2 Nível 2 — Testes de integração (API + banco) — 29 casos, 29 aprovados
Script: `scripts/testes-integracao.ts` (executar com servidor em `:3000`: `yarn tsx --require dotenv/config scripts/testes-integracao.ts`).

| # | Caso de teste | Requisito | Resultado |
|---|---|---|---|
| 1 | 25 gerações concorrentes produzem 25 códigos únicos e sequenciais | RF04 / RNF06 | Aprovado |
| 2 | Administrador, gestor e consulta autenticam com credenciais válidas | RF01 | Aprovado |
| 3 | Senha incorreta é rejeitada | RF01 | Aprovado |
| 4 | APIs exigem autenticação (401 sem sessão) | RF02 | Aprovado |
| 5 | Páginas protegidas redirecionam anônimos para /login | RF02 | Aprovado |
| 6 | Perfil Consulta não cria material (403) nem acessa páginas de edição | RF02 | Aprovado |
| 7 | Perfil Gestor não gerencia classificações nem usuários (403) | RF02 | Aprovado |
| 8 | Perfil Consulta consegue listar e ver materiais | RF05 | Aprovado |
| 9 | Material sem campos obrigatórios retorna 400 com mensagens pt-BR por campo | RNF07 | Aprovado |
| 10 | NCM com tamanho inválido é rejeitado | RN06 | Aprovado |
| 11 | Grupo de outra família é rejeitado no cadastro de material | RN02 | Aprovado |
| 12 | Gestor cria material com código gerado automaticamente e auditoria de criação | RF04, RF09 | Aprovado |
| 13 | Código é imutável (tentativa de alterar retorna 400) | RN01 | Aprovado |
| 14 | Edição registra atualizadoPor e trilha com alterações | RF06, RF09 | Aprovado |
| 15 | Busca textual e filtro por família/status/paginação funcionam | RF05 | Aprovado |
| 16 | Inativação exige motivo, é lógica (registro preservado) e reativação funciona | RF07 | Aprovado |
| 17 | Exclusão física não é permitida (405) | RNF05 | Aprovado |
| 18 | Perfil Consulta não inativa material (403) | RF02 | Aprovado |
| 19 | Admin cria família, grupo e subgrupo; código duplicado retorna 409 | RF08 | Aprovado |
| 20 | Validação de código inválido e nome curto (400) | RF08 | Aprovado |
| 21 | Inativar família em uso exige confirmação (409) e com confirmação inativa | RN03 | Aprovado |
| 22 | Família inativa não pode ser usada em novo material | RN03 | Aprovado |
| 23 | Grupo não pode ser reativado se família pai estiver inativa; reativar família resolve | RN04 | Aprovado |
| 24 | Grupo não pode ser movido para outra família se tiver materiais vinculados | RN04 | Aprovado |
| 25 | Exclusão física de classificação bloqueada (405) | RNF05 | Aprovado |
| 26 | Admin cria usuário, altera perfil e inativa; usuário inativo não loga | RF03 | Aprovado |
| 27 | Autocadastro público cria perfil CONSULTA e rejeita e-mail duplicado | RF03 | Aprovado |
| 28 | Admin não pode inativar a própria conta | RN05 | Aprovado |
| 29 | Início, materiais, detalhe, novo, classificações e usuários respondem 200 para o perfil correto | RF02 | Aprovado |

## 8.3 Nível 3 — Testes de sistema/aceitação no navegador (E2E) — 10 fluxos, 10 aprovados
Script: `scripts/testes-e2e.py` (Playwright).

| # | Fluxo | Resultado |
|---|---|---|
| 1 | Login do administrador e carregamento do início | Aprovado |
| 2 | Listagem de materiais com dados do seed | Aprovado |
| 3 | Cadastro de material pelo formulário, com selects em cascata e código gerado | Aprovado |
| 4 | Edição de material e registro no histórico | Aprovado |
| 5 | Inativação com motivo e reativação pelo detalhe | Aprovado |
| 6 | Criação de família/grupo/subgrupo na tela de classificações | Aprovado |
| 7 | Criação de usuário na tela de usuários | Aprovado |
| 8 | Perfil Consulta em viewport móvel (390 px): navegação, sem botões de edição, bloqueio em /materiais/novo | Aprovado |
| 9 | Perfil Gestor: cria material, é bloqueado em /usuarios e /classificacoes | Aprovado |
| 10 | Credenciais inválidas mostram mensagem de erro | Aprovado |

## 8.4 Defeitos encontrados e corrigidos durante o desenvolvimento
Os defeitos identificados pelas execuções anteriores da suíte (ajustes de tipagem, mensagens de validação e comportamento de redirecionamento) foram corrigidos antes do fechamento; a execução final registra 39/39 aprovados.

## 8.4.1 Reexecução na auditoria de publicação (14/11/2026)
Após os ajustes de segurança do seed e dos scripts de teste, toda a verificação foi reexecutada duas vezes — no ambiente de desenvolvimento e em uma **cópia limpa** extraída do ZIP auditado, com `yarn install` do zero, `prisma generate`/`db push`/`db seed` em um schema de banco isolado e servidor em modo de produção (`yarn build` + `yarn start`):

| Verificação | Ambiente de desenvolvimento | Cópia limpa (ZIP auditado) |
|---|---|---|
| `tsc --noEmit` | 0 erros | 0 erros |
| Build de produção | Sucesso | Sucesso |
| Testes de integração | 29/29 | 29/29 |
| Testes E2E (Playwright) | 10/10 | 10/10 |
| Seed em modo produção | — | senhas padrão deixam de autenticar (401) após o seed; senha definida por `SEED_SENHA_ADMIN` autentica (200) |

Os logs completos estão em `auditoria/logs/` (arquivos 01 a 12).

## 8.5 Lacunas conhecidas
- Não há testes unitários isolados (sem servidor) das funções de `lib/`; as regras são cobertas indiretamente pelos testes de integração. Sugestão para próxima fase: adicionar Vitest para `hierarquia.ts`, `validacoes.ts` e `codigo.ts`.
- Os scripts de teste criam registros residuais (materiais "E2E…", famílias "E##", usuários "auto.*") no banco de preview.
- Validação com usuários (Situação 3) pendente.


## 8.6 Atualização da verificação automática em GitHub Actions (15/11/2026)

Após a integração das correções de sessão e dos workflows, o GitHub Actions passou a executar também a suíte com **30 casos de integração**, incluindo o cenário de revogação de sessão de contas rebaixadas/inativadas (item adicional aos 29 casos históricos). Houve **30/30 aprovações** com PostgreSQL descartável, e a compilação TypeScript/Next.js foi aprovada de forma independente.

- Integração: https://github.com/mclayortiz-png/material-master/actions/runs/43771629838
- Compilação: https://github.com/mclayortiz-png/material-master/actions/runs/43771629849
- A infraestrutura do GitHub Actions é temporária; não comprova a disponibilidade do site de demonstração.
- Os dez testes E2E descritos na seção 8.3 são **evidências históricas** e não foram reexecutados nesta atualização do CI.
- Cinco avaliações com colegas e os vídeos acadêmicos continuam pendentes; não atribuir a elas resultado de testes automatizados.
- Dependabot encontrou 5 alertas em 15/11/2026 (2 moderados e 3 baixos). Foi criada uma branch específica para atualizar os pacotes, com verificação de regressão requerida antes de qualquer merge.
