# 02 — Modelagem UML

Diagramas em sintaxe Mermaid (renderizam no GitHub, VS Code e em https://mermaid.live).

## 2.1 Diagrama de casos de uso

```mermaid
flowchart LR
  subgraph Sistema[MATERIAL MASTER]
    UC1((Autenticar-se))
    UC2((Pesquisar materiais))
    UC3((Visualizar material e histórico))
    UC4((Cadastrar material))
    UC5((Editar material))
    UC6((Inativar / reativar material))
    UC7((Gerenciar hierarquia de classificação))
    UC8((Gerenciar usuários))
    UC9((Autocadastro))
  end
  Consulta --> UC1 & UC2 & UC3 & UC9
  Gestor[Gestor de Cadastro] --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
  Admin[Administrador] --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
```

## 2.2 Diagrama de classes (domínio / persistência)

```mermaid
classDiagram
  class Usuario {
    +id: String
    +name: String
    +email: String «unique»
    +password: String «hash»
    +perfil: Perfil
    +ativo: Boolean
    +createdAt, updatedAt
  }
  class Familia {
    +id, codigo «unique», nome, ativo
  }
  class Grupo {
    +id, codigo, nome, ativo
    +familiaId
  }
  class Subgrupo {
    +id, codigo, nome, ativo
    +grupoId
  }
  class UnidadeMedida {
    +id, sigla «unique», nome, ativo
  }
  class Material {
    +id
    +codigo: String «unique, imutável»
    +descricaoCurta, descricaoLonga
    +fabricante, partNumber, ncm
    +status: StatusMaterial
    +criadoPorId, atualizadoPorId
    +createdAt, updatedAt
  }
  class CodigoSequencia {
    +prefixo «PK»
    +ultimo: Int
    +proximoCodigo()
  }
  class AuditLog {
    +id, entidade, entidadeId
    +acao: AcaoAuditoria
    +detalhes: Json
    +usuarioId, createdAt
  }
  class Perfil { <<enumeration>> ADMINISTRADOR; GESTOR_CADASTRO; CONSULTA }
  class StatusMaterial { <<enumeration>> ATIVO; INATIVO }
  class AcaoAuditoria { <<enumeration>> CRIACAO; EDICAO; INATIVACAO; REATIVACAO; LOGIN }

  Familia "1" --> "*" Grupo
  Grupo "1" --> "*" Subgrupo
  Familia "1" --> "*" Material
  Grupo "1" --> "*" Material
  Subgrupo "1" --> "*" Material
  UnidadeMedida "1" --> "*" Material
  Usuario "1" --> "*" Material : criadoPor
  Usuario "0..1" --> "*" Material : atualizadoPor
  Usuario "1" --> "*" AuditLog
  Material ..> CodigoSequencia : usa ao criar
```

## 2.3 Diagrama de sequência — Cadastrar material

```mermaid
sequenceDiagram
  actor G as Gestor de Cadastro
  participant V as View (MaterialForm)
  participant C as Controller (POST /api/materiais)
  participant A as authz.exigirSessao
  participant Z as validacoes.materialSchema
  participant H as hierarquia.validarCadeia
  participant S as codigo.proximoCodigo
  participant DB as PostgreSQL
  G->>V: Preenche formulário e envia
  V->>C: JSON do material
  C->>A: exigirSessao([ADMINISTRADOR, GESTOR_CADASTRO])
  A-->>C: sessão ou 401/403
  C->>Z: parse(body)
  Z-->>C: dados ou 400 {campos}
  C->>H: família→grupo→subgrupo coerentes e ativos?
  H-->>C: ok ou 400
  C->>DB: BEGIN
  C->>S: UPDATE CodigoSequencia SET ultimo = ultimo+1 RETURNING
  S-->>C: MAT-000021
  C->>DB: INSERT Material + INSERT AuditLog(CRIACAO)
  C->>DB: COMMIT
  C-->>V: 201 {material}
  V-->>G: Toast "Material criado" e redireciona ao detalhe
```

## 2.4 Diagrama de sequência — Inativar material

```mermaid
sequenceDiagram
  actor G as Gestor
  participant V as View (StatusMaterial)
  participant C as PATCH /api/materiais/:id/status
  participant DB as PostgreSQL
  G->>V: Clica "Inativar"
  V->>G: Diálogo pede motivo (obrigatório)
  G->>V: Informa motivo e confirma
  V->>C: {status: INATIVO, motivo}
  C->>C: exigirSessao + validar motivo
  C->>DB: UPDATE Material SET status=INATIVO, atualizadoPor
  C->>DB: INSERT AuditLog(INATIVACAO, {motivo})
  C-->>V: 200
  V-->>G: Badge "Inativo" + histórico atualizado
```

## 2.5 Diagrama de atividades — Inativar classificação em uso

```mermaid
flowchart TD
  A[Admin solicita inativar Família] --> B{Possui grupos/materiais ativos?}
  B -- Não --> E[Inativa e registra auditoria]
  B -- Sim --> C[API responde 409 requerConfirmacao]
  C --> D{Admin confirma?}
  D -- Não --> F[Operação cancelada]
  D -- Sim --> G[Reenvia com confirmar=true]
  G --> E
  E --> H[Família indisponível para novos materiais]
```

## 2.6 Diagrama de estados — Material

```mermaid
stateDiagram-v2
  [*] --> ATIVO : criação (código gerado)
  ATIVO --> INATIVO : inativar (motivo obrigatório)
  INATIVO --> ATIVO : reativar
  note right of INATIVO : Registro nunca é excluído fisicamente
```
