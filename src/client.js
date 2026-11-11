import {ApolloClient,InMemoryCache,HttpLink,split} from '@apollo/client';
import {GraphQLWsLink} from '@apollo/client/link/subscriptions';
import {createClient} from 'graphql-ws';
import {getMainDefinition} from '@apollo/client/utilities';

export function createGameClient(base,token) {
  const url=base.replace(/\/$/,'')+'/v1/graphql';
  const headers={Authorization:'Bearer '+token};
  const transport=createClient({url:url.replace(/^http/,'ws'),connectionParams:{headers},retryAttempts:Infinity,
    shouldRetry:event=>![4400,4401,4403,4406,4409,4429].includes(event?.code)});
  const http=new HttpLink({uri:url,headers});
  const ws=new GraphQLWsLink(transport);
  const link=split(({query})=>getMainDefinition(query).operation==='subscription',ws,http);
  return {apollo:new ApolloClient({cache:new InMemoryCache(),link}),transport};
}
