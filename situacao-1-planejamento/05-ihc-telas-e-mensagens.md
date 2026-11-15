# 05 — IHC: mapa de telas, mensagens e princípios aplicados

## 5.1 Mapa de navegação

```mermaid
flowchart LR
  L[/login] --> I[/inicio]
  L --> C[/cadastro autocadastro]
  I --> M[/materiais lista e filtros]
  M --> N[/materiais/novo]
  M --> D[/materiais/:id detalhe + histórico]
  D --> E[/materiais/:id/editar]
  I --> H[/classificacoes admin]
  I --> U[/usuarios admin]
  I --> P[/sem-permissao]
```

## 5.2 Inventário de telas
| Tela | Perfis | Elementos principais |
|---|---|---|
| Login | todos | e-mail, senha, botão Entrar, link para autocadastro; erro "E-mail ou senha inválidos." |
| Autocadastro | público | nome, e-mail, senha; cria perfil Consulta |
| Início | todos | saudação, contadores (materiais ativos/inativos, famílias), últimas ações de auditoria, atalhos por perfil |
| Materiais | todos | busca textual, filtros Família/Grupo/Subgrupo/Status, paginação, botão Novo (gestor/admin) |
| Novo / Editar material | gestor, admin | formulário com selects em cascata, validação por campo, código exibido como somente leitura na edição |
| Detalhe do material | todos | dados, badge de status, histórico (quem/quando/o quê), ações Inativar/Reativar (gestor/admin) |
| Classificações | admin | abas Família/Grupo/Subgrupo, criar, editar, inativar com confirmação quando em uso |
| Usuários | admin | lista, criar, alterar perfil, ativar/inativar |
| Sem permissão | todos | explicação e link para o início |

## 5.3 Catálogo de mensagens (pt-BR)
| Situação | Mensagem |
|---|---|
| Campo obrigatório | "Descrição curta é obrigatória." / "Família é obrigatória." |
| Tamanho | "Descrição curta deve ter pelo menos 3 caracteres." |
| NCM | "NCM deve conter exatamente 8 dígitos." |
| Código de classificação | "Código deve conter apenas letras e números." |
| Duplicidade | "Já existe uma família com o código X." / "Já existe um grupo com o código X nesta família." / "Já existe um subgrupo com o código X neste grupo." + erro de campo "Código já utilizado" (HTTP 409) |
| Hierarquia | "O grupo informado não pertence à família selecionada." |
| Em uso | "Esta família possui grupos/materiais vinculados. Confirme para inativar." (409 requerConfirmacao) |
| Autorização | "Você não tem permissão para executar esta ação." (403 na API) / redirecionamento para /sem-permissao nas telas |
| Sessão | redirecionamento para /login (401) |
| Sucesso | "Material criado com sucesso." / "Alterações salvas." / "Material inativado." |
| Motivo | "Informe o motivo da inativação." |

## 5.4 Princípios de IHC do material da disciplina → como foram aplicados
| Princípio | Aplicação |
|---|---|
| Claro | Rótulos em pt-BR, mensagens específicas por campo, badges de status com cor |
| Consistente | Mesmos componentes (botões, tabelas, diálogos) em todas as telas; padrão de confirmação único |
| Simples | Selects em cascata reduzem opções; campos opcionais agrupados abaixo dos obrigatórios |
| Controlado pelo usuário | Nenhuma ação destrutiva sem confirmação; motivo obrigatório na inativação |
| Direto | Após salvar, redireciona ao detalhe mostrando o resultado |
| Reversível | Inativação lógica com reativação; nada é excluído |
| Com feedback | Toasts de sucesso/erro, estados de carregamento nos botões |
| Estético | Tema único (teal), espaçamento generoso, responsivo ≥ 390 px |

## 5.5 Evidências visuais
Capturas de tela do MVP (desktop admin, detalhe de material, celular com perfil Consulta) acompanham o pacote na pasta `evidencias/`.
