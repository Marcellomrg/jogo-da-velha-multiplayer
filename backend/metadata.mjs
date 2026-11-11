const filter = {auth_subject: {_eq: "X-Hasura-User-Id"}};
const partidaFilter = {_or: [{jogador_x: filter}, {jogador_o: filter}]};
const fields = {
  jogadores: ["id","apelido","criado_em"],
  partidas: ["id","codigo_sala","jogador_x_id","jogador_o_id","apelido_x","apelido_o","tabuleiro","proximo_simbolo","status","vencedor_id","criado_em","atualizado_em","finalizado_em"],
  jogadas: ["id","partida_id","jogador_id","posicao","simbolo","numero_turno","criado_em"],
  placar: ["jogador_id","apelido","vitorias","empates","derrotas","pontos"]
};
const table = (name) => ({schema:"public", name});
const rel = (name, col) => ({name, using:{foreign_key_constraint_on:col}});
const access = {jogadores:filter, partidas:partidaFilter, jogadas:{partida:partidaFilter}, placar:{}};
const relationships = {
  partidas:[rel("jogador_x","jogador_x_id"),rel("jogador_o","jogador_o_id")],
  jogadas:[rel("partida","partida_id"),rel("jogador","jogador_id")]
};
const metadata = {
  version:3,
  sources:[{
    name:"default", kind:"postgres",
    configuration:{connection_info:{database_url:{from_env:"PG_DATABASE_URL"},isolation_level:"read-committed",use_prepared_statements:false}},
    tables:Object.keys(fields).map(name => ({
      table:table(name),
      ...(relationships[name] ? {object_relationships:relationships[name]} : {}),
      select_permissions:[{role:"jogador",permission:{columns:fields[name],filter:access[name]}}]
    })),
    functions:["registrar_perfil","criar_partida","entrar_partida","realizar_jogada"].map(name=>({
      function:table(name),configuration:{exposed_as:"mutation",session_argument:"sessao"},
      permissions:[{role:"jogador"}]
    }))
  }]
};
const {HASURA_URL,HASURA_ADMIN_SECRET} = process.env;
if (!HASURA_URL || !HASURA_ADMIN_SECRET) throw new Error("Defina HASURA_URL e HASURA_ADMIN_SECRET no ambiente.");
const response = await fetch(HASURA_URL.replace(/\/$/,"") + "/v1/metadata", {
  method:"POST", headers:{"Content-Type":"application/json","x-hasura-admin-secret":HASURA_ADMIN_SECRET},
  body:JSON.stringify({type:"replace_metadata",version:2,args:{allow_inconsistent_metadata:false,metadata}})
});
const data = await response.json();
if (!response.ok || data.is_consistent !== true) throw new Error(JSON.stringify(data));
console.log("Metadados Hasura consistentes.");
