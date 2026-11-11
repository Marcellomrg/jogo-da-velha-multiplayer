import React from 'react';
import {createRoot} from 'react-dom/client';
import {Auth0Provider, useAuth0} from '@auth0/auth0-react';
import {ApolloProvider, useApolloClient} from '@apollo/client';
import {createGameClient} from './client.js';
import {GraphService} from './service.js';
import {Game, Landing, ErrorText} from './ui.jsx';
import {ParseApp} from './parse.jsx';
import './style.css';

const {VITE_HASURA_URL:base,VITE_AUTH0_DOMAIN:domain,VITE_AUTH0_CLIENT_ID:clientId,VITE_AUTH0_AUDIENCE:audience,VITE_PROVIDER:provider} = import.meta.env;
function Session({token, logout}) {
  const client = React.useMemo(()=>createGameClient(base,token),[token]);
  React.useEffect(()=>()=>{ client.apollo.stop(); void client.transport.dispose(); },[client]);
  return <ApolloProvider client={client.apollo}><HasuraGame logout={logout} transport={client.transport}/></ApolloProvider>;
}
function HasuraGame({logout,transport}) {
  const apollo = useApolloClient();
  const service = React.useMemo(()=>new GraphService(apollo,transport),[apollo,transport]);
  return <Game api={service} logout={logout} />;
}
function Login() {
  const auth = useAuth0();
  const {isAuthenticated,isLoading,getAccessTokenSilently,error} = auth;
  const [token,setToken] = React.useState('');
  const [failure,setFailure] = React.useState('');
  React.useEffect(()=>{
    if (!isAuthenticated) return;
    let active = true;
    async function renew() {
      try {
        const value = await getAccessTokenSilently();
        if (active) {setToken(value);setFailure('');}
      } catch {if (active) {setToken('');setFailure('Sessão indisponível. Entre novamente.');}}
    }
    void renew();
    const timer=setInterval(renew,60000);
    return ()=>{active=false;clearInterval(timer);};
  },[isAuthenticated,getAccessTokenSilently]);
  if (token && isAuthenticated) return <Session token={token} logout={()=>auth.logout({logoutParams:{returnTo:location.origin}})}/>;
  return <Landing>{(isLoading || (isAuthenticated && !failure)) ? <p>Carregando sessão…</p> :
    <button onClick={()=>auth.loginWithRedirect().catch(()=>setFailure('Não foi possível abrir o login.'))}>Entrar ou criar conta</button>}
    <ErrorText message={failure || error?.message}/></Landing>;
}
const root = createRoot(document.getElementById('root'));
root.render(provider === 'back4app' ? <ParseApp/> : base && domain && clientId && audience ?
  <Auth0Provider domain={domain} clientId={clientId} authorizationParams={{redirect_uri:location.origin,audience}}><Login/></Auth0Provider> :
  <Landing><ErrorText message="Configure o Auth0 e o Hasura no arquivo .env. Consulte o README."/></Landing>);
