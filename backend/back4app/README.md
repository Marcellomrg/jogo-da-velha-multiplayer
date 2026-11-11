# Servidor Parse no Back4App Containers

Este container executa o Parse Server com as funções de jogo de `cloud/main.js`.
O Parse provisiona as classes em um banco PostgreSQL dedicado na primeira
inicialização. A API recebe sessões do Parse e as funções controlam o acesso
às partidas, jogadas e ao placar.

## Deploy pelo GitHub

No Back4App Containers, selecione o repositório e a branch desejada. Use
`backend/back4app` como **Root directory**. O Dockerfile escuta na porta
`8080` por padrão e responde `GET /` após inicializar o banco.

Configure as variáveis no painel do container:

| Variável | Valor |
|---|---|
| `DATABASE_URI` | URL do PostgreSQL dedicado, com TLS em nuvem |
| `PARSE_APP_ID` | Identificador do aplicativo |
| `PARSE_JS_KEY` | Chave pública JavaScript usada pelo frontend |
| `PARSE_MASTER_KEY` | Chave administrativa aleatória, exclusiva e com pelo menos 32 caracteres |
| `PORT` | Porta HTTP, opcional se for `8080` |

No build do frontend Azure, configure:

- `VITE_PROVIDER=back4app`
- `VITE_PARSE_URL=https://HOST_DO_CONTAINER/parse`
- `VITE_PARSE_APP_ID` com o mesmo identificador
- `VITE_PARSE_JS_KEY` com a mesma chave pública

Use somente os dados públicos do cliente no build do frontend. A URL do
PostgreSQL e a chave administrativa pertencem ao ambiente do container.
Se o plano oferecer uma URL temporária, verifique a duração no painel antes de
usá-la para a entrega. O serviço Back4App Containers hospeda o servidor Parse
e o PostgreSQL é fornecido separadamente.
