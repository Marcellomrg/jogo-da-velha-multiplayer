const express = require('express');
const path = require('node:path');
const { ParseServer } = require('parse-server');

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Configure ${name} no ambiente do container.`);
  return value;
}

const port = Number(process.env.PORT || 8080);
const appId = env('PARSE_APP_ID');
const masterKey = env('PARSE_MASTER_KEY');
const javascriptKey = env('PARSE_JS_KEY');
const databaseURI = new URL(env('DATABASE_URI'));
// O adaptador PostgreSQL do Parse usa ssl=true para habilitar TLS.
if (['require', 'verify-ca', 'verify-full'].includes(databaseURI.searchParams.get('sslmode'))) {
  databaseURI.searchParams.set('ssl', 'true');
}
if (masterKey.length < 32 || masterKey === javascriptKey) {
  throw new Error('Use uma chave administrativa aleatória e diferente da chave pública.');
}

const noClientAccess = {
  find: {}, count: {}, get: {}, create: {}, update: {}, delete: {}, addField: {}
};
const strings = names => Object.fromEntries(names.map(name => [name, { type: 'String' }]));
const definitions = [
  {
    className: 'Jogador',
    fields: strings(['dono', 'apelido']),
    classLevelPermissions: noClientAccess
  },
  {
    className: 'Partida',
    fields: {
      ...strings(['codigo_sala', 'jogador_x_id', 'jogador_o_id', 'apelido_x', 'apelido_o',
        'proximo_simbolo', 'status', 'vencedor_id']),
      tabuleiro: { type: 'Array' },
      historico: { type: 'Array' }
    },
    classLevelPermissions: noClientAccess
  },
  { className: '_Role', classLevelPermissions: noClientAccess }
];

async function start() {
  const app = express();
  app.disable('x-powered-by');
  const server = new ParseServer({
    appId, masterKey, javascriptKey,
    databaseURI: databaseURI.toString(),
    serverURL: `http://127.0.0.1:${port}/parse`,
    cloud: path.join(__dirname, '..', 'cloud', 'main.js'),
    allowClientClassCreation: false,
    enforcePrivateUsers: true,
    enableAnonymousUsers: false,
    schema: { definitions, lockSchemas: true, strict: true }
  });
  await server.start();
  app.get('/', (_req, res) => res.json({ service: 'jogo-da-velha-parse', status: 'ok' }));
  app.use('/parse', server.app);
  app.listen(port, '0.0.0.0', () => console.log(`Parse pronto na porta ${port}.`));
}

start().catch(error => {
  // O driver pode incluir detalhes da conexão em erros. Exiba apenas o tipo e o código.
  console.error('Falha ao iniciar o Parse:', error.name, error.code || '');
  process.exitCode = 1;
});
