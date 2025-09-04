const axios = require('axios');
exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.strategy === "ad") {
    return;
  }

  const nameSchemaClaimKey = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
  if (event.user.name) {
    api.accessToken.setCustomClaim(nameSchemaClaimKey, event.user.name);
  }
  else {
    console.log('Name missing in event.user.name profile for email: ' + event.user.email);
  }

  await getUserDetails(event.user.email, (err, details) => {
    if (err) {
      return;
    }
    if (details) {
      // the only claims that are available to use when scope is set to 'openid profile'
      // https://auth0.com/docs/tokens/guides/id-token/get-id-tokens
      if (details.firstName) {
        api.idToken.setCustomClaim('given_name', details.firstName);
      }
      else {
        console.log('First name missing in user profile for email: ' + event.user.email);
      }

      if (details.lastName) {
        api.idToken.setCustomClaim('family_name', details.lastName);
      }
      else {
        console.log('Last name missing in user profile for email: ' + event.user.email);
      }
    }
    return;
  });

  async function getUserDetails(email, done) {
    const userServiceUrl = `${event.secrets.USER_SERVICE_URL}/public/users/${email}/profile`;
    try {
      console.log(`GetUserProfile[${email}] - Retrieving...`);
      const response = await axios.get(userServiceUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        const msg = `Failed to retreive profile for user: ${email} HTTP status: ${response.status} Error msg: ${response.statusText}`;
        console.log(msg);
        done(new Error(msg));
      }

      if (response.data) {
        console.log(`GetUserProfile[${email}] - RETRIEVED - ${JSON.stringify(response.data)}`);
        done(null, response.data);
      }
      else {
        const msg = `No profile found for user: ${email}`;
        console.log(msg);
        done(msg);
      }
    } catch (error) {
      console.error(`Failed to get profile for user: ${event.user.email} Error: ${error}`);
      done(error);
    }
  }
}