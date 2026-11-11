import {gql} from '@apollo/client';
const fields = 'id codigo_sala jogador_x_id jogador_o_id apelido_x apelido_o tabuleiro proximo_simbolo status vencedor_id atualizado_em';
const profile = gql`query Perfil { jogadores(limit:1) { id apelido } }`;
const save = gql`mutation Salvar($nome:String!) { registrar_perfil(args:{nome:$nome}) { id apelido } }`;
const create = gql`mutation Criar { criar_partida { ${fields} } }`;
const join = gql`mutation Entrar($codigo:String!) { entrar_partida(args:{codigo:$codigo}) { ${fields} } }`;
const move = gql`mutation Jogar($sala:uuid!,$casa:Int!) { realizar_jogada(args:{sala:$sala,casa:$casa}) { ${fields} } }`;
const match = gql`query Partida($id:uuid!) { partidas_by_pk(id:$id) { ${fields} } }`;
const observe = gql`subscription Acompanhar($id:uuid!) { partidas_by_pk(id:$id) { ${fields} } }`;
const score = gql`query Placar { placar(order_by:[{pontos:desc},{vitorias:desc},{apelido:asc}]) { jogador_id apelido vitorias empates derrotas pontos } }`;

export class GraphService {
  constructor(client, transport) {
    this.client = client;
    this.transport = transport;
  }
  async query(query,field,variables) {
    const {data} = await this.client.query({query,variables,fetchPolicy:'no-cache'});
    return data[field];
  }
  async mutate(mutation,field,variables) {
    const {data} = await this.client.mutate({mutation,variables,fetchPolicy:'no-cache'});
    const row = data[field]?.[0];
    if (!row) throw new Error('Operação sem resultado.');
    return row;
  }
  async profile(){return (await this.query(profile,'jogadores'))[0] || null;}
  save(nome){return this.mutate(save,'registrar_perfil',{nome});}
  create(){return this.mutate(create,'criar_partida');}
  async join(codigo){
    try{return await this.mutate(join,'entrar_partida',{codigo});}
    catch(e){
      if(e.graphQLErrors?.some(error=>error.extensions?.code==='postgres-error' || error.message==='database query error'))
        throw new Error('Não foi possível entrar. Verifique o código ou se a sala está cheia.');
      throw e;
    }
  }
  move(sala,casa){return this.mutate(move,'realizar_jogada',{sala,casa});}
  match(id){return this.query(match,'partidas_by_pk',{id});}
  score(){return this.query(score,'placar');}
  watch(id, next, status) {
    const offClosed=this.transport.on('closed',()=>status(false));
    const offError=this.transport.on('error',()=>status(false));
    const sub=this.client.subscribe({query:observe,variables:{id},fetchPolicy:'no-cache'}).subscribe({
      next: ({data,errors})=>{
        if (errors?.length || !data?.partidas_by_pk) {status(false);return;}
        next(data.partidas_by_pk);
        status(true);
      },
      error:()=>status(false)
    });
    return ()=>{sub.unsubscribe();offClosed();offError();};
  }
}
