# MATERIAL MASTER — Projeto Integrador em Engenharia de Software II

Sistema web de Gestão, Padronização e Governança de Cadastros de Materiais.
**Universidade:** Cruzeiro do Sul Virtual · **Autor:** Marcio C. Silva.

## Estado do repositório (15/11/2026)

- **GitHub:** [mclayortiz-png/material-master](https://github.com/mclayortiz-png/material-master), repositório **privado**; branch principal `main`.
- **Aplicação demonstrada no AbacusAI:** https://material-master.abacusai.app — publicação informada pela plataforma; disponibilidade e versão em produção precisam ser confirmadas separadamente.
- **Versão publicada na `main`:** MVP com autenticação, perfis, cadastro/consulta/edição/inativação de materiais, hierarquia Família → Grupo → Subgrupo e trilha básica de auditoria.
- **Banco:** PostgreSQL com Prisma. O repositório contém o esquema de dados, **não** uma cópia do banco em produção.
- **Testes com evidências na `main`:** logs históricos de **29/29 integrações** e **10/10 fluxos E2E**, executados anteriormente pelo AbacusAI. Esses logs não equivalem a uma execução de CI pelo GitHub.
- **QA incremental (AbacusAI):** relatório informado de 29 unitários, 47 integrações, 10 E2E e 2 verificações estáticas (88 no total); **ainda requer sincronização/publicação no GitHub e verificação das evidências**. O código mais recente pode diferir do que está na `main`.
- **Testes humanos (Situação 3):** cinco avaliações reais, seus formulários e o vídeo final **pendentes**. Não existem resultados fictícios.
- **Funcionalidades futuras (RF10–RF13):** dashboard avançado, workflow de solicitações/aprovações, detecção de duplicidades/padronização e exportação CSV. Não afirmar que estão implementadas.

## Organização acadêmica

- `situacao-1-planejamento/`: requisitos, modelagem UML, banco e dicionário de dados, IHC.
- `situacao-2-desenvolvimento/`: arquitetura, manual, relatório de testes e `codigo-fonte/nextjs_space/` (Next.js/React/TypeScript, APIs, Prisma).
- `situacao-3-validacao/`: modelo de avaliação por pares e roteiro de vídeo. Os cinco relatórios reais ainda precisam ser adicionados.
- `auditoria/`: relatório de prontidão, plano de deploy e logs históricos.
- `evidencias/`: três capturas de tela de testes anteriores.

## Como executar o código em ambiente isolado

Pré-requisitos: Node.js conforme `engines` em `package.json`, Yarn e PostgreSQL. Não utilize o banco de produção para executar seeds ou testes.

```bash
cd situacao-2-desenvolvimento/codigo-fonte/nextjs_space
yarn install
cp .env.example .env
# Preencha DATABASE_URL de um banco de desenvolvimento/QA e gere AUTH_SECRET/NEXTAUTH_SECRET seguros.
yarn prisma generate
yarn prisma db push
yarn prisma db seed
yarn build
yarn start
```

O arquivo `.env` contém segredos e **não deve ser versionado**. O `.env.example` apresenta somente valores fictícios. Para configuração de demonstração e implantação, consulte `auditoria/deploy-demonstracao.md`.

### Verificação e testes

```bash
yarn tsc --noEmit
yarn build
# Apenas com banco e servidor QA isolados, adequadamente configurados:
yarn tsx --require dotenv/config scripts/testes-integracao.ts
```

O script de integração cria e modifica dados de teste. **Nunca execute contra produção.** As verificações históricas e seus resultados estão em `auditoria/logs/` e `situacao-2-desenvolvimento/08-relatorio-de-testes-verificacao.md`. Alterações propostas em branches ainda não mescladas precisam ser testadas novamente antes do deploy.

## Notas de autorização e implantação

- O controle de acesso é realizado nas APIs; componentes visuais sozinhos não concedem permissão.
- Alterações de perfil e inativação de usuário devem ser revalidadas por sessão. A correção proposta está em branch de revisão e não altera automaticamente a aplicação publicada.
- O GitHub armazena **código e documentação**; o banco e a aplicação hospedada no AbacusAI são ambientes separados.
- Não existe pipeline GitHub Actions configurado atualmente; adicionar CI é uma atividade futura.

## Próximos passos

1. Revisar e executar os testes das correções de sessão e do build em uma cópia QA isolada.
2. Sincronizar a auditoria incremental do AbacusAI por branch e pull request, reconciliando diferenças.
3. Conferir o aplicativo publicado e coletar os cinco testes com pessoas reais.
4. Consolidar documentação, evidências, vídeo e orientação de acesso ao repositório para a banca.
