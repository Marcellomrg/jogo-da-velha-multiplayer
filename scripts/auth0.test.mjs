import {test,expect} from 'vitest';
import {onExecutePostLogin} from '../backend/auth0-action.cjs';
test('Auth0: claims Hasura usam audiência esperada e identidade do provedor', async()=>{
  const claims=[];
  const api={accessToken:{setCustomClaim:(name,value)=>claims.push({name,value})}};
  const event={secrets:{HASURA_AUDIENCE:'https://jogo/api'},user:{user_id:'auth0|jogador'}};
  await onExecutePostLogin(event,api);
  await onExecutePostLogin({...event,resource_server:{identifier:'https://outra/api'}},api);
  expect(claims).toHaveLength(0);
  await onExecutePostLogin({...event,resource_server:{identifier:'https://jogo/api'}},api);
  expect(claims).toEqual([{name:'https://hasura.io/jwt/claims',value:{
    'x-hasura-default-role':'jogador',
    'x-hasura-allowed-roles':['jogador'],
    'x-hasura-user-id':'auth0|jogador'
  }}]);
});
