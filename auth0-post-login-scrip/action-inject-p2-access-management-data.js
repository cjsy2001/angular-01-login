const axios = require('axios');

exports.onExecutePostLogin = async (event, api) => {
  if (event.connection.strategy !== "auth0") {
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

  if (!event.user.email || !event.user.email_verified) {
    console.log("No email or not verified");
    return;
  }

  //Get the user info from the database and attached to the accessToken
  await getUserInfo(event.user.email, (err, userInfo) => processUserInfo(err, userInfo));

  async function getUserInfo(email, done) {
    // CurOrgCode is checked for null to enable backwards compatibility.
    // When a user is associated with multiple orgs, User.CurOrgCode must have a value to enable activation of the correct org.
    const userServiceUrl = `${event.secrets.USER_SERVICE_URL}/public/users/${email}/profile/currentOrg`;
    try {
      console.log(`GetUserProfileByCurrentOrg[${email}] - Retrieving...`);
      const response = await axios.get(userServiceUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        const msg = `Failed to retreive details of user: ${email} HTTP status: ${response.status} Error msg: ${response.statusText}`;
        console.log(msg);
        done(new Error(msg));
      }

      var p2UserInfo = response.data;
      console.log(JSON.stringify(p2UserInfo));
      if (p2UserInfo) {
        console.log(`GetUserProfileByCurrentOrg[${email}] - RETRIEVED - ${JSON.stringify(p2UserInfo)}`);
        p2UserInfo.entitlements = [];
        await getEntitlements(p2UserInfo, done);
      }
      else {
       const msg = `User details not found. Email: ${event.user.email}`;
       console.error(msg);
       done(new Error(msg));
      }
    } catch (error) {
      console.error(`Failed to get user details for user: ${event.user.email} Error: ${error}`);
      done(error);
    }
  }

  async function getEntitlements(userInfo, done) {
    var permissionServiceUrl = `${event.secrets.PERMISSION_SERVICE_URL}/public/entitlements/organizations/${userInfo.org}/users/${userInfo.email}`;
    console.log(`GetEntitlements[${userInfo.Org}:${userInfo.Email}] - Retrieving...`);
    const response = await axios.get(permissionServiceUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': event.secrets.INTERNAL_API_SUBSCRIPTION_KEY,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    if (response.status !== 200) {
      const msg = `Failed to retreive entitlements for user: ${userInfo.email} org: ${userInfo.org} HTTP status: ${response.status} Error msg: ${response.statusText}`;
      console.log(msg);
      done(new Error(msg));
    }
    var entitlements = response.data;
    console.log(`GetEntitlements[${userInfo.org}:${userInfo.email}] - RETRIEVED - ${JSON.stringify(entitlements)}`);
    try {
      entitlements.forEach(function (entitlement) {
        userInfo.entitlements.push(`${entitlement.context}-${entitlement.sandbox}`);
      });
      console.log(userInfo.entitlements);
    } catch (error) {
      console.error(`Unexpected entitlements body format for user: ${userInfo.Email} Org: ${userInfo.Org} Error: ${error}`);
    }
    done(null, userInfo);
  }

  function processUserInfo(err, p2UserInfo) {
    if (err) {
      //There was an error so we will return that to the caller
      console.log("error happened ", err);
      return;
    }
    //The namespace to prefix for everything
    var namespace = 'https://p2es.com/';

    if (p2UserInfo) {

      //User Info returned, so process it.

      if (p2UserInfo.org && p2UserInfo.org.length > 0) {
        // Org was loaded from the DB
        api.accessToken.setCustomClaim(namespace + 'org', p2UserInfo.org);
        api.idToken.setCustomClaim(namespace + 'org', p2UserInfo.org);

        if (p2UserInfo.activeState && p2UserInfo.activeState.length > 0 && p2UserInfo.activeState === 'INACTIVE') {
          api.accessToken.setCustomClaim(namespace + 'active', 'false');
          api.idToken.setCustomClaim(namespace + 'active', 'false');
          return;
        }
        api.accessToken.setCustomClaim(namespace + 'active', 'true');
        api.idToken.setCustomClaim(namespace + 'active', 'true');
      }

      if (p2UserInfo.entitlements && p2UserInfo.entitlements.length > 0) {
        // The Groups were specified and > 0 length
        const entitlements = p2UserInfo.entitlements.join(' ');
        api.accessToken.setCustomClaim(namespace + 'grps', entitlements);
        api.idToken.setCustomClaim(namespace + 'grps', entitlements);
      }

      if (p2UserInfo.partnerId) {
        // PartnerId was loaded from the DB
        api.accessToken.setCustomClaim(namespace + 'partnerId', p2UserInfo.partnerId);
        api.idToken.setCustomClaim(namespace + 'partnerId', p2UserInfo.partnerId);
      }

      if (p2UserInfo.partnerType) {
        // PartnerType was loaded from the DB
        api.accessToken.setCustomClaim(namespace + 'partnerType', p2UserInfo.partnerType);
        api.idToken.setCustomClaim(namespace + 'partnerType', p2UserInfo.partnerType);
      }
    }

    return;
  }
}
