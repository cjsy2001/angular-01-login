// Client Credentials Exchange
exports.onExecuteCredentialsExchange = async (event, api) => {
    try {
        if(event.client.metadata) {
            if(event.client.metadata.app_user_id) {
                api.accessToken.setCustomClaim('https://p2es.com/userid', event.client.metadata.app_user_id);
            }
            const org = event.client.metadata.org ? event.client.metadata.org : '';
            api.accessToken.setCustomClaim('https://p2es.com/org', org);
        }
        else {
            console.log(`Client: ${event.client.name} metadata is not set in onExecuteCredentialsExchange`);
        }
    } catch (error) {
        console.error(`Error in onExecuteCredentialsExchange. User: ${event.client.name} Error: ${error}`);
    }
}