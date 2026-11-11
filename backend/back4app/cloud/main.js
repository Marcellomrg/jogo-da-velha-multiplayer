const crypto = require('crypto');
const master = {useMasterKey: true};
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const profileRow = (p) => p ? {id:p.get('dono'),apelido:p.get('apelido')} : null;
function roomRow(p) {
  const fields = ['codigo_sala','jogador_x_id','jogador_o_id','apelido_x','apelido_o','tabuleiro','proximo_simbolo','status','vencedor_id'];
  return {...Object.fromEntries(fields.map(field => [field,p.get(field) ?? null])),id:p.id,atualizado_em:p.updatedAt.toISOString()};
}
const participant = (p,id) => [p.get('jogador_x_id'),p.get('jogador_o_id')].includes(id);
const profile = (id) => new Parse.Query('Jogador').equalTo('dono',id).first(master);
const matches = () => new Parse.Query('Partida');
const privateObject = (name) => {
  const obj = new Parse.Object(name);
  obj.setACL(new Parse.ACL());
  return obj;
};
function define(name,fn) {
  Parse.Cloud.define(name, async request => {
    if (!request.user) throw new Parse.Error(209,'Entre na sua conta.');
    return fn(request.user.id,request.params);
  });
}
// Parse _Role tem nome único. O lock com ACL privada coordena instâncias de Cloud Code.
async function locked(key,fn) {
  const lock = new Parse.Role('jogo_lock_'+key,new Parse.ACL());
  try {await lock.save(null,master);}
  catch (e) {
    if (e.code === 137 || e.code === 202) throw new Error('Operação concorrente. Tente novamente.');
    throw e;
  }
  try {return await fn();}
  finally {await lock.destroy(master);}
}
define('perfil',async id=>profileRow(await profile(id)));
define('salvarPerfil',(id,{nome})=>locked('perfis',async()=>{
  if (typeof nome !== 'string' || nome.trim().length<3 || nome.trim().length>30) throw new Error('Use um apelido de 3 a 30 caracteres.');
  const ocupado=await new Parse.Query('Jogador').equalTo('apelido',nome.trim()).first(master);
  if(ocupado && ocupado.get('dono')!==id) throw new Error('Apelido indisponível.');
  const row = await profile(id) || privateObject('Jogador');
  return profileRow(await row.save({dono:id,apelido:nome.trim()},master));
}));
define('criarSala',(id)=>locked('codigos',async()=>{
  const jogador=await profile(id);
  if(!jogador) throw new Error('Cadastre seu perfil.');
  for(let i=0;i<20;i++){
    const codigo=crypto.randomBytes(3).toString('hex').toUpperCase();
    if(await matches().equalTo('codigo_sala',codigo).first(master)) continue;
    const row=privateObject('Partida');
    return roomRow(await row.save({codigo_sala:codigo,jogador_x_id:id,apelido_x:jogador.get("apelido"),tabuleiro:Array(9).fill(null),proximo_simbolo:'X',status:'aguardando',historico:[]},master));
  }
  throw new Error('Código indisponível.');
}));
define('entrarSala',async(id,{codigo})=>{
  const jogador=await profile(id);
  if(!jogador) throw new Error('Cadastre seu perfil.');
  if(typeof codigo!=='string' || !/^[A-F0-9]{6}$/.test(codigo)) throw new Error('Sala inválida.');
  const found = await matches().equalTo('codigo_sala',codigo).first(master);
  if(!found) throw new Error('Sala inválida.');
  return locked(found.id,async()=>{
    const row=await matches().get(found.id,master);
    if(participant(row,id)) return roomRow(row);
    if(row.get('status')!=='aguardando') throw new Error('Sala cheia ou indisponível.');
    return roomRow(await row.save({jogador_o_id:id,apelido_o:jogador.get('apelido'),status:'em_andamento'},master));
  });
});
define('partida',async(id,{sala})=>{
  const row=await matches().get(sala,master);
  if(!participant(row,id)) throw new Error('Partida indisponível.');
  return roomRow(row);
});
define('jogar',(id,{sala,casa})=>{
  if(typeof sala!=='string' || !/^[A-Za-z0-9]{8,32}$/.test(sala)) throw new Error('Partida indisponível.');
  return locked(sala,async()=>{
    const row=await matches().get(sala,master);
    if(!participant(row,id) || row.get('status')!=='em_andamento') throw new Error('Partida indisponível.');
    const marca=row.get('jogador_x_id')===id?'X':'O';
    const board=row.get('tabuleiro').slice();
    if(marca!==row.get('proximo_simbolo')) throw new Error('Aguarde sua vez.');
    if(!Number.isInteger(casa) || casa<0 || casa>8 || board[casa]) throw new Error('Casa indisponível.');
    board[casa]=marca;
    const ganhou=lines.some(line=>line.every(i=>board[i]===marca));
    const acabou=ganhou || board.every(Boolean);
    const historico=[...row.get('historico'),{jogador:id,casa,marca}];
    const changes={tabuleiro:board,historico,proximo_simbolo:marca==='X'?'O':'X'};
    if(acabou){changes.status='finalizada';if(ganhou) changes.vencedor_id=id;}
    return roomRow(await row.save(changes,master));
  });
});
define('placar',async()=>{
  const rows = new Map();
  await matches().equalTo('status','finalizada').each(row=>{
    const winner=row.get('vencedor_id');
    for(const id of [row.get('jogador_x_id'),row.get('jogador_o_id')]){
      if(!rows.has(id)) rows.set(id,{jogador_id:id,vitorias:0,empates:0,derrotas:0,pontos:0});
      const r=rows.get(id);
      if(!winner){r.empates++;r.pontos++;}
      else if(winner===id){r.vitorias++;r.pontos+=3;}
      else r.derrotas++;
    }
  },master);
  if(!rows.size) return [];
  await new Parse.Query('Jogador').each(row=>{
    if(rows.has(row.get('dono'))) rows.get(row.get('dono')).apelido=row.get('apelido');
  },master);
  return [...rows.values()].sort((a,b)=>b.pontos-a.pontos || b.vitorias-a.vitorias || a.apelido.localeCompare(b.apelido,'pt-BR'));
});
