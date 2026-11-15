# 01 — Visão e requisitos

## 1. Problema
Empresas de suprimentos, manutenção, almoxarifado e engenharia sofrem com cadastros de materiais duplicados, descrições inconsistentes e ausência de classificação padronizada. Isso gera compras repetidas, estoque parado e relatórios não confiáveis.

## 2. Objetivo
Oferecer uma aplicação web que centralize, padronize e governe o cadastro mestre de materiais (MDM — Master Data Management), com código único e imutável, classificação hierárquica, controle de acesso por perfil e trilha de auditoria.

## 3. Justificativa acadêmica
O projeto não possui implementação anterior na PIT I; o planejamento foi revisado e consolidado no início da PIT II, conforme o ciclo de melhoria contínua (Kaizen) recomendado na Situação 1.

## 4. Atores
| Ator | Descrição |
|---|---|
| Administrador | Gerencia usuários, perfis e a hierarquia de classificação. Possui todas as permissões. |
| Gestor de Cadastro | Cria, edita, inativa e reativa materiais. |
| Consulta | Pesquisa e visualiza materiais (somente leitura). Perfil padrão do autocadastro. |

## 5. Requisitos funcionais (RF01–RF13)
| ID | Requisito | Status no MVP |
|---|---|---|
| RF01 | Autenticar usuários com e-mail e senha (hash) | Implementado |
| RF02 | Autorizar ações por perfil, validado no servidor | Implementado |
| RF03 | Administrar usuários (criar, alterar perfil, ativar/inativar) | Implementado |
| RF04 | Cadastrar material com código único gerado automaticamente | Implementado |
| RF05 | Pesquisar materiais por texto, família, grupo, subgrupo e status, com paginação | Implementado |
| RF06 | Editar material (código imutável) | Implementado |
| RF07 | Inativar/reativar material (inativação lógica com motivo obrigatório) | Implementado |
| RF08 | Manter hierarquia Família → Grupo → Subgrupo com integridade | Implementado |
| RF09 | Registrar trilha de auditoria (quem, quando, o quê) | Base implementada (histórico por material) |
| RF10 | Painel (dashboard) com indicadores reais | Fase seguinte |
| RF11 | Solicitações de cadastro/alteração com fluxo de aprovação | Fase seguinte |
| RF12 | Detectar possíveis duplicidades e sugerir padronização (revisão humana, sem mesclar automaticamente) | Fase seguinte |
| RF13 | Exportar consultas em CSV | Fase seguinte |

## 6. Requisitos não funcionais
| ID | Requisito | Atendimento |
|---|---|---|
| RNF01 | Interface 100% em português do Brasil | Atendido |
| RNF02 | Responsividade (desktop e celular ≥ 390 px) | Atendido e testado |
| RNF03 | Persistência relacional com integridade referencial | PostgreSQL com chaves estrangeiras e restrições de unicidade |
| RNF04 | Senhas armazenadas com hash (bcrypt) | Atendido |
| RNF05 | Nenhuma exclusão física de dados mestres | Atendido (DELETE responde 405) |
| RNF06 | Geração de código livre de colisão sob concorrência | Atendido (sequência atômica em transação; testado com 25 requisições simultâneas) |
| RNF07 | Mensagens de erro claras, por campo | Atendido |

## 7. Regras de negócio
- RN01 — O código do material segue o padrão `MAT-000001` e nunca é alterado.
- RN02 — Material sempre pertence a um subgrupo, que pertence a um grupo, que pertence a uma família; o cadastro rejeita combinações inconsistentes.
- RN03 — Inativar uma classificação em uso exige confirmação explícita; classificações inativas não podem receber novos materiais.
- RN04 — Um grupo não pode ser reativado se sua família estiver inativa; não pode ser movido de família se tiver materiais.
- RN05 — O administrador não pode inativar a própria conta.
- RN06 — NCM, quando informado, deve ter exatamente 8 dígitos.
