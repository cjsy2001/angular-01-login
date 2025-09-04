exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.strategy === "ad") {
    return;
  }

  const namespace = 'https://p2es.com/';

  if (event.user.email) {
    api.accessToken.setCustomClaim(namespace + 'email', event.user.email);
  } else if (event.user.name) {
    api.accessToken.setCustomClaim(namespace + 'email', event.user.name);
  }
  return;
}