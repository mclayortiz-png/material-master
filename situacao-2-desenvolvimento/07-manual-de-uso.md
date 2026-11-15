# 07 — Manual de uso

## 7.1 Acesso
Abra o endereço da aplicação. Você verá a tela de login.

Contas de demonstração:
| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@materialmaster.com.br | Admin@123 |
| Gestor de Cadastro | gestor@materialmaster.com.br | Gestor@123 |
| Consulta | consulta@materialmaster.com.br | Consulta@123 |

Quem não possui conta pode usar **Criar conta** (autocadastro); a conta nasce com perfil Consulta e só um Administrador pode promovê-la.

## 7.2 Página inicial
Mostra contadores de materiais e classificações, as últimas ações registradas e atalhos conforme seu perfil. O menu lateral (ou o botão ☰ no celular) dá acesso às demais áreas.

## 7.3 Pesquisar materiais (todos os perfis)
1. Menu **Materiais**.
2. Digite parte do código, descrição, fabricante ou part number na busca.
3. Refine por Família, Grupo, Subgrupo e Status.
4. Use a paginação no rodapé da tabela.
5. Clique na linha para abrir o **detalhe**, com todos os dados e o **histórico** (quem criou, editou, inativou e quando).

## 7.4 Cadastrar material (Gestor e Administrador)
1. Em **Materiais**, clique **Novo material**.
2. Preencha a descrição curta (obrigatória), unidade de medida e a classificação: escolha a Família → a lista de Grupos é filtrada → escolha o Subgrupo.
3. Opcionalmente informe descrição técnica, fabricante, part number e NCM (8 dígitos).
4. Clique **Salvar**. O sistema gera o código (ex.: `MAT-000021`) e abre o detalhe.

Erros são mostrados abaixo de cada campo. O código **não pode** ser alterado depois.

## 7.5 Editar material
No detalhe, clique **Editar**, altere os campos e salve. A alteração fica registrada no histórico com os campos modificados.

## 7.6 Inativar e reativar
No detalhe, clique **Inativar**, informe o **motivo** (obrigatório) e confirme. O material deixa de aparecer como ativo, mas nunca é apagado. Para voltar, clique **Reativar**.

## 7.7 Gerenciar classificações (Administrador)
Menu **Classificações** → abas Famílias, Grupos e Subgrupos. Crie informando código (letras/números, até 10) e nome. Para inativar um item em uso, o sistema pede confirmação. Um grupo só pode ser reativado se a família estiver ativa; grupos com materiais não podem mudar de família.

## 7.8 Gerenciar usuários (Administrador)
Menu **Usuários** → criar usuário com perfil, alterar perfil, ativar/inativar. Usuário inativo não consegue entrar. Você não pode inativar a própria conta.

## 7.9 Mensagens comuns
| Mensagem | O que fazer |
|---|---|
| "E-mail ou senha inválidos." | Confira as credenciais ou se a conta está ativa |
| "Você não tem permissão para executar esta ação." | Peça ao administrador para ajustar seu perfil |
| "NCM deve conter exatamente 8 dígitos." | Informe apenas números, 8 dígitos |
| "Já existe uma família com o código X." / "Já existe um grupo com o código X nesta família." / "Já existe um subgrupo com o código X neste grupo." (campo: "Código já utilizado") | Escolha outro código para a classificação |

## 7.10 Executar localmente (para o tutor/avaliador)
```bash
cd codigo-fonte/nextjs_space
cp .env.example .env         # preencha DATABASE_URL (PostgreSQL), NEXTAUTH_SECRET e AUTH_SECRET
                             # (gere os segredos com: openssl rand -base64 32)
yarn install
yarn prisma generate
yarn prisma db push          # cria as tabelas
yarn prisma db seed          # carga inicial (executa scripts/safe-seed.ts -> scripts/seed.ts)
yarn dev                     # abre em http://localhost:3000
```
Pré-requisitos: Node.js 20+, Yarn 4 (`corepack enable`) e PostgreSQL 14+.

**Senhas das contas de demonstração:** as senhas padrão (`Admin@123`, `Gestor@123`, `Consulta@123`) são aplicadas pelo seed somente em desenvolvimento. Em produção (`NODE_ENV=production`) ou com `SEED_SENHAS_ALEATORIAS=true`, o seed usa `SEED_SENHA_ADMIN`, `SEED_SENHA_GESTOR` e `SEED_SENHA_CONSULTA` ou gera senhas aleatórias exibidas uma única vez no console (ver `.env.example`).
