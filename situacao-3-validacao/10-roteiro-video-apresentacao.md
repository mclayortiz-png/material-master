# 10 — Roteiro do vídeo de apresentação (até 5 minutos)

Grave a tela com narração sua. Tempos aproximados.

| Tempo | Cena | O que mostrar | O que dizer |
|---|---|---|---|
| 0:00–0:30 | Abertura | Slide/README com nome do projeto | "Sou Marcio C. Silva. O MATERIAL MASTER é um sistema de governança de cadastro mestre de materiais. Resolve duplicidade e falta de padronização em suprimentos e manutenção." |
| 0:30–1:00 | Arquitetura | Diagrama MVC (doc 06) e DER (doc 03) | "Arquitetura em camadas MVC: modelo com regras de negócio, controladores de API com autorização no servidor e views em React. Banco PostgreSQL com integridade referencial." |
| 1:00–1:30 | Login e perfis | Entrar como Consulta, mostrar menu reduzido; tentar /materiais/novo e ser bloqueado | "Três perfis. A autorização é verificada no servidor, não apenas escondendo botões." |
| 1:30–2:30 | Cadastro de material | Entrar como Gestor, Novo material, selects em cascata, erro de validação proposital (NCM com 5 dígitos), salvar, código MAT gerado | "Código único e imutável gerado por sequência atômica. Validação por campo em português." |
| 2:30–3:15 | Edição, inativação e histórico | Editar descrição; inativar com motivo; mostrar histórico | "Nada é excluído: inativação lógica com motivo obrigatório e trilha de auditoria de quem fez o quê." |
| 3:15–3:50 | Classificações | Entrar como Admin, criar subgrupo, tentar inativar família em uso e ver a confirmação | "Hierarquia Família → Grupo → Subgrupo com regras de integridade." |
| 3:50–4:20 | Testes | Rodar `testes-integracao.ts` no terminal mostrando 29/29; mostrar tabela do doc 08 | "29 testes de integração e 10 testes de ponta a ponta, incluindo concorrência na geração de código." |
| 4:20–4:50 | Validação por pares e próximos passos | Mostrar formulário 09 e tabela de RF | "A validação por pares será feita com este formulário, com cinco testadores; os resultados e as correções decorrentes serão anexados ao repositório quando a rodada for concluída. Próximas fases: dashboard, aprovações, duplicidades e exportação CSV." **(Se, na data da gravação, os testes já tiverem sido realizados, substitua pela quantidade real de testadores e pelos achados efetivamente registrados nos formulários preenchidos. Não afirme que os testes ocorreram antes de tê-los concluído.)** |
| 4:50–5:00 | Encerramento | README no GitHub | "Código, documentação e testes estão no repositório. Obrigado." |

## Dicas
- Prepare os dados antes: um material para editar, uma família com grupos para o teste de confirmação.
- Grave em 1080p, zoom do navegador em 110–125 % para legibilidade.
- Se a versão do vídeo for a da Situação 3 ("quais mudanças foram adotadas"), substitua a cena 4:20–4:50 por antes/depois das correções sugeridas pelos testadores.
