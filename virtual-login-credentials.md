
Central application requiring virtual login credentials have below information.
```json
{
"virtualDesktopId": "azurecitrix-test-prod",
"virtualDesktop": "azurecitrix",
"sandboxId": "test-prod",
"name": "Virtual Desktop",
"loginMode": "AD",
"href": "https://ctxdev.p2devops.com/",
"passwordSyncDisabled": false,
"requirementsOnly": false,
"iframeDisabled": false,
"hostingOrgShortName": "p2autoarc",
"activeDirectoryDomain": "p2c.com"
}
```

During federated user profile setup, if any application requires virtual login credentials, then username and password will be auto generated for the user. The user should be notified about the credentials via email.
Request URL https://arc.p2devops.com/svc/api/users/sut.appadmin.pyx0y@p2auto.com/virtualLogins/azurecitrix-test-prod 
Request Method POST 
Status Code 200 OK 
Remote Address 40.121.22.174:443 
Referrer Policy strict-origin-when-cross-origin
Payload {"username":"test","password":"Abctest@1234","previousPassword":null}
Response: None
Need ability for org admins to self-serve for password reset for federated users
