export const emptyBoard = () => Array(9).fill(null);
export const points = ({vitorias, empates}) => 3 * vitorias + empates;
export const winningLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function result(board) {
  const line = winningLines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[b] === board[c]);
  return line ? board[line[0]] : board.every(Boolean) ? "empate" : null;
}
export function ranking(matches, profiles) {
  const totals = new Map();
  for (const match of matches.filter(item => item.status === "finalizada")) {
    for (const id of [match.jogador_x_id, match.jogador_o_id]) {
      if (!totals.has(id)) totals.set(id,{jogador_id:id,apelido:profiles[id],vitorias:0,empates:0,derrotas:0});
      const row = totals.get(id);
      if (!match.vencedor_id) row.empates++;
      else if (match.vencedor_id === id) row.vitorias++;
      else row.derrotas++;
    }
  }
  return [...totals.values()].map(row=>({...row,pontos:points(row)}))
    .sort((a,b)=>b.pontos-a.pontos || b.vitorias-a.vitorias || a.apelido.localeCompare(b.apelido,"pt-BR"));
}
