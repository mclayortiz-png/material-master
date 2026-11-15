# MATERIAL MASTER — Consolidado de entrega e evidências (15/11/2026)

**Curso:** Engenharia de Software — Projeto Integrador II  
**Autor:** Marcio C. Silva  
**Repositório:** https://github.com/mclayortiz-png/material-master  
**Aplicação prevista para demonstração:** https://material-master.abacusai.app (disponibilidade e versão NÃO verificadas nesta entrega)

## Escopo efetivamente implementado no MVP

- Autenticação e três perfis: ADMINISTRADOR, GESTOR_CADASTRO e CONSULTA.
- Cadastro, edição, consulta, pesquisa e inativação lógica de materiais.
- Hierarquia Família → Grupo → Subgrupo e unidades de medida.
- Código de material gerado automaticamente.
- Trilha básica de auditoria de alterações e controle de permissão no servidor.
- Revalidação de perfil e status de contas autenticadas no fluxo de sessão JWT.

Não apresentar como implementados: fluxo de aprovação multinível, detecção automatizada de duplicidades, padronização completa por PDM, exportação CSV ou dashboard avançado, sem nova comprovação.

## Evidências verificáveis de integração contínua

- Workflow `ci-mvp.yml`: verificação TypeScript e compilação Next.js aprovada.
- Workflow `ci-integracao.yml`: PostgreSQL 16 descartável, geração do Prisma Client, `prisma db push`, seed em QA, servidor e testes HTTP/banco aprovados.
- Suíte `scripts/testes-integracao.ts`: **30 de 30 testes aprovados**, registrados em GitHub Actions na execução https://github.com/mclayortiz-png/material-master/actions/runs/43715174713 .
- Após a migração `actions/checkout@v5` e `actions/setup-node@v5`, as duas verificações foram reexecutadas com sucesso; a execução de integração voltou a registrar 30/30.
- Resultados de E2E/Playwright descritos em `situacao-2-desenvolvimento/08-relatorio-de-testes-verificacao.md` são históricos (10/10). Não foram reexecutados na última CI.

## Itens acadêmicos pendentes — NÃO inventar dados

- Cinco avaliações reais com participantes, formulários e análise das respostas.
- Vídeo final da Situação 3.
- Capturas atuais da interface publicada, acesso e identificação da versão hospedada.
- Confirmação das exigências específicas e do formato de submissão na plataforma acadêmica.

## Cuidados antes da publicação externa

- Verificar que o código publicado no AbacusAI corresponde à versão aprovada no GitHub.
- Separar banco de desenvolvimento, QA e produção, sem usar `prisma db seed` no banco real inadvertidamente.
- Usar segredos de sessão seguros e senhas fortes, sem credenciais padrão de demonstração.
- Confirmar HTTPS, login, controle de perfis, cadastro/consulta e auditoria com contas próprias de teste.
- Não divulgar acesso administrativo a avaliadores; inativar usuários de teste após a atividade.

## Limitações declaradas

O GitHub Actions comprova os cenários executados em ambiente isolado, não a disponibilidade ou segurança completa da aplicação publicada. A mesclagem na `main` não efetua deploy automático no AbacusAI. A validação com usuários reais continua indispensável para declarar a Situação 3 concluída.
