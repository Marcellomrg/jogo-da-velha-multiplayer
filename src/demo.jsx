import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Game} from './ui.jsx';
import {emptyBoard,ranking,result} from './rules.mjs';
import './style.css';
import './demo.css';

const storage='jogo-da-velha-demonstracao-v1';
let state={matches:{},profiles:{Ana:'Ana',Bruno:'Bruno'},revision:0};
try{state=JSON.parse(localStorage.getItem(storage)) || state;}catch{}
const watchers=new Set();
function commit() {
  try{localStorage.setItem(storage,JSON.stringify(state));}catch{}
  for(const update of watchers) update();
}
function changed(match) {
  match.atualizado_em=String(++state.revision).padStart(12,'0');
  commit();
  return structuredClone(match);
}
class DemoApi {
  constructor(id){this.id=id;}
  async profile(){return {id:this.id,apelido:state.profiles[this.id]};}
  async save(nick){state.profiles[this.id]=nick;commit();return this.profile();}
  async create(){
    let code;
    do{code=Math.floor(Math.random()*0x1000000).toString(16).padStart(6,'0').toUpperCase();}while(state.matches[code]);
    const row={id:code,codigo_sala:code,jogador_x_id:this.id,jogador_o_id:null,apelido_x:state.profiles[this.id],apelido_o:null,tabuleiro:emptyBoard(),
      proximo_simbolo:'X',status:'aguardando',vencedor_id:null};
    state.matches[code]=row;
    return changed(row);
  }
  async join(code){
    const row=state.matches[code];
    if(!row) throw new Error('Sala inválida.');
    if([row.jogador_x_id,row.jogador_o_id].includes(this.id)) return structuredClone(row);
    if(row.status!=='aguardando') throw new Error('Sala cheia.');
    row.jogador_o_id=this.id;
    row.apelido_o=state.profiles[this.id];
    row.status='em_andamento';
    return changed(row);
  }
  async match(id){
    const row=state.matches[id];
    return row && [row.jogador_x_id,row.jogador_o_id].includes(this.id) ? structuredClone(row) : null;
  }
  async move(id,cell){
    const row=state.matches[id];
    const player=this.id===row.jogador_x_id?'X':'O';
    if(![row.jogador_x_id,row.jogador_o_id].includes(this.id) || row.status!=='em_andamento' ||
      player!==row.proximo_simbolo || !Number.isInteger(cell) || cell<0 || cell>8 || row.tabuleiro[cell])
      throw new Error('Jogada indisponível.');
    row.tabuleiro[cell]=player;
    const outcome=result(row.tabuleiro);
    if(outcome){
      row.status='finalizada';
      row.vencedor_id=outcome==='X'?row.jogador_x_id:outcome==='O'?row.jogador_o_id:null;
    }else row.proximo_simbolo=player==='X'?'O':'X';
    return changed(row);
  }
  async score(){return ranking(Object.values(state.matches),state.profiles);}
  watch(id,next,status){
    const update=()=>{
      const row=state.matches[id];
      if(row){next(structuredClone(row));status(true);}
    };
    watchers.add(update);update();
    return ()=>watchers.delete(update);
  }
}
const a=new DemoApi('Ana'),b=new DemoApi('Bruno');
function Player({name,api}){
  const [active,setActive]=useState(true);
  return <section className="demo-side" aria-label={'Sessão '+name}>
    {active ? <Game api={api} logout={()=>setActive(false)}/> :
      <main><section className="panel stack"><h2>Sessão {name}</h2><button onClick={()=>setActive(true)}>Entrar como {name}</button></section></main>}
  </section>;
}
function Demo(){
  return <><aside className="demo-head"><strong>Demonstração local</strong>
    <span>Crie a sala à esquerda e entre com o código à direita. Duas sessões simuladas.</span></aside>
    <div className="demo-grid"><Player name="Ana" api={a}/><Player name="Bruno" api={b}/></div></>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
