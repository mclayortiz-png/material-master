# 04 — Dicionário de dados

Convenções: PK = chave primária; FK = chave estrangeira; UK = único; N = aceita nulo.
Todos os `id` são identificadores textuais únicos gerados pela aplicação (cuid).

## Tabela `User` — usuários do sistema
| Coluna | Tipo | Nulo | Restrição | Descrição / domínio |
|---|---|---|---|---|
| id | TEXT | não | PK | Identificador |
| name | TEXT | não | 3–100 caracteres | Nome completo |
| email | TEXT | não | UK, formato e-mail, minúsculas | Login |
| password | TEXT | não | hash bcrypt | Nunca armazenada em claro |
| perfil | ENUM Perfil | não | ADMINISTRADOR, GESTOR_CADASTRO, CONSULTA | Define autorização |
| ativo | BOOLEAN | não | padrão TRUE | Usuário inativo não autentica |
| createdAt / updatedAt | TIMESTAMP | não | | Controle |

## Tabela `Familia` — 1º nível da classificação
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| codigo | TEXT | não | UK, 1–10 alfanuméricos, maiúsculas | Ex.: ELE, MEC, HID, EPI |
| nome | TEXT | não | 2–80 caracteres | Ex.: Elétricos |
| ativo | BOOLEAN | não | padrão TRUE | Inativa ⇒ não aceita novos materiais |
| createdAt / updatedAt | TIMESTAMP | não | | |

## Tabela `Grupo` — 2º nível
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| codigo | TEXT | não | UK composta (familiaId, codigo) | Ex.: CAB (Cabos e Fios) |
| nome | TEXT | não | 2–80 | |
| ativo | BOOLEAN | não | | Não pode ser reativado com família inativa |
| familiaId | TEXT | não | FK → Familia.id | Não pode mudar se houver materiais |

## Tabela `Subgrupo` — 3º nível
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| codigo | TEXT | não | UK composta (grupoId, codigo) | Ex.: FLX (Cabo Flexível) |
| nome | TEXT | não | 2–80 | |
| ativo | BOOLEAN | não | | |
| grupoId | TEXT | não | FK → Grupo.id | |

## Tabela `UnidadeMedida`
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| sigla | TEXT | não | UK | UN, PC, M, KG, L, CX, PAR, RL |
| nome | TEXT | não | | Unidade, Peça, Metro… |
| ativo | BOOLEAN | não | | |

## Tabela `CodigoSequencia` — contador atômico
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| prefixo | TEXT | não | PK | 'MAT' |
| ultimo | INTEGER | não | padrão 0 | Último número emitido |

## Tabela `Material` — entidade principal
| Coluna | Tipo | Nulo | Restrição | Descrição / domínio |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| codigo | TEXT | não | UK, imutável | Formato `MAT-000001`, gerado pelo sistema |
| descricaoCurta | TEXT | não | 3–120 | Descrição padronizada para listagens |
| descricaoLonga | TEXT | N | ≤ 2000 | Especificação técnica |
| unidadeMedidaId | TEXT | não | FK → UnidadeMedida | |
| familiaId | TEXT | não | FK → Familia | Deve ser pai do grupo |
| grupoId | TEXT | não | FK → Grupo | Deve ser pai do subgrupo |
| subgrupoId | TEXT | não | FK → Subgrupo | |
| fabricante | TEXT | N | ≤ 120 | |
| partNumber | TEXT | N | ≤ 80 | Referência do fabricante |
| ncm | TEXT | N | exatamente 8 dígitos | Nomenclatura Comum do Mercosul |
| status | ENUM StatusMaterial | não | ATIVO, INATIVO | Inativação lógica |
| criadoPorId | TEXT | não | FK → User | |
| atualizadoPorId | TEXT | N | FK → User | Preenchido na edição/alteração de status |
| createdAt / updatedAt | TIMESTAMP | não | | |

## Tabela `AuditLog` — trilha de auditoria
| Coluna | Tipo | Nulo | Restrição | Descrição |
|---|---|---|---|---|
| id | TEXT | não | PK | |
| entidade | TEXT | não | Material, Familia, Grupo, Subgrupo, User | Tipo do registro afetado |
| entidadeId | TEXT | não | | Id do registro afetado |
| acao | ENUM AcaoAuditoria | não | CRIACAO, EDICAO, INATIVACAO, REATIVACAO, LOGIN | |
| detalhes | JSONB | N | | Campos alterados (antes/depois), motivo da inativação |
| usuarioId | TEXT | não | FK → User | Autor da ação |
| createdAt | TIMESTAMP | não | | Momento da ação |
