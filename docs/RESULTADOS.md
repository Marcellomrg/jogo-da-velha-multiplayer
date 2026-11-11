# Resultados da validação local

Data do ensaio: 11/11/2026.

| Cenário | Resultado observado |
|---|---|
| Build da aplicação | React/Vite gerou os artefatos de produção |
| Vitest | Dois testes com sucesso, incluindo o cenário SQL em PGlite e as claims da Action do Auth0 |
| API Hasura GraphQL Engine v2.48.5 e PostgreSQL 16.10 | JWT assinado aceito, ausência de credencial e token inválido rejeitados, duas entradas simultâneas com um único O e jogada concorrente registrada uma vez |
| Privacidade e persistência | Terceiro não visualizou a sala. Escrita direta foi bloqueada. Estado final persistido e placar com a pontuação esperada |
| Interface offline | Sala, turnos, vitória, retomada após reload, placar e verificação de largura móvel em Chromium |
| Interface React com Hasura real local | Duas instâncias Chromium, JWT de teste, seis partidas completas e 30 jogadas. Retomada após reload e 18 pontos para seis vitórias |
| RNF01 em loopback | 30 de 30 jogadas em até 2 s. Mínimo 493 ms, p95 969 ms, máximo 971 ms |

O teste de latência mediu o intervalo entre o evento de clique do navegador que enviou a jogada e o primeiro quadro disponível após a alteração da casa no navegador adversário. As duas instâncias Chromium estavam no mesmo computador. O arquivo `latencia_local.csv` registra cada observação. O p95 usa a posição 29 do conjunto ordenado de 30 tempos.

O JWT foi emitido para uma instância descartável de teste. Os resultados não incluem login no tenant Auth0 do grupo, aplicação Back4App hospedada, ambiente Replit ou produção Azure. Repita o protocolo de `ACEITE.md` nos ambientes publicados para medir a experiência do usuário e conferir as permissões externas.
