# Aceite da Entrega 2

| Item | Evidência no pacote | Evidência a obter nos serviços |
|---|---|---|
| 3.1 Backend | Schema SQL, metadados Hasura, Action Auth0, classes e Cloud Code Back4App | Mostrar as tabelas e os papéis no Hasura, Action publicada no Auth0 e classes/configuração Back4App |
| 3.2 Frontend | Aplicação React/Vite, Apollo, adaptador Parse, configuração de Codespaces e Replit, workflow Azure | Abrir e testar as URLs de homologação e produção com dois usuários |
| 3.3 Colaboração | Histórico Git, branches locais e especificação do quadro Trello | Registrar URL GitHub, PRs reais com revisores e URL do quadro com os responsáveis |
| 3.4 Testes e apresentação | Workflow CI, testes SQL, script GraphQL, demonstração offline e roteiro | Guardar URL da execução verde do Actions e gravar um vídeo acessível |
| 5 Entrega final | ZIP com fonte, relatório, slides, roteiro e demo | Incluir URLs de código, homologação e Azure e anexar o vídeo no AVA |

## Ensaio com dois navegadores

1. Abra o mesmo endereço HTTPS em dois perfis de navegador independentes. Cadastre duas contas com apelidos diferentes.
2. Na conta X, crie uma sala. Entre com a conta O pelo código. Com uma terceira conta, verifique que a sala cheia bloqueia a entrada.
3. Jogue X1, O4, X2, O5, X3. Confirme a alternância e verifique a vitória de X nos dois navegadores. Recarregue o navegador O e use **Retomar última sala**.
4. No placar, confirme o acréscimo de 3 pontos para X e uma derrota para O. Abra o placar novamente e confira que não duplicou os pontos.
5. Em outra sala, use as casas 1, 2, 3, 5, 4, 6, 8, 7 e 9 alternando X e O. Confirme empate e 1 ponto adicional por conta.
6. Saia da sessão. Verifique se jogar exige login. Na versão Hasura, confirme HTTPS na URL e WSS nas ferramentas de rede do navegador.
7. Para a meta RNF01, grave a tela com os navegadores lado a lado ou capture timestamps no teste de interface. Meça de cada clique até a primeira aparição da marca na outra sessão. Repita a sequência de vitória em seis partidas para obter 30 medidas. Registre cada tempo em ms, a URL, os navegadores, a conexão e a data. A meta é atingida com pelo menos 29 das 30 jogadas em até 2.000 ms. Distinga as medidas de navegador do smoke test local de API.
8. Para RNF02, execute o workflow e confirme, no ambiente publicado, que sessão de terceiro não lê a sala, que os players não têm mutations de escrita direta e que o build não contém segredo administrativo.

## Links para o envio

Preencha com URLs reais, abra em janela anônima e confirme as permissões antes de anexar ao AVA.

- Código-fonte GitHub:
- Homologação Codespaces/Replit:
- Produção Azure Static Web Apps:
- CI e PRs:
- Trello:
- Vídeo:
