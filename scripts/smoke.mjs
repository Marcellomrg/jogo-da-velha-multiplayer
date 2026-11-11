import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createClient} from 'graphql-ws';
import {randomUUID} from 'node:crypto';
const url=process.env.HASURA_URL || 'http://localhost:8080';
const key=process.env.CI_JWT_KEY;
if(!key || key.length<32) throw new Error('Defina CI_JWT_KEY da instância descartável.');
const segment=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const suffix=randomUUID().slice(0,8);
function token(name) {
  const data=segment({alg:'HS256',typ:'JWT'})+'.'+segment({sub:name+suffix,exp:Math.floor(Date.now()/1000)+300,
    'https://hasura.io/jwt/claims':{'x-hasura-user-id':name+suffix,'x-hasura-default-role':'jogador','x-hasura-allowed-roles':['jogador']}});
  return data+'.'+createHmac('sha256',key).update(data).digest('base64url');
}
const a=token('x'),b=token('o'),c=token('extra');
async function send(auth,query,variables={}) {
  const res=await fetch(url+'/v1/graphql',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(10000)});
  return res.json();
}
async function api(...args) {
  const r=await send(...args);
  if(r.errors) throw new Error(JSON.stringify(r.errors));
  return r.data;
}
const fields='id codigo_sala status tabuleiro vencedor_id';
const create='mutation { criar_partida { '+fields+' } }';
const join='mutation($code:String!){ entrar_partida(args:{codigo:$code}) { '+fields+' } }';
const move='mutation($id:uuid!,$cell:Int!){ realizar_jogada(args:{sala:$id,casa:$cell}) { '+fields+' } }';
assert.ok((await send(null,'query { jogadores { id } }')).errors);
assert.ok((await send(a+'x','query { jogadores { id } }')).errors);
for(const [auth,name] of [[a,'Ana'],[b,'Bruno'],[c,'Carla']]){
  const p=await api(auth,'mutation($nick:String!){ registrar_perfil(args:{nome:$nick}) { id apelido } }',{nick:name+' '+suffix});
  assert.equal(p.registrar_perfil[0].apelido,name+' '+suffix);
}
const profile=await api(a,'query { jogadores { id apelido } }');
assert.equal(profile.jogadores.length,1);
const current=await api(a,create);
const {id,codigo_sala:code}=current.criar_partida[0];
const competitors=await Promise.all([send(b,join,{code}),send(c,join,{code})]);
assert.equal(competitors.filter(r=>r.data?.entrar_partida?.[0]).length,1);
const o=competitors[0].data?b:c, stranger=o===b?c:b;
const hidden=await api(stranger,'query($id:uuid!){ partidas_by_pk(id:$id){ id } }',{id});
assert.equal(hidden.partidas_by_pk,null);
assert.ok((await send(a,'mutation { update_partidas(where:{},_set:{status:"finalizada"}){affected_rows} }')).errors);
assert.ok((await send(stranger,move,{id,cell:0})).errors);
assert.ok((await send(o,move,{id,cell:0})).errors);
const client=createClient({url:url.replace(/^http/,'ws')+'/v1/graphql',connectionParams:{headers:{Authorization:'Bearer '+o}},retryAttempts:0});
const waiters=new Map();
const sub=client.subscribe({query:'subscription($id:uuid!){ partidas_by_pk(id:$id){ tabuleiro } }',variables:{id}},{
  next:({data})=>{const n=data?.partidas_by_pk?.tabuleiro?.filter(Boolean).length;waiters.get(n)?.resolve(performance.now());},
  error:e=>{for(const w of waiters.values())w.reject(new Error(JSON.stringify(e)));},
  complete:()=>{}
});
const wait=(n)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Timeout da subscription, turno '+n)),10000);
  waiters.set(n,{resolve:value=>{clearTimeout(timer);waiters.delete(n);resolve(value);},reject:error=>{clearTimeout(timer);waiters.delete(n);reject(error);}});
});
try {
  await wait(0);
  const seen=wait(1);
  const sent=performance.now();
  const concurrent=await Promise.all([send(a,move,{id,cell:0}),send(a,move,{id,cell:8})]);
  assert.equal(concurrent.filter(r=>r.data?.realizar_jogada?.[0]).length,1);
  console.log('Primeira atualização por WebSocket em '+Math.round(await seen-sent)+' ms');
  const first=concurrent.find(r=>r.data).data.realizar_jogada[0].tabuleiro;
  const sequence=first[0] ? [[o,3],[a,1],[o,4],[a,2]] : [[o,3],[a,7],[o,4],[a,6]];
  for(const [auth,cell] of sequence) await api(auth,move,{id,cell});
  assert.ok((await send(o,move,{id,cell:5})).errors);
  const rank=await api(a,'query { placar(order_by:[{pontos:desc},{vitorias:desc},{apelido:asc}]) { apelido pontos vitorias } }');
  assert.equal(rank.placar.find(row=>row.apelido==='Ana '+suffix).pontos,3);
  const data=await api(a,'query($id:uuid!){ partidas_by_pk(id:$id){ status tabuleiro } }',{id});
  assert.equal(data.partidas_by_pk.status,'finalizada');
  assert.equal(data.partidas_by_pk.tabuleiro.filter(Boolean).length,5);
  console.log('Integração JWT, concorrência, privacidade, WebSocket, persistência e placar: OK.');
}finally{sub();await client.dispose();}
