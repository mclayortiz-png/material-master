# Matriz de cobertura de QA — MATERIAL MASTER

**Data da análise:** 15/11/2026 (análise documental inicial) · **Atualizada em 15/11/2026 após a execução do QA incremental** (testes unitários criados, suíte de integração ampliada para 47 casos e regressão completa em ambiente isolado — ver `RELATORIO-QA-INCREMENTAL.md`). Nenhuma alteração no código de produto e nenhum acesso ao banco de produção.

**Fontes analisadas (evidências):**
- `situacao-2-desenvolvimento/08-relatorio-de-testes-verificacao.md` (relatório de verificação, Modelo V).
- `auditoria/RELATORIO-PRONTIDAO-PUBLICACAO.md` (auditoria de 14/11/2026).
- `auditoria/RELATORIO-QA-INCREMENTAL.md` (QA incremental de 15/11/2026).
- Logs `auditoria/logs/01` a `12` (auditoria) — `03`/`10` (integração 29/29), `04`/`11` (E2E 10/10), `01`/`08` (tipos e build), `12` (seed em produção).
- Logs `auditoria/logs/13` a `19` (QA incremental) — `14` (unitários 29/29), `15a`/`15` (integração 46/47 → 47/47), `16` (tipos), `17` (E2E 10/10), `18` (build), `19` (ESLint dos arquivos de teste). Total reconciliado: **88 verificações automatizadas** (29 + 47 + 10 + 2 estáticas), 88 aprovadas.
- `situacao-1-planejamento/01-visao-e-requisitos.md` (RF01–RF13, RNF01–RNF07, RN01–RN06).
- `situacao-3-validacao/09-template-teste-por-pares.md` (roteiro de validação com 5 testadores).
- `evidencias/*.png` (3 capturas de tela dos fluxos E2E).

## 1. Resumo do que existe

| Nível (Modelo V) | O que foi executado | Resultado registrado | Evidência |
|---|---|---|---|
| Verificação estática | `tsc --noEmit`, build de produção, lint de hidratação SSR | 0 erros / sucesso (dev, cópia limpa e cópia isolada de QA) | logs 01, 02, 08, 16, 18 |
| Teste unitário isolado | **29 casos Vitest** (`tests/unit/`: validacoes 14, hierarquia 7, codigo 8) — `yarn test:unit` | **29 aprovados, 0 reprovados** | log 14 |
| Teste de integração (API + banco) | **47 casos** (`scripts/testes-integracao.ts`: 29 originais + 18 novos) | **47 aprovados, 0 reprovados** no schema isolado `qa_incremental` (1ª execução 46/47 por asserção de teste incorreta, corrigida — log 15a) | logs 03, 10 (29/29), 15 (47/47) |
| Teste de sistema/aceitação (navegador) | 10 fluxos Playwright (`scripts/testes-e2e.py`) | **10 aprovados, 0 reprovados** — executado 3× (dev, cópia limpa, cópia isolada) | logs 04, 11, 17; 3 capturas em `evidencias/` |
| Validação com usuários (Situação 3) | **Não realizada** (0 de 5 formulários) | — | template 09 apenas |

Não há registro de teste reprovado nas execuções finais. Defeitos de produto encontrados pelo QA incremental: **nenhum**. O relatório 08 §8.4 menciona defeitos corrigidos durante o desenvolvimento, mas **sem lista individualizada** — lacuna de evidência histórica, não de funcionalidade.

## 2. Matriz de cobertura — requisitos funcionais

Legenda de resultado: **A** = aprovado em todas as execuções registradas; **P** = parcialmente coberto; **N** = não testado / sem evidência; **F.S.** = fora do escopo desta entrega (fase seguinte, por decisão do projeto). Casos INT-30 a INT-47 e UNIT-* foram adicionados pelo QA incremental.

| Requisito | Teste executado | Resultado | Evidência | Pendência |
|---|---|---|---|---|
| RF01 Autenticação e-mail/senha com hash | INT-2 (3 perfis autenticam), INT-3 (senha incorreta), INT-26 (inativo não loga), INT-34 (LOGIN auditado sem hash de senha nos detalhes), E2E-1, E2E-10 | A | logs 03/10/15, 04/11/17 | Sem teste de expiração/encerramento de sessão (logout) e de bloqueio por tentativas (risco aceito, sem rate limiting) |
| RF02 Autorização por perfil no servidor | INT-4 (401 sem sessão), INT-5 (redirecionamento), INT-6/7/18 (403 por perfil), INT-29 (páginas por perfil), **INT-30 (anônimo → 401 nas 14 rotas de escrita), INT-31 (Consulta → 403 nas 14), INT-32 (Gestor → 403 nas 11 rotas administrativas)**, E2E-8, E2E-9 | A | logs 03/10/15, 04/11/17; `consulta_mobile.png` | Varredura completa das rotas de escrita concluída; rotas de página seguem cobertas por amostragem (INT-5/29, E2E-8/9) |
| RF03 Administração de usuários | INT-26 (criar, alterar perfil, inativar), INT-27 (autocadastro → CONSULTA, e-mail duplicado), INT-28 (RN05), **INT-34 (reativação de usuário auditada)**, E2E-7 | A | logs 03/10/15, 04/11/17 | Guarda de "último administrador" e troca/redefinição de senha ainda sem caso de teste próprio |
| RF04 Cadastro com código único automático | INT-1 (25 concorrentes), INT-12, **UNIT-codigo (8)**, E2E-3 | A | logs 03/10/15, 14, 04/11/17; `admin_materiais.png` | — |
| RF05 Pesquisa com filtros e paginação | INT-8, INT-15 (texto, família, status, paginação), **INT-38 (grupo), INT-39 (subgrupo + texto), INT-40 (família × grupo incompatíveis → vazio), INT-41 (busca sem resultado: total 0, totalPaginas 1, página fora do limite), INT-42 (normalização de page/pageSize)**, E2E-2 | A | logs 03/10/15, 04/11/17 | — |
| RF06 Edição com código imutável | INT-13 (RN01), INT-14, E2E-4 | A | logs 03/10, 04/11 | — |
| RF07 Inativação lógica com motivo / reativação | INT-16, INT-17 (405), INT-18, **INT-33 (INATIVACAO/REATIVACAO auditadas com motivo e autor; histórico em GET), UNIT-validacoes (motivo vazio rejeitado)**, E2E-5 | A | logs 03/10/15, 14, 04/11/17; `detalhe.png` | — |
| RF08 Hierarquia Família→Grupo→Subgrupo | INT-11 (RN02), INT-19 (409 duplicado), INT-20, INT-21/22 (RN03), INT-23/24 (RN04), INT-25 (405), **INT-36 (edição de nome de família/grupo/subgrupo auditada de → para), INT-43 (subgrupo em uso: 409 + confirmação; inativo rejeitado), INT-44 (grupo em uso com contagens emUso; subgrupo não reativa com pai inativo), INT-45 (mover subgrupo com materiais → 409; vazio → ok; grupo inválido → 400/404), INT-46 (unicidade de código por pai), UNIT-hierarquia (7)**, E2E-6 | A | logs 03/10/15, 14, 04/11/17 | — |
| RF09 Trilha de auditoria | INT-12 (criação), INT-14 (alteração), **INT-33 (inativação/reativação de material), INT-34 (criação/edição/inativação/reativação de usuário e LOGIN), INT-35 (autocadastro com origem), INT-36 (classificações: criação, edição, inativação, reativação)**, E2E-4 (histórico na tela) | A (base implementada) | logs 03/10/15, 04/11/17 | Não há tela/consulta global de auditoria (escopo declarado "base implementada") |
| RF10 Dashboard com indicadores | — | F.S. | — | Não implementado nesta entrega (decisão de escopo documentada em 01). Compatível com as três situações-problema, que não o exigem |
| RF11 Solicitações/aprovação | — | F.S. | — | Idem |
| RF12 Detecção de duplicidades | — | F.S. | — | Idem |
| RF13 Exportação CSV | — | F.S. | — | Idem |

## 3. Matriz de cobertura — requisitos não funcionais e regras de negócio

| Requisito | Teste executado | Resultado | Evidência | Pendência |
|---|---|---|---|---|
| RNF01 Interface 100% pt-BR | INT-9 (mensagens pt-BR), UNIT-validacoes (mensagens por campo em pt-BR), E2E-10; inspeção visual | P | logs; capturas | Não há verificação sistemática de todas as telas/mensagens (apenas amostral) |
| RNF02 Responsividade ≥ 390 px | E2E-8 (viewport 390 px, perfil Consulta) | P | logs 04/11/17; `consulta_mobile.png` | Só o perfil Consulta e só algumas telas; formulários e telas administrativas não testados em viewport móvel |
| RNF03 Persistência relacional com integridade | Indireto: INT-11, 19, 21–24, 43–46; `db push` em schema isolado (logs 06, 13) | P | logs 03/10/15, 06, 13 | Nenhum teste direto de restrição em nível de banco (ex.: tentativa de violar chave estrangeira) |
| RNF04 Senhas com bcrypt | Indireto: INT-2/3; INT-34 (nenhum hash exposto na auditoria); log 12 (seed produção) | P | logs 03/15, 12 | Não há teste que leia o valor armazenado e confirme que é hash |
| RNF05 Sem exclusão física | INT-17 (materiais 405), INT-25 (classificações 405), **INT-37 (DELETE → 405 nas 5 entidades, inclusive usuários)** | A | logs 03/10/15 | — |
| RNF06 Código sem colisão sob concorrência | INT-1 (25 requisições simultâneas), UNIT-codigo | A | logs 03/10/15, 14 | — |
| RNF07 Mensagens de erro por campo | INT-9, INT-10, INT-20, UNIT-validacoes | A | logs 03/10/15, 14 | — |
| RN01 Código imutável | INT-13 | A | logs 03/10/15 | — |
| RN02 Consistência da hierarquia no material | INT-11, UNIT-hierarquia, E2E-3 (selects em cascata) | A | logs 03/10/15, 14, 04/11/17 | — |
| RN03 Confirmação ao inativar classificação em uso | INT-21, INT-22 (família), **INT-43 (subgrupo), INT-44 (grupo)** | A | logs 03/10/15 | — |
| RN04 Reativação/movimentação de grupo e subgrupo | INT-23, INT-24 (grupo), **INT-44 (subgrupo com pai inativo), INT-45 (movimentação de subgrupo)** | A | logs 03/10/15 | — |
| RN05 Admin não inativa a própria conta | INT-28 | A | logs 03/10/15 | — |
| RN06 NCM com 8 dígitos | INT-10, UNIT-validacoes | A | logs 03/10/15, 14 | — |

## 4. Cobertura frente às três situações-problema

| Situação | Exigência acadêmica | Situação atual | Evidência | Pendência |
|---|---|---|---|---|
| 1 — Planejamento | Revisão de requisitos, UML, IHC e modelo de dados (DER ↔ diagrama de classes) | Documentos 01–05 produzidos; inconsistências doc × código corrigidas na auditoria (D1–D5) | pasta `situacao-1-planejamento/`, auditoria §2 | Não é objeto de teste automatizado; rastreabilidade requisito → caso de teste consolidada nesta matriz |
| 2 — Desenvolvimento | Construção front/back em MVC **e testes** (Modelo V, testes unitários com ferramentas tipo JUnit/PhpUnit) | **Todos os níveis do Modelo V cobertos:** unitário (29, Vitest), integração (47), sistema/aceitação (10), verificação estática | 08 §8.2–8.6, logs 01–18 | Registro individualizado dos defeitos corrigidos durante o desenvolvimento (08 §8.4) permanece como lacuna histórica |
| 3 — Validação | Validação com pares (5 testadores), relatórios e documentação final | **Não iniciada**: template pronto, 0 relatórios; nenhuma evidência simulada; roteiro do vídeo já corrigido para não afirmar testes não realizados | 09, 10, auditoria D4 | Executar os 5 testes por pares com a aplicação acessível aos testadores; consolidar resultados; registrar defeitos e correções |

## 5. Síntese

- **Efetivamente testado e aprovado:** RF01–RF09, RNF05–RNF07 e as seis regras de negócio RN01–RN06, com evidência em pelo menos duas execuções independentes (dev/cópia limpa) e reexecução no ambiente isolado de QA.
- **Coberto parcialmente:** RNF01–RNF04 (verificações indiretas ou amostrais).
- **Sem evidência:** validação com usuários (Situação 3); lista individualizada de defeitos históricos.
- **Reprovados:** nenhum nas execuções finais; a única falha intermediária (log 15a) foi uma asserção de teste incorreta, corrigida sem alterar o produto.
- **Fora de escopo nesta entrega (por decisão, compatível com o escopo acadêmico):** RF10–RF13.

## 6. Testes complementares ainda recomendados (por prioridade)

| Prioridade | Teste | Por que é necessário | Custo estimado |
|---|---|---|---|
| **Crítica** | Validação com os 5 testadores reais (Situação 3) usando o template 09 | Exigência acadêmica explícita e única lacuna que impede a entrega completa; nenhuma automação substitui | Baixo em créditos (executado pelos testadores); exige a aplicação acessível a eles |
| **Baixa** | Viewport móvel para formulário de material e telas administrativas (RNF02) | Hoje só o perfil Consulta foi testado no celular | Baixo: 1 fluxo E2E adicional |
| **Baixa** | Guarda de "último administrador" e troca de senha (RF03) | Regras citadas na auditoria sem caso próprio | Baixo: 2 casos de integração |

**Concluídos pelo QA incremental** (removidos da lista): varredura de autorização em todas as rotas de escrita; auditoria de inativação/reativação, usuários e classificações; filtros por grupo/subgrupo e busca sem resultado; RN03/RN04 para grupo e subgrupo; testes unitários (Vitest); DELETE em usuários → 405.

**Não recomendados agora** (custo sem ganho acadêmico proporcional): testes de carga, testes de segurança automatizados (CSP/HSTS) e testes para RF10–RF13 (não implementados).
