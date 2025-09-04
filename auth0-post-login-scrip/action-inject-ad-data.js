const axios = require('axios');

exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.strategy !== "ad") {
    return;
  }

  const namespace = "https://qbyte.com/";
  const p2esNamespace = 'https://p2es.com';

  api.accessToken.setCustomClaim(namespace + 'username', event.user.username);
  api.idToken.setCustomClaim(namespace + 'username', event.user.username);

  api.accessToken.setCustomClaim(namespace + 'userPrincipalName', event.user.userPrincipalName);
  api.idToken.setCustomClaim(namespace + 'userPrincipalName', event.user.userPrincipalName);

  api.accessToken.setCustomClaim(namespace + 'sAMAccountName', event.user.sAMAccountName);
  api.idToken.setCustomClaim(namespace + 'sAMAccountName', event.user.sAMAccountName);

   // set federated claim
   const federatedClaim = `${p2esNamespace}/federated`;
   api.accessToken.setCustomClaim(federatedClaim, true);
   api.idToken.setCustomClaim(federatedClaim, true);

  if (event.user.organizationUnits) {
    api.accessToken.setCustomClaim(namespace + 'orgUnit', event.user.organizationUnits);
    api.idToken.setCustomClaim(namespace + 'orgUnit', event.user.organizationUnits);
    await setOrgClaim(event, api, p2esNamespace);
  }
  return;

  // Check for central org code in user metadata managed by Auth0. 
  // If not found, lookup the org code from organization units, provided bypassOrgCheck flag is not set in user profile.
  // Based on the org code lookup result, set the central org claim in the token.
  // If org code is not found, set the bypassOrgCheck flag in user profile to avoid repeated lookups.
  async function setOrgClaim(event, api, namespace) {
    const claim = `${namespace}/org`;
    const org = 'org';
    const bypassOrgCheck = 'bypassOrgCheck';
    const ou = event.user.organizationUnits;
    const orgCode = event.user.app_metadata && event.user.app_metadata[org];
    const shouldBypassOrgCheck = event.user.app_metadata && event.user.app_metadata[bypassOrgCheck];

    try {
      if (orgCode) {
        api.accessToken.setCustomClaim(claim, orgCode);
        api.idToken.setCustomClaim(claim, orgCode);
        console.log(`Found orgCode: ${orgCode} in app_metadata. OrganizationUnit: ${ou}. Email: ${event.user.email}`);
      }
      else {
        if (shouldBypassOrgCheck) {
          console.log(`Bypassing central org check. Organization units: ${ou}`);
          return;
        }
        const accessToken = await getAccessToken();
        if (accessToken) {
          const lookupResult = await lookupOrgCodeFromOrganizationUnits(event.connection.strategy, ou, accessToken);
          if (lookupResult.orgCode) {
            api.accessToken.setCustomClaim(claim, lookupResult.orgCode);
            api.idToken.setCustomClaim(claim, lookupResult.orgCode);
            api.user.setAppMetadata(org, lookupResult.orgCode);
            console.log(`Added orgCode: ${lookupResult.orgCode} in app_metadata. OrganizationUnit: ${ou}. Email: ${event.user.email}`);
          }
          if (lookupResult.statusCode == 404) {
            api.user.setAppMetadata(bypassOrgCheck, true);
            console.log(`Setting ${bypassOrgCheck} in app_metadata: ${event.user.email}`);
          }
        } else {
          console.log(`Failed to obtain access token. Organization units: ${ou}`);
        }
      }
    } catch (error) {
      console.error(`Error occured while setting central org claim. Organization units: ${ou}. Error details : ${error}`);
    }
  }

  async function getAccessToken() {
    var accessToken;
    try {
      const url = `${event.secrets.TOKEN_SERVICE_URL}/authorizations`;
      const body = {
        "client_id": event.secrets.NIC_CLIENT_ID,
        "client_secret": event.secrets.NIC_CLIENT_SECRET,
        "audience": event.secrets.NIC_TOKEN_AUDIENCE,
        "grant_type": event.secrets.GRANT_TYPE
      };
      const response = await axios.post(url, body, {
        headers: {
          'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      }).catch((error) => {
        if (error.response) {
          const msg = `Failed to generate access token. Status code: ${error.response.status} Server response: ${error.response.data}`;
          console.log(msg);
        }
      });

      if (response && response.status == 200) {
        accessToken = response.data.access_token;
      }
    }
    catch (error) {
      console.error(`Error occured while requesting access token. Error details: ${error}`)
    }
    return accessToken;
  }

  async function lookupOrgCodeFromOrganizationUnits(connectionStrategy, organizationUnits, accessToken) {
    var orgCode;
    var statusCode = 999; // default value
    try {
      const encodedQueryParam = encodeURIComponent(organizationUnits);
      const url = `${event.secrets.PROFILE_SERVICE_URL}/internal/ProfileOrganizations/federation/${connectionStrategy}/orgCode?organizationUnits=${encodedQueryParam}`;
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 15000
      }).catch((error) => {
        if (error.response) {
          statusCode = error.response.status;
          const msg = `Failed to get orgCode for organizationUnits: ${organizationUnits}. Status code: ${error.response.status} Server response: ${JSON.stringify(error.response.data.message)}`;
          console.log(msg);
        }
      });

      if (response && response.status == 200) {
        statusCode = response.status;
        orgCode = response.data;
      }
    } catch (error) {
      console.error(`Error occured while querying org code: ${error}`);
    }
    return { orgCode: orgCode, statusCode: statusCode };
  }
}