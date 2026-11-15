# 06 — Arquitetura e justificativa técnica

## 6.1 Padrão arquitetural: MVC em camadas
A disciplina recomenda MVC. O projeto aplica o padrão na forma moderna de aplicações web:

| Camada MVC | Onde está no código | Responsabilidade |
|---|---|---|
| **Model** | `prisma/schema.prisma`, `lib/validacoes.ts`, `lib/hierarquia.ts`, `lib/codigo.ts`, `lib/audit.ts`, `lib/perfis.ts` | Estrutura dos dados, domínios, regras de negócio, geração de código, auditoria |
| **Controller** | `app/api/**/route.ts` (materiais, familias, grupos, subgrupos, unidades, usuarios, auth, signup) + `lib/authz.ts` | Recebe requisições HTTP, autentica/autoriza, valida, chama o modelo, responde JSON com códigos HTTP corretos |
| **View** | `app/(app)/**/page.tsx`, `components/**` | Telas, formulários, feedback ao usuário; nunca contém regra de negócio |
| **Router** | Sistema de rotas por arquivos (`app/`) | Mapeia URL → controller/view, como na Figura 2 do material |

Fluxo: Usuário → requisição HTTP → Router → Controller (`route.ts`) ⇄ Model (banco) → View (HTML/JSON) → Usuário.

## 6.2 Stack adotada
| Item | Escolha |
|---|---|
| Linguagem | TypeScript (front-end e back-end) |
| Front-end | HTML5, CSS (Tailwind), JavaScript/React |
| Back-end | Rotas de API no servidor Node.js |
| Persistência | PostgreSQL com ORM e migrações versionadas |
| Autenticação | Sessões assinadas (JWT) + bcrypt |
| Validação | zod (esquemas com mensagens pt-BR) |
| Testes | Testes de integração via HTTP (TypeScript) e testes E2E no navegador (Playwright/Python) |

## 6.3 Justificativa da linguagem (ponto que a banca pode questionar)
A orientação da Situação 2 sugere Java, PHP, C#, .NET ou Python, **"o que você estiver melhor familiarizado(a)"**, e indica explicitamente HTML/CSS/JavaScript para o front-end. Optou-se por TypeScript/JavaScript em toda a pilha porque:
1. É a linguagem já obrigatória no front-end; usá-la também no back-end elimina duplicação de modelos e validações (o mesmo esquema zod protege formulário e API).
2. Node.js e TypeScript estão entre as tecnologias mais demandadas pelo mercado, cumprindo o objetivo do repositório como "CV permanente".
3. O padrão MVC é preservado integralmente, que é o requisito conceitual da disciplina — o padrão independe da linguagem.
4. A plataforma de desenvolvimento assistido utilizada atua como acelerador *low-code* para o front-end, exatamente como o material incentiva, enquanto a "inteligência de processamento" (regras de negócio) foi programada manualmente.

## 6.4 Segurança
- Autorização verificada **no servidor** em toda rota (`exigirSessao(perfis)`); esconder botões na UI é apenas conveniência.
- Senhas com bcrypt; sessão em cookie HttpOnly.
- Nenhuma rota DELETE aceita (405) — governança de dados mestres.
- Validação de entrada antes de qualquer acesso ao banco.

## 6.5 Extensibilidade planejada (fases seguintes — RF10–RF13)
| Requisito | Preparação já existente |
|---|---|
| Dashboard | Índices por status/família/createdAt; kit de visualização já instalado |
| Solicitações e aprovações | Perfis separados; `AuditLog` pronto para registrar APROVACAO/REJEICAO; nova tabela `Solicitacao` |
| Duplicidades | `descricaoCurta` indexada; comparação por similaridade (trigram) sem mesclar automaticamente |
| Exportação CSV | Mesmo filtro da listagem, resposta `text/csv` |
