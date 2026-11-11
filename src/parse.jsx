import React,{useMemo,useState} from 'react';
import {ErrorText,Game,Landing} from './ui.jsx';
const {VITE_PARSE_URL:url,VITE_PARSE_APP_ID:app,VITE_PARSE_JS_KEY:key} = import.meta.env;
const tokenKey='jogo:back4app:session';

class ParseService {
  constructor(token) {this.token=token;}
  async request(path, method='GET', body) {
    const headers={'Content-Type':'application/json','X-Parse-Application-Id':app,'X-Parse-JavaScript-Key':key};
    if(this.token) headers['X-Parse-Session-Token']=this.token;
    const response=await fetch(url.replace(/\/$/,'')+path,{method,headers,body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok) {
      if(data.code===209) window.dispatchEvent(new Event('parse-session-expired'));
      throw new Error(data.error || 'Erro na conexão com Back4App.');
    }
    return data;
  }
  async call(name,body={}){return (await this.request('/functions/'+name,'POST',body)).result;}
  profile(){return this.call('perfil');}
  save(nome){return this.call('salvarPerfil',{nome});}
  create(){return this.call('criarSala');}
  join(codigo){return this.call('entrarSala',{codigo});}
  move(sala,casa){return this.call('jogar',{sala,casa});}
  match(sala){return this.call('partida',{sala});}
  score(){return this.call('placar');}
  watch(id,next,status){
    let active=true,timer;
    const tick=async()=>{
      try{const p=await this.match(id);if(active){next(p);status(true);}}
      catch{if(active) status(false);}
      finally{if(active) timer=setTimeout(tick,1000);}
    };
    void tick();
    return ()=>{active=false;clearTimeout(timer);};
  }
}
export function ParseApp() {
  const [token,setToken]=useState(()=>sessionStorage.getItem(tokenKey));
  const [register,setRegister]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const api=useMemo(()=>new ParseService(token),[token]);
  React.useEffect(()=>{
    const clear=()=>{sessionStorage.removeItem(tokenKey);setToken(null);setError('Sessão expirada. Entre novamente.');};
    window.addEventListener('parse-session-expired',clear);
    return ()=>window.removeEventListener('parse-session-expired',clear);
  },[]);
  if(!url || !app || !key) return <Landing><ErrorText message="Configure as chaves públicas do Back4App no ambiente."/></Landing>;
  async function login(e){
    e.preventDefault();
    const credentials=Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);setError('');
    try{
      const data=await api.request(register?'/users':'/login','POST',credentials);
      if(!data.sessionToken) throw new Error('Conta criada. Verifique o e-mail antes de entrar.');
      sessionStorage.setItem(tokenKey,data.sessionToken);setToken(data.sessionToken);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function logout(){
    try{await api.request('/logout','POST',{});}catch(e){setError(e.message);}
    finally{sessionStorage.removeItem(tokenKey);setToken(null);}
  }
  if(token) return <Game api={api} logout={logout}/>;
  return <Landing><form className="stack" onSubmit={login}>
    <label htmlFor="user">Usuário</label><input id="user" name="username" required autoComplete="username"/>
    {register && <><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" required/></>}
    <label htmlFor="pass">Senha</label><input id="pass" name="password" type="password" autoComplete={register?'new-password':'current-password'} required minLength={8}/>
    <button disabled={busy}>{register?'Criar conta':'Entrar'}</button>
    <button type="button" className="quiet" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>{register?'Já tenho conta':'Criar conta'}</button>
  </form><ErrorText message={error}/></Landing>;
}
