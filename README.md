# Jogo da Velha Multiplayer

**UNIFOR · Desenvolvimento de Software em Nuvem · Grupo 4**

Jogo online para duas pessoas, com cadastro, salas por código, estado persistido e classificação. O perfil principal segue o plano entregue pelo grupo. O mesmo frontend também inclui um perfil Back4App para atender às ferramentas citadas no enunciado.

| Ambiente | Backend e identidade | Frontend |
|---|---|---|
| Plano do grupo | Hasura v2, PostgreSQL e Auth0 | React, Vite, Apollo Client, Codespaces e Azure Static Web Apps |
| Perfil do enunciado | Back4App com Parse, Cloud Code e autenticação do Parse | React e Vite no Replit. Azure também aceita este perfil |
| Demonstração offline | Duas sessões simuladas com dados do próprio navegador | Abra o arquivo `Demonstracao_Local.html` |

## Rodar o código

Use Node.js 22. Com Docker Compose disponível é possível executar Hasura e PostgreSQL localmente. O modo local completo também precisa de um tenant Auth0 para login pelo navegador.

```bash
npm ci
npm test
npm run build
cp .env.example .env
npm run dev
```

Preencha o arquivo `.env` antes de testar o login. Para reconstruir a demonstração offline com a interface do projeto:

```bash
node scripts/build-demo.mjs Demonstracao_Local.html
```

## Hasura e PostgreSQL

1. Provisione PostgreSQL 16 em um banco dedicado. Execute `backend/schema.sql` uma vez no banco vazio, com `psql "$PG_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql`. Use a URL com TLS no serviço gerenciado.
2. No Auth0 crie uma aplicação **Single Page Application**, habilite a conexão de banco de usuários e crie uma API RS256 com identificador `https://jogo-da-velha/api` ou outro identificador do grupo. Use o mesmo identificador em todas as configurações.
3. Crie uma Action no fluxo **Login / Post Login** com o conteúdo de `backend/auth0-action.cjs`. Adicione o secret `HASURA_AUDIENCE`, publique a Action e arraste-a para o fluxo. O access token inclui a identidade autenticada e o papel `jogador`.
4. Na aplicação Auth0, adicione cada origem real do frontend a **Allowed Callback URLs**, **Allowed Logout URLs** e **Allowed Web Origins**. Use, conforme o ambiente, `http://localhost:5173`, a origem HTTPS da porta do Codespace ou o domínio Azure. Utilize as origens exatas exibidas pelos serviços.
5. Provisione uma instância dedicada de Hasura GraphQL Engine **v2**, com PostgreSQL para metadados. No Hasura Cloud v2, use as variáveis do projeto. Em container próprio, use a imagem de `compose.yaml` e configure `HASURA_GRAPHQL_METADATA_DATABASE_URL` no servidor. Configure `PG_DATABASE_URL`, `HASURA_GRAPHQL_ADMIN_SECRET`, `HASURA_GRAPHQL_JWT_SECRET` (JWKS, issuer e audience conforme `.env.server.example`) e `HASURA_GRAPHQL_CORS_DOMAIN` com as origens permitidas, separadas por vírgulas. Garanta HTTPS e passagem de WebSocket no serviço.
6. Defina `HASURA_URL` e `HASURA_ADMIN_SECRET` na máquina administrativa e execute `node backend/metadata.mjs`. O script substitui os metadados da instância dedicada do jogo e valida a consistência do schema. Confira as tabelas, a view e as quatro mutations no Console.
7. Preencha as quatro variáveis `VITE_...` do Hasura/Auth0 e reinicie o Vite ou gere novo build. Somente domínio, audience, client ID e URL públicos chegam ao navegador.

Para a pilha local, copie `.env.server.example` para `.env.server`, configure o JWT do Auth0, um segredo administrativo local e `HASURA_URL=http://localhost:8080`. Use `docker compose --env-file .env.server up -d --wait`. O Compose usa o PostgreSQL próprio, aplica a migração no primeiro boot e expõe Hasura em loopback. Exporte as duas variáveis administrativas da etapa 6 para aplicar os metadados. Use `VITE_HASURA_URL=http://localhost:8080` no frontend local.

## Back4App

1. Crie um app Parse dedicado no Back4App. No dashboard, crie `Jogador` com campos string `dono` e `apelido`, e `Partida` com campos string `codigo_sala`, `jogador_x_id`, `jogador_o_id`, `apelido_x`, `apelido_o`, `proximo_simbolo`, `status`, `vencedor_id`, e campos array `tabuleiro`, `historico`.
2. Nas **Class Level Permissions** de `Jogador`, `Partida` e `_Role`, desabilite operações diretas para clientes, inclusive Create, Add Field, Find, Get, Update e Delete. Preserve cadastro e login em `_User`. No app dedicado, desative acesso público de leitura/listagem de usuários e criação de novas classes pelo cliente. Valide a leitura direta negada e o cadastro funcional.
3. Em **Cloud Code Functions**, publique `backend/back4app/cloud/main.js` como `cloud/main.js`. As funções verificam a sessão Parse. A Master Key só é usada internamente pelo Cloud Code. `_Role` privado e nome único serializam mudanças. Se uma execução for encerrada à força e deixar um lock, o administrador deve confirmar que a execução acabou antes de remover o registro `jogo_lock_...` no dashboard.
4. Defina `VITE_PROVIDER=back4app`, `VITE_PARSE_URL=https://parseapi.back4app.com`, `VITE_PARSE_APP_ID` e `VITE_PARSE_JS_KEY`. Use a JavaScript Key pública do app, jamais a Master Key. Neste perfil, a interface consulta o estado da sala a cada segundo e aplica o mesmo cálculo de pontos. Os dois perfis usam bancos e contas independentes.
5. Valide cadastro, login, duas sessões, atualização de placar e bloqueio de leitura/escrita direta no dashboard antes de usar o ambiente no vídeo.

## GitHub, Codespaces, Replit e Azure

1. Crie um repositório do grupo no GitHub. Para recuperar os commits do ZIP, execute `git clone Historico_Git.bundle jogo-da-velha` e entre nessa pasta. O conteúdo de `jogo-da-velha/` no ZIP também pode ser usado diretamente.
2. Para publicar todas as branches em um repositório GitHub vazio, use `git clone --mirror Historico_Git.bundle publicacao.git` e `git -C publicacao.git push --all URL_DO_REPOSITORIO`, substituindo o último valor pela URL real. Abra PRs para integrar as próximas alterações em `dev` e promova `dev` a `main` após a revisão. O bundle registra commits e merges locais. PRs e aprovações são registrados somente no GitHub.
3. No GitHub, use **Code → Codespaces → Create codespace**. Preencha `.env`, rode `npm run dev` e abra a porta 5173. Para acesso do professor, use uma porta pública se a política da organização permitir e teste o link externamente com o Codespace acordado. O Replit publicado fornece uma opção estável para o link de homologação.
4. No Replit, importe o repositório. Configure as variáveis de build e execução do perfil Back4App em Secrets/Publishing. Use a porta 5173 e a configuração `.replit`. Teste no **Preview**, publique e use a URL HTTPS do deployment, verificando-a em uma sessão externa.
5. No Azure Portal, crie **Static Web App** com fonte **Other** para usar o workflow incluído. Salve o deployment token no secret do GitHub `AZURE_STATIC_WEB_APPS_API_TOKEN`. Em **Settings → Secrets and variables → Actions → Variables**, cadastre as variáveis públicas do perfil escolhido. Execute **Produção no Azure** em `main`. Adicione a origem Azure ao Auth0 e ao CORS do Hasura se usar o perfil do plano. Valide a URL `azurestaticapps.net` com duas contas e em janela anônima.

## Testes e colaboração

- `npm test` executa o cenário SQL no PostgreSQL via PGlite, incluindo sessão, duplicidade de perfil, sala cheia, turno, casa ocupada, vitória, empate, persistência e placar.
- `.github/workflows/ci.yml` executa build e testes e inicia Hasura e PostgreSQL descartáveis. O smoke test usa JWT de teste, verifica acesso por identidade, concorrência, sincronização WebSocket e pontos no ranking. A autenticação do tenant Auth0 deve ser verificada no ambiente publicado.
- `docs/TRELLO.md` descreve cartões, papéis e evidências para criar/atualizar o quadro do grupo.
- `docs/ACEITE.md` contém o roteiro de validação e o mapa dos itens 3.1–3.4 e 5.
- `docs/ROTEIRO_VIDEO.md` traz uma sequência de gravação e a partida demonstrável.
- `docs/RESULTADOS.md` e `docs/latencia_local.csv` registram o ensaio com Hasura, PostgreSQL e duas instâncias Chromium.
