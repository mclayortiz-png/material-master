# Relatório de QA incremental — MATERIAL MASTER

**Data de execução:** 15/11/2026 · **Responsável:** equipe de QA (execução automatizada autorizada pelo autor do projeto)

## 1. Objetivo e condições

Executar o plano de controle de qualidade incremental aprovado, composto por: (a) criação de testes unitários; (b) ampliação dos testes de autorização, auditoria, pesquisa e integridade; (c) regressão completa (tipos, build, integração, E2E). Condições obrigatórias cumpridas:

| Condição | Situação |
|---|---|
| Verificações exclusivamente em ambiente isolado | Cumprida — schema de banco `qa_incremental` e cópia de código em uma cópia isolada do projeto (fora do repositório), servidor na porta 3100 |
| Banco de produção não modificado/reinicializado/sobrescrito | Cumprida — nenhum comando foi direcionado ao banco de produção |
| Autenticação e implantação pública inalteradas | Cumprida — nenhum arquivo de autenticação alterado; nenhum deploy |
| Nenhum esquema/arquivo/dado excluído | Cumprida — schemas `qa_incremental` e `auditoria_limpa` mantidos; cópia isolada do projeto mantida |
| Corrigir somente defeitos comprovados | Cumprida — **nenhum defeito de produto comprovado; nenhuma linha de código de produto alterada** |
| Sem publicação automática no GitHub, sem deploy | Cumprida |
| Resultados reais registrados e matriz atualizada | Cumprida — logs 13 a 18; `MATRIZ-COBERTURA-QA.md` atualizada |

## 2. Ambiente isolado

1. Cópia do projeto (sem `.git`, `.deploy`, `.logs`, `node_modules`, artefatos de build) para uma cópia isolada do projeto (fora do repositório).
2. `.env` da cópia com `DATABASE_URL` apontando para o **schema `qa_incremental`** (mesmo servidor de banco de desenvolvimento, schema separado; produção não envolvida).
3. `prisma db push` + seed (3 contas demo, hierarquia e 23 materiais) no schema isolado — log 13.
4. Build de produção da cópia e servidor iniciado em `http://localhost:3100` (encerrado ao fim dos testes). O preview em :3000 não foi afetado.
5. Execução de referência da suíte original (29 testes de integração) na cópia: 29/29 — confirma que o ambiente isolado reproduz o comportamento do projeto.

## 3. Alterações realizadas no projeto (somente testes e configuração de testes)

| Arquivo | Alteração |
|---|---|
| `package.json` | devDependency `vitest@3.2.4`; script `test:unit` (`vitest run`) |
| `vitest.config.ts` | novo — alias `@`, ambiente node, padrão `tests/unit/**/*.test.ts` |
| `tests/unit/validacoes.test.ts` | novo — 14 testes dos schemas zod (material, classificação, usuário, inativação) |
| `tests/unit/hierarquia.test.ts` | novo — 7 testes de `validarHierarquia` com acesso ao banco simulado (mock) |
| `tests/unit/codigo.test.ts` | novo — 8 testes da geração `MAT-000001` (formato, sequência atômica, transação simulada) |
| `scripts/testes-integracao.ts` | ampliado de 29 para **47** casos (seções 8 a 11, descritas abaixo) |

Nenhum arquivo em `app/`, `lib/`, `components/`, `prisma/` ou `auth.ts` foi alterado.

## 4. Testes executados e resultados

### 4.1 Resumo

| Nível | Suíte | Executados | Aprovados | Reprovados | Evidência |
|---|---|---|---|---|---|
| Unitário | Vitest (`yarn test:unit`) | 29 | 29 | 0 | log 14 |
| Integração (API + banco isolado) | `scripts/testes-integracao.ts` | 47 | 47 | 0 | log 15 (1ª execução: log 15a, 46/47 — ver §5) |
| Sistema/aceitação (navegador) | `scripts/testes-e2e.py` (Playwright) | 10 | 10 | 0 | log 17 |
| Estático | `tsc --noEmit` (inclui `tests/unit`) | 1 | 1 (0 erros) | 0 | log 16 |
| Estático | Build de produção da cópia isolada | 1 | 1 | 0 | log 18 |

**Total: 88 verificações automatizadas (29 unitárias + 47 de integração + 10 E2E + 2 estáticas), 88 aprovadas, 0 reprovadas na execução final.**

*Nota de reconciliação (15/11/2026):* a primeira versão deste relatório declarava "89", somando de forma inconsistente duas verificações complementares que não são casos de teste do produto. Elas passam a ser registradas à parte, sem entrar na contagem:

| Verificação complementar (não contada) | Resultado | Evidência |
|---|---|---|
| ESLint restrito aos arquivos criados/alterados (`tests/`, `vitest.config.ts`, `scripts/testes-integracao.ts`) | 0 erros, exit 0 | log 19 |
| Testes automáticos da plataforma de hospedagem (tipos, build, inicialização, autenticação) antes do checkpoint "QA incremental: Vitest e testes ampliados" | aprovado | checkpoint salvo (preview); sem log exportado |

### 4.2 Testes unitários (29)

- **validacoes (14):** material válido; nome curto; NCM com 8 dígitos (RN06) e inválido; unidade obrigatória; classificação válida/inválida; usuário (e-mail inválido, senha curta, perfil inválido); inativação exige motivo; mensagens em pt-BR por campo.
- **hierarquia (7):** família/grupo/subgrupo consistentes; grupo de outra família rejeitado; subgrupo de outro grupo rejeitado; classificação inativa rejeitada; identificadores inexistentes.
- **codigo (8):** formato `MAT-000001`; incremento sequencial; zero à esquerda; sequência via transação; valores altos; isolamento de chamadas concorrentes simuladas.

### 4.3 Testes de integração novos (18 de 47)

| Seção | Casos | O que prova |
|---|---|---|
| 8 — Autorização | 4 | Anônimo recebe **401 nas 14 rotas de escrita**; perfil Consulta recebe **403 nas 14**; perfil Gestor recebe 403 nas 11 rotas administrativas (usuários, classificações); `DELETE` retorna **405** nas 5 entidades (materiais, famílias, grupos, subgrupos, **usuários**) |
| 9 — Auditoria | 4 | Inativação/reativação de material registram `INATIVACAO`/`REATIVACAO` com motivo e autor, e o histórico é devolvido em `GET /api/materiais/:id`; ações sobre usuário (criação, edição, inativação, reativação) e `LOGIN` do próprio usuário são registradas, **sem gravar hash de senha** nos detalhes; autocadastro registra origem; família/grupo/subgrupo registram criação, edição (de → para), inativação e reativação |
| 10 — Pesquisa | 5 | Filtro por grupo; filtro por subgrupo combinado com texto; família + grupo incompatíveis → lista vazia; busca sem resultado (`total = 0`, `totalPaginas = 1`, página 200); normalização de `page`/`pageSize` fora dos limites |
| 11 — Integridade | 5 | Inativar **subgrupo** em uso exige confirmação (409 `requerConfirmacao`) e inativo é rejeitado em cadastro/edição; inativar **grupo** em uso devolve contagens `emUso`; subgrupo não reativa com grupo pai inativo; grupo inativo rejeitado; subgrupo com materiais não muda de grupo (409), subgrupo vazio muda, grupo inválido → 400/404; unicidade de código por pai |

### 4.4 Regressão

- Suíte original de integração (casos 1–29) mantida e aprovada dentro da execução de 47.
- E2E: 10/10 fluxos no navegador contra a cópia isolada (:3100), incluindo viewport móvel do perfil Consulta.
- `tsc --noEmit` sem erros com os novos arquivos de teste incluídos.
- Build de produção da cópia isolada concluído com sucesso.

## 5. Reprovações e correções

- **Defeitos de produto comprovados: 0.** Nenhuma correção no código da aplicação foi necessária.
- **Reprovação na 1ª execução (log 15a):** o caso "Auditoria: usuário" falhou porque a asserção nova exigia que *todos* os registros de auditoria do usuário tivessem o administrador como autor; o produto, corretamente, também registra o evento `LOGIN` em nome do próprio usuário. A asserção foi ajustada para excluir `LOGIN` dessa verificação e passar a exigir que o `LOGIN` conste em nome do próprio usuário. Trata-se de **correção do teste**, não do produto; a 2ª execução (log 15) resultou em 47/47.
- **Lint:** `yarn lint` completo apresenta erros **pré-existentes** (ex.: `require` em `tailwind.config.ts`), não relacionados a esta etapa e não alterados; os arquivos criados/alterados nesta etapa passam sem erros (log 19).

## 6. Evidências

Todos os logs em `auditoria/logs/` (cópia em `material_master_docs/auditoria/logs/`):

| Log | Conteúdo |
|---|---|
| 13-qa-ambiente-isolado.log | `db push` + seed no schema `qa_incremental` (host mascarado) |
| 14-testes-unitarios-vitest.log | 29/29 unitários |
| 15a-qa-testes-integracao-1a-execucao.log | 1ª execução, 46/47 (falha de asserção descrita em §5) |
| 15-qa-testes-integracao-ampliados.log | execução final, 47/47 |
| 16-qa-typescript.log | `tsc --noEmit`, exit 0 |
| 17-qa-testes-e2e.log | Playwright 10/10, exit 0 |
| 18-qa-build-copia-isolada.log | build de produção da cópia isolada, sucesso |
| 19-qa-eslint-arquivos-de-teste.log | ESLint nos arquivos de teste criados/alterados, exit 0 |

## 7. Limitações

- O ambiente isolado usa um **schema separado no servidor de banco de desenvolvimento**, não uma instância de banco independente; o banco de produção não foi tocado, mas o isolamento é lógico (por schema), não físico.
- Os testes unitários de `hierarquia.ts` e `codigo.ts` usam acesso ao banco **simulado** (mock); o comportamento real com banco continua provado pelos testes de integração.
- Autorização foi testada nas rotas de escrita por perfil; páginas (rotas de interface) continuam cobertas apenas pelos casos originais INT-5/INT-29 e E2E-8/9.
- Não foram adicionados testes de carga, de segurança automatizada (CSP/HSTS), de limite de tentativas de login nem de troca de senha / "último administrador" (riscos já conhecidos e aceitos no relatório de prontidão).
- Dados de teste residuais existem apenas no schema `qa_incremental` (e, de execuções anteriores, no banco de preview); não foram removidos por falta de autorização específica.

## 8. Pendências acadêmicas

| Item | Situação | Observação |
|---|---|---|
| Situação 3 — validação com 5 testadores reais | **Pendente** | Não foi realizada e **não foi simulada**: nenhum formulário de teste por pares foi preenchido; nenhuma evidência fictícia foi criada. Depende de pessoas reais usando a aplicação com o template 09 |
| Registro individualizado de defeitos corrigidos durante o desenvolvimento (08 §8.4) | Pendente | Esta etapa registra individualmente o único incidente ocorrido (asserção de teste, §5) |
| Testes unitários (Modelo V, nível unitário) | **Concluído** | 29 casos, Vitest, `yarn test:unit` |
| RF10 Dashboard, RF11 Solicitações/aprovação, RF12 Duplicidades, RF13 Exportação CSV | **Não implementados** | Declarados como "fase seguinte" em `01-visao-e-requisitos.md`. **Compatível com o escopo acadêmico:** as três situações-problema (revisão de UML/IHC/modelo de dados; construção MVC com testes; validação com pares e documentação final) não exigem essas funcionalidades, desde que a documentação final os mantenha explicitamente como escopo futuro — o que já ocorre nos documentos 01 e nesta matriz |

## 9. Estado final

- Código de testes e configuração salvos em checkpoint (**preview apenas**); o site publicado permanece na versão anterior.
- Nada foi publicado no GitHub; nenhum deploy realizado; produção intocada.
- Mantidos, aguardando decisão do autor: schema `qa_incremental`, schema `auditoria_limpa` (auditoria anterior) e a cópia uma cópia isolada do projeto (fora do repositório).
