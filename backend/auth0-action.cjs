exports.onExecutePostLogin = async (event, api) => {
  if (!event.resource_server || event.resource_server.identifier !== event.secrets.HASURA_AUDIENCE) return;
  api.accessToken.setCustomClaim("https://hasura.io/jwt/claims", {
    "x-hasura-default-role": "jogador",
    "x-hasura-allowed-roles": ["jogador"],
    "x-hasura-user-id": event.user.user_id
  });
};
