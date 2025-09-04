const axios = require('axios');

exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.strategy === "auth0") {
    return;
  }

  // Reset the scopes in favor of groups.  By default, any user can request
  // any scope defined for an audience/API!  We need to reset the scope to
  // prevent unintended access to our applications. -SCP
  if (event.transaction.requested_scopes) {
    // Every user has been granted the scopes below
    var defaultScopes = [
      'openid',
      'profile',
      'email',
    ];

    // We will only allow offline_access scope to be included if requested
    var allowedAdditionalScopes = [
      'offline_access'
    ];

    var allowedRequestedScopes = event.transaction.requested_scopes.filter((val) => {
      return allowedAdditionalScopes.includes(val);
    });

    const scopes = defaultScopes.concat(allowedRequestedScopes);
    scopes.forEach(scope => {
      if(scope && scope.trim()){
        api.accessToken.addScope(scope);
      }
    });
  }

  var org = (event.user.user_metadata && event.user.user_metadata.org) ? event.user.user_metadata.org : '';

  var groups = [];
  if (event.user.groups) {
    groups = event.user.groups;
  }
  else if (event.user.app_metadata && event.user.app_metadata.groups) {
    groups = event.user.app_metadata.groups;
  }
  else {
    console.log("Unable to find groups for the user: ", event.user.email);
  }

  if (org && groups.length > 0) {
    console.log("Retriving persona entitlements through user groups");
    getEntitlements({
      Org: org,
      Groups: Array.isArray(groups) ? groups : [groups],
      IsFederated: true,
      Entitlements: []
    }, (err, userInfo) => processUserInfo(err, userInfo));
  } else {
    console.log("Unable to find org for the user: ", event.user.emails);
    return;
  }

  async function getEntitlements(userInfo, done) {
    const query = userInfo.Groups.map(g => `groupIds=${g}`).join('&');
    const permissionServiceUrl = `${event.secrets.PERMISSION_SERVICE_URL}/public/entitlements/organizations/${userInfo.Org}/personas?${query}`;

    console.log(`GetEntitlements[${userInfo.Org}:${userInfo.Email}] - Retrieving...`);
    try {
      const response = await axios.get(permissionServiceUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        const msg = `Failed to retreive entitlements for user: ${userInfo.Email} org: ${userInfo.Org} HTTP status: ${response.status} Error msg: ${response.statusText}`;
        console.log(msg);
        done(new Error(msg));
      }

      var entitlements = response.data;
      console.log(`GetEntitlements[${userInfo.Org}:${userInfo.Email}] - RETRIEVED - ${JSON.stringify(entitlements)}`);
      try {
        entitlements.forEach(function (entitlement) {
          userInfo.Entitlements.push(`${entitlement.context}-${entitlement.sandbox}`);
        });
      } catch (error) {
        console.error(`Unexpected entitlements body format for user: ${userInfo.Email} Org: ${userInfo.Org} Error: ${error}`);
      }
      done(null, userInfo);

    } catch (error) {
      console.error(`Entitlement retreival failed for user: ${userInfo.Email} Org: ${userInfo.Org} Error: ${error}`);
      done(error);
    }
  }

  function processUserInfo(err, p2UserInfo) {
    if (err) {
      return;
    }
    const namespace = 'https://p2es.com/';
    if (p2UserInfo) {
      if (p2UserInfo.Org && p2UserInfo.Org.length > 0) {
        api.accessToken.setCustomClaim(namespace + 'org', p2UserInfo.Org);
        api.idToken.setCustomClaim(namespace + 'org', p2UserInfo.Org);

        if (p2UserInfo.ActiveState && p2UserInfo.ActiveState.length > 0 && p2UserInfo.ActiveState === 'INACTIVE') {
          api.accessToken.setCustomClaim(namespace + 'active', 'false');
          api.idToken.setCustomClaim(namespace + 'active', 'false');
          return;
        }
        api.accessToken.setCustomClaim(namespace + 'active', 'true');
        api.idToken.setCustomClaim(namespace + 'active', 'true');
      }

      if (p2UserInfo.Entitlements && p2UserInfo.Entitlements.length > 0) {
        api.accessToken.setCustomClaim(namespace + 'grps', p2UserInfo.Entitlements.join(' '));
        api.idToken.setCustomClaim(namespace + 'grps', p2UserInfo.Entitlements.join(' '));
      }

      api.accessToken.setCustomClaim(namespace + 'federated', p2UserInfo.IsFederated);
      api.idToken.setCustomClaim(namespace + 'federated', p2UserInfo.IsFederated);
    }
    return;
  }
}
