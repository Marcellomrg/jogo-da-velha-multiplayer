import React,{useEffect,useId,useRef,useState} from 'react';

export function ErrorText({message}) {
  return message ? <p className="error" role="alert">{message}</p> : null;
}
export function Shell({profile, logout, children}) {
  return <main><header><div className="brand"><span>× ○</span> Jogo da Velha</div>
    {logout && <div className="session">{profile?.apelido}<button className="quiet" onClick={logout}>Sair</button></div>}
  </header>{children}</main>;
}
export function Landing({children}) {
  return <Shell><section className="hero"><div><p className="eyebrow">MULTIPLAYER ONLINE</p><h1>Jogo da<br/>Velha.</h1>
    <p>Convide alguém, compartilhe o código da sala e jogue em tempo real.</p>{children}</div>
    <div className="art" aria-hidden="true">{['×','','○','','×','','○','','×'].map((v,i)=><span key={i}>{v}</span>)}</div>
  </section></Shell>;
}
export function Game({api,logout}) {
  const [profile,setProfile]=useState(undefined), [screen,setScreen]=useState('home');
  const [partida,setPartida]=useState(null), [connected,setConnected]=useState(false);
  const [retry,setRetry]=useState(0),[nick,setNick]=useState(''),[code,setCode]=useState('');
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const lock=useRef(false);
  const nickId=useId();
  const storageKey=profile && 'partida:'+profile.id;
  useEffect(()=>{
    let alive=true;
    api.profile().then(p=>{if(alive){setProfile(p);setNick(p?.apelido || '');}})
      .catch(e=>{if(alive){setError(e.message);}});
    return ()=>{alive=false;};
  },[api]);
  const matchId = screen === 'match' && partida?.id;
  useEffect(()=>{
    if(!matchId) return;
    let active=true;
    setConnected(false);
    const off=api.watch(matchId,
      p=>{if(active)setPartida(prev=>prev && prev.id===p.id && prev.atualizado_em<=p.atualizado_em ? p : prev);},
      value=>{if(active)setConnected(value);});
    const offline=()=>setConnected(false);
    const online=()=>setRetry(n=>n+1);
    window.addEventListener('offline',offline);
    window.addEventListener('online',online);
    return ()=>{active=false;off();window.removeEventListener('offline',offline);window.removeEventListener('online',online);};
  },[api,matchId,retry]);
  async function action(fn) {
    if(lock.current) return;
    lock.current=true;setBusy(true);setError('');
    try {await fn();} catch(e){setError(e.message || 'Falha de comunicação.');}
    finally {lock.current=false;setBusy(false);}
  }
  function open(p) {
    if(!p) throw new Error('Partida indisponível.');
    localStorage.setItem(storageKey,p.id);
    setCopied(false);setConnected(false);setPartida(p);setScreen('match');
  }
  const submit=(fn)=>(e)=>{e.preventDefault();void action(fn);};
  const goHome=()=>{setError('');setScreen('home');};
  const score=()=>action(async()=>{setRows(null);setScreen('score');setRows(await api.score());});
  const symbol=partida && (profile?.id===partida.jogador_x_id ? 'X' : 'O');
  const finished=partida?.status==='finalizada';
  const yourTurn=partida?.proximo_simbolo===symbol;
  let status='Aguardando adversário';
  if(finished) status=!partida.vencedor_id?'Empate':partida.vencedor_id===profile?.id?'Você venceu!':'Você perdeu';
  else if(partida?.status==='em_andamento') status=yourTurn?'Sua vez':'Vez do adversário';
  else if(partida?.status==='cancelada') status='Partida cancelada';
  return <Shell profile={profile} logout={logout}>
    <ErrorText message={error}/>
    {profile===undefined && <section className="panel"><h2>{error?'Falha ao carregar perfil':'Carregando perfil…'}</h2>{error && <button disabled={busy} onClick={()=>action(async()=>{const p=await api.profile();setProfile(p);setNick(p?.apelido || '');})}>Tentar novamente</button>}</section>}
    {(profile===null || screen==='profile') && <form className="panel stack" onSubmit={submit(async()=>{setProfile(await api.save(nick));setScreen('home');})}>
      <h1>Seu perfil</h1><label htmlFor={nickId}>Apelido no placar</label><input id={nickId} value={nick} minLength={3} maxLength={30} required onChange={e=>setNick(e.target.value)}/>
      <button disabled={busy}>Salvar perfil</button>{profile && <button type="button" className="quiet" onClick={goHome}>Voltar</button>}
    </form>}
    {profile && screen==='home' && <section className="panel stack"><p className="eyebrow">SALA DE JOGO</p><h1>Vamos jogar?</h1>
      <p>Crie uma sala ou entre com o código de outro jogador.</p>
      <button disabled={busy} onClick={()=>action(async()=>open(await api.create()))}>Criar sala</button>
      <form className="join" onSubmit={submit(async()=>open(await api.join(code.trim().toUpperCase())))}>
        <input aria-label="Código da sala" placeholder="Código da sala" value={code} minLength={6} maxLength={6} required onChange={e=>setCode(e.target.value.toUpperCase())}/>
        <button className="quiet" disabled={busy}>Entrar na sala</button>
      </form>
      {localStorage.getItem(storageKey) && <button className="quiet" disabled={busy} onClick={()=>action(async()=>open(await api.match(localStorage.getItem(storageKey))))}>Retomar última sala</button>}
      <div className="links"><button className="quiet" disabled={busy} onClick={score}>Ver placar</button><button className="quiet" onClick={()=>{setError('');setScreen('profile');}}>Editar perfil</button></div>
    </section>}
    {profile && screen==='match' && partida && <section className="panel stack">
      <div className="room"><p className="eyebrow">SALA {partida.codigo_sala}</p><button className="quiet" onClick={()=>action(async()=>{await navigator.clipboard.writeText(partida.codigo_sala);setCopied(true);})}>{copied?'Copiado':'Copiar código'}</button></div>
      <h1 aria-live="polite">{status}</h1><p>Você joga com <strong>{symbol}</strong></p>
      {partida.apelido_x && <p className="players">{partida.apelido_x} (X) · {partida.apelido_o || "Aguardando"} (O)</p>}
      {!connected && <p className="notice" role="status">Sincronizando… <button className="quiet" onClick={()=>setRetry(n=>n+1)}>Reconectar</button></p>}
      <div className="board" aria-label="Tabuleiro">{partida.tabuleiro.map((value,i)=>
        <button key={i} className={'tile '+(value||'')} aria-label={'Casa '+(i+1)+(value?' '+value:' vazia')}
          disabled={Boolean(value) || !connected || busy || !yourTurn || partida.status!=='em_andamento'}
          onClick={()=>action(async()=>{const p=await api.move(partida.id,i);setPartida(prev=>prev.id===p.id && prev.atualizado_em<=p.atualizado_em?p:prev);})}>{value==='X'?'×':value==='O'?'○':''}</button>)}</div>
      <div className="links"><button className="quiet" disabled={busy} onClick={goHome}>Início</button><button className="quiet" disabled={busy} onClick={score}>Ver placar</button></div>
    </section>}
    {profile && screen==='score' && <section className="panel stack"><p className="eyebrow">RANKING</p><h1>Classificação</h1><p>Vitória 3 · Empate 1 · Derrota 0</p>
      {rows===null && !error && <p>Carregando placar…</p>}{rows?.length===0 && <p>Nenhuma partida concluída.</p>}
      {Boolean(rows?.length) && <div className="table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Jogador</th><th scope="col">Pts</th><th scope="col">V</th><th scope="col">E</th><th scope="col">D</th></tr></thead>
        <tbody>{rows.map((r,i)=><tr key={r.jogador_id}><td>{i+1}</td><th scope="row">{r.apelido}</th><td>{r.pontos}</td><td>{r.vitorias}</td><td>{r.empates}</td><td>{r.derrotas}</td></tr>)}</tbody></table></div>}
      <button className="quiet" disabled={busy} onClick={goHome}>Voltar ao início</button>
    </section>}
  </Shell>;
}
