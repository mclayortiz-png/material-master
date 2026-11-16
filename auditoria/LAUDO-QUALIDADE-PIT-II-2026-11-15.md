# Laudo de Qualidade — PIT II / MATERIAL MASTER

**Data-base:** 15/11/2026 (horário de Brasília).  
**Objeto:** MVP acadêmico de gestão de materiais, código-fonte, testes e dependências.  
**Responsável acadêmico:** Marcio C. Silva.  
**Repositório:** https://github.com/mclayortiz-png/material-master

## 1. Escopo e método

Confronto entre o modelo obrigatório da PIT II fornecido pelo aluno, a documentação da PIT I (`situacao-1-planejamento/`), o código Next.js/TypeScript, o banco Prisma/PostgreSQL, o histórico de Pull Requests e os testes automatizados com banco isolado. Não foram inventados resultados de testes humanos ou de deploy. Repositório permanece privado até revisão de segurança e autorização do autor.

## 2. Defeitos e correções verificadas

| Identificação | Evidência inicial | Correção | Evidência de verificação |
|---|---|---|---|
| NC-01 - sessão JWT com perfil desatualizado | Histórico da PR nº 1 | Revalidação do perfil/ativo no banco em callbacks | Teste de rebaixamento retorna HTTP 403; inativação retorna HTTP 401 |
| NC-02 - compilação ignorava TypeScript | Alteração de `next.config.js` | `ignoreBuildErrors: false` | CI `tsc --noEmit` e `yarn build` aprovados |
| NC-03 - inconsistência do lockfile | Falhas históricas de CI na PR nº 1 | Yarn 4.9.4 / `yarn.lock` sincronizado | `yarn install --immutable` aprovado |
| NC-04 - ações do GitHub usando runtime obsoleto | Aviso no GitHub Actions | `checkout@v5`, `setup-node@v5` | Logs posteriores de CI sem aviso de Node 20 |
| NC-05 - vulnerabilidades de pacotes | Dependabot: 5 alertas (2 moderados, 3 baixos) | PR nº 2: csv 6.6.4, minimatch 11.0.1, fast-xml-parser 5.12.1, webpack 5.104.1 | CI da PR nº 2 aprovada (30/30); confirmação de baixa dos alertas **ainda pendente** |
| NC-06 - documentação README desatualizada | Texto negava existência de CI | README e relatório de testes atualizados | Commits versionados no GitHub |

## 3. Cinco alertas inicialmente identificados

| Dependência | Versão anterior | Versão corrigida resolvida | Severidade | Referência |
|---|---|---|---|---|
| csv-parse | 5.6.0 | 7.0.3 | Moderada | GHSA-8cw4-87c7-c6xx |
| minimatch | 10.2.6 | 11.0.1 | Moderada | GHSA-g3hv-75wg-m249 |
| fast-xml-parser | 5.10.1 | 5.12.1 | Baixa | GHSA-474x-hrwr-fgx4 |
| webpack / userinfo | 5.99.5 | 5.104.1 | Baixa | GHSA-8fgc-7cc6-rx7x |
| webpack / redirect | 5.99.5 | 5.104.1 | Baixa | GHSA-38r7-794h-5758 |

A alteração das versões não prova que o ambiente AbacusAI esteja atualizado; tampouco substitui conferir a contagem de alertas do Dependabot após o processamento do lockfile.

## 4. Evidências automatizadas verificadas

**PR nº 1** (alterações iniciais):
- https://github.com/mclayortiz-png/material-master/actions/runs/43771629838 — testes HTTP e PostgreSQL: 30 de 30 aprovados.
- https://github.com/mclayortiz-png/material-master/actions/runs/43771629849 — TypeScript e compilação aprovados.

**PR nº 2** (correção de dependências):
- https://github.com/mclayortiz-png/material-master/pull/2
- https://github.com/mclayortiz-png/material-master/actions/runs/43782365882 — PostgreSQL isolado, 30/30 casos aprovados.
- https://github.com/mclayortiz-png/material-master/actions/runs/43782365877 — TypeScript e build aprovados.
- Merge na `main`: `e0163280f6c5b960a2696c310d99512044fca930`.

A suíte histórica de 10 fluxos E2E está documentada em `situacao-2-desenvolvimento/08-relatorio-de-testes-verificacao.md`; não se deve afirmar sua reexecução na CI da PR nº 2.

## 5. Limitações e condições para 100% de aderência acadêmica

1. RGM deve ser inserido pelo aluno.
2. O formulário pede GitHub com **códigos abertos**: repositório ainda privado; requer mudança de visibilidade após verificação final ou autorização institucional para acesso privado.
3. O endereço `https://material-master.abacusai.app` está documentado, mas a versão publicada, HTTPS, banco de produção separado e login real ainda exigem prova.
4. Cinco colegas devem testar a solução com nome, data, resultados positivos e negativos e escopo não testado.
5. Vídeo narrado mínimo 5 minutos e vídeo de solução atualizada até 5 minutos devem ter links verificáveis; são campos distintos do modelo.
6. O painel Dependabot deve ser revisitado após o merge para comprovar baixa dos cinco avisos, sem dispensar alertas.
7. Avisos de peer dependencies de React, react-dom, date-fns e eslint-plugin-prettier permanecem como risco de manutenção, não classificados nesta amostra como os cinco alertas de segurança.

**Parecer:** evolução de software e correções rastreáveis com provas de CI, mas aderência acadêmica integral não comprovada até a execução das atividades humanas, publicação verificável e preenchimento dos campos obrigatórios. Não emitir '100% concluído' antes disso.
