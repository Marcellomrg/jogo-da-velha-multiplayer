const provider=process.env.VITE_PROVIDER;
if(provider && !['hasura','back4app'].includes(provider)) throw new Error('VITE_PROVIDER inválido.');
const variables=provider==='back4app' ? ['VITE_PARSE_URL','VITE_PARSE_APP_ID','VITE_PARSE_JS_KEY'] :
  ['VITE_HASURA_URL','VITE_AUTH0_DOMAIN','VITE_AUTH0_CLIENT_ID','VITE_AUTH0_AUDIENCE'];
for(const name of variables) if(!process.env[name]) throw new Error('Variável ausente: '+name);
if(!process.env[variables[0]].startsWith('https://')) throw new Error('Use HTTPS no endpoint de produção.');
