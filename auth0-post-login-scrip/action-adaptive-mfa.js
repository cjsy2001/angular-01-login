// Adaptive MFA Rules
exports.onExecutePostLogin = async (event, api) => {
  /*
   * This rule is used to trigger multifactor authentication when a specific risk assessment result is detected.
   *
   * Use of this rule is recommended when end users are already enrolled in MFA and you wish to trigger MFA
   * based on contextual risk.
   *
   * The `context.riskAssessment` attribute will be available only when Adaptive MFA is enabled for your tenant.
   *
   * Attention: Use of the Adaptive MFA feature requires an add-on for the Enterprise plan.
   *
   * For more information about Adaptive MFA and the `context.riskAssessment` attribute, read the full documentation
   * at https://auth0.com/docs/mfa/adaptive-mfa.
  */
  const riskAssessment = event.authentication.riskAssessment;

  // Option 1: always prompt MFA as long as it's within 24 hours, USE IT IN PRODUCTION
  let shouldPromptMfa = true;

  // Option 2: prompt MFA only if the overall assessment is not high
  // let shouldPromptMfa = riskAssessment.confidence != 'high';

  // Option 3: prompt MFA if there is one assessment considered as medium or low, open in Incognito Window mode will trigger it
  /*let overall = [];
  let assessments = riskAssessment.assessments;
  for (var k in riskAssessment.assessments) {
    overall.push(assessments[k].confidence);
  }
  let shouldPromptMfa = overall.indexOf('low') >= 0 || overall.indexOf('medium') >= 0;*/

  // Prompt MFA once per session, so refresh token will still work
  if (shouldPromptMfa) {
    let authMethods = [];
    if (event.authentication && Array.isArray(event.authentication.methods)) {
      authMethods = event.authentication.methods;
    }
    shouldPromptMfa = !authMethods.find((method) => method.name === 'mfa');
  }

  // It only makes sense to prompt for MFA when the user has at least one enrolled MFA factor.
  // Use of this rule is only recommended when end users are already enrolled in MFA.
  // MFA should also be bypassed for Acceptance Testing in development environments.
  // const userEnrolledFactors = user.multifactor || [];
  // const canPromptMfa = userEnrolledFactors.length > 0;
  const email = event.user.email;
  try {
    const canPromptMfa = event.client.metadata.enable_mfa === 'true' &&
      !(event.client.metadata.development === 'true' && (event.user.user_metadata.type === 'automation' || (email && (email.endsWith('@p2auto.com') || email.startsWith('testuser.') || email.startsWith('sut.')))));
  
    if (shouldPromptMfa && canPromptMfa) {
      console.log('user will be prompt to be enrolled in MFA. Email: ' + email);
      api.multifactor.enable('any',{
        allowRememberBrowser: true
      });
    }
  } catch (error) {
    console.log("error occured in adaptive-mfa action for user: " + email + " Error details: "+ error);
  }
};
