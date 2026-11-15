# MATERIAL MASTER — Pacote de documentação do Projeto Integrador II

Sistema de Gestão, Padronização e Governança de Cadastros de Materiais.
Projeto Integrador Transdisciplinar em Engenharia de Software II — Universidade Cruzeiro do Sul Virtual.
Autor: Marcio C. Silva.

## Estrutura sugerida para o repositório GIT

```
material-master/
├── README.md                      (este arquivo)
├── situacao-1-planejamento/
│   ├── 01-visao-e-requisitos.md
│   ├── 02-modelagem-uml.md        (classes, casos de uso, sequência, atividades)
│   ├── 03-projeto-banco-de-dados.md (conceitual, lógico normalizado, físico)
│   ├── 04-dicionario-de-dados.md
│   └── 05-ihc-telas-e-mensagens.md
├── situacao-2-desenvolvimento/
│   ├── 06-arquitetura-e-justificativa-tecnica.md
│   ├── 07-manual-de-uso.md
│   ├── 08-relatorio-de-testes-verificacao.md
│   └── codigo-fonte/              (conteúdo de material_master_codigo.zip)
└── situacao-3-validacao/
    ├── 09-template-teste-por-pares.md
    ├── 10-roteiro-video-apresentacao.md
    └── relatorios-dos-testadores/ (5 PDFs preenchidos — a coletar)
```

## Como publicar no GitHub (feito por você, fora desta plataforma)

1. Crie um repositório público `material-master` em https://github.com/new.
2. Descompacte `material_master_codigo_auditado.zip` (cópia auditada e sanitizada — sem `.env`, logs ou arquivos internos da plataforma de hospedagem) e mova o conteúdo da pasta `material-master/` para `situacao-2-desenvolvimento/codigo-fonte/`.
3. Copie os arquivos `.md` deste pacote para as pastas acima.
4. No terminal da sua máquina:
   ```bash
   git init && git add . && git commit -m "PIT II - Material Master: documentação e MVP"
   git branch -M main
   git remote add origin https://github.com/<seu-usuario>/material-master.git
   git push -u origin main
   ```
5. **Nunca** envie o arquivo `.env` (já está excluído do zip e bloqueado pelo `.gitignore`). Use o `.env.example` incluído e gere segredos novos com `openssl rand -base64 32`.
6. Antes do `git push`, confira: `git status --ignored | grep .env` deve listar apenas `.env` como ignorado, e `git ls-files | grep -E "\.env$|\.pem$|\.key$"` não deve retornar nada.
7. O relatório de prontidão para publicação (`auditoria/RELATORIO-PRONTIDAO-PUBLICACAO.md`) descreve as verificações feitas, os riscos remanescentes e a configuração de deploy de demonstração.

## Estado atual (honesto)

| Entrega | Situação |
|---|---|
| MVP funcional (auth, RBAC, materiais, hierarquia, auditoria básica) | Concluído e testado (29 testes de integração + 10 E2E) |
| Documentação Situação 1 e 2 | Concluída neste pacote |
| Repositório GIT público | Pendente — depende de ação sua (passos acima) |
| Dashboard, solicitações/aprovações, duplicidades, exportação CSV | Fases seguintes (não iniciadas por decisão de escopo) |
| Testes com 5 colegas (PDF) | Pendente — template pronto em 09 |
| Vídeo de até 5 min | Pendente — roteiro pronto em 10 |
| Deploy público para os testadores | Pendente — exige sua autorização (configuração preparada em `auditoria/deploy-demonstracao.md`) |
| Auditoria de prontidão para publicação | Concluída — ver `auditoria/RELATORIO-PRONTIDAO-PUBLICACAO.md` |
