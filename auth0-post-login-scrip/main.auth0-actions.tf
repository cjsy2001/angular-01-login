locals{
    nodejs_runtime                          = "node18"
    post_login_trigger                      = "post-login"
    credentials_exchange_trigger            = "credentials-exchange"
    trigger_version_v2                      = "v2"
    trigger_version_v3                      = "v3"
    nic_grant_type                         = "client_credentials"
}

resource "auth0_action" "inject_email" {
    name    = "inject_email"
    code    = file("${path.module}/assets/auth0/action-inject-email.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
}

resource "auth0_action" "inject_name" {
    name    = "inject_name"
    code    = file("${path.module}/assets/auth0/action-inject-name.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
    dependencies {
        name    = "axios"
        version = "latest"
    }
    secrets {
        name  = "USER_SERVICE_URL"
        value = data.terraform_remote_state.user_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "INTERNAL_API_SUBSCRIPTION_KEY"
        value = azurerm_api_management_subscription.client_hub_user.primary_key
    }
}

resource "auth0_action" "inject_p2_access_management_data" {
    name    = "inject-p2-access-management-data"
    code    = file("${path.module}/assets/auth0/action-inject-p2-access-management-data.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
    dependencies {
        name    = "axios"
        version = "latest"
    }
    dependencies {
        name    = "tedious"
        version = "latest"
    }
    secrets {
        name  = "PERMISSION_SERVICE_URL"
        value = data.terraform_remote_state.permission_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "USER_SERVICE_URL"
        value = data.terraform_remote_state.user_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "INTERNAL_API_SUBSCRIPTION_KEY"
        value = azurerm_api_management_subscription.client_hub_user.primary_key
    }
    # TODO: Remove below block
    # secrets {
    #     name  = "SQL_DATABASE_USERNAME"
    #     value = var.access_mgmt_db_user_login
    # }
    # secrets {
    #     name  = "SQL_DATABASE_PASSWORD"
    #     value = var.access_mgmt_db_user_password
    # }
    # secrets {
    #     name  = "SQL_DATABASE_HOSTNAME"
    #     value = var.access_mgmt_db_server_name
    # }
    # secrets {
    #     name  = "SQL_DATABASE_NAME"
    #     value = var.access_mgmt_db_name
    # }
}

resource "auth0_action" "inject_noninteractive_client_data" {
    name    = "inject-client-org-rule-for-non-interactive"
    code    = file("${path.module}/assets/auth0/action-inject-client-org-rule-for-non-interactive.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.credentials_exchange_trigger
        version = local.trigger_version_v2
    }
}

resource "auth0_action" "inject_ad_data" {
    name    = "inject-ad-data"
    code    = file("${path.module}/assets/auth0/action-inject-ad-data.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
    dependencies {
        name    = "axios"
        version = "latest"
    }
    secrets {
        name  = "PROFILE_SERVICE_URL"
        value = data.terraform_remote_state.profile_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "TOKEN_SERVICE_URL"
        value = data.terraform_remote_state.tokenproxy_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "INTERNAL_API_SUBSCRIPTION_KEY"
        value = azurerm_api_management_subscription.client_hub_user.primary_key
    }
    secrets {
        name  = "NIC_CLIENT_ID"
        value = data.azurerm_key_vault_secret.nic_m2m_client_id.value
    }
    secrets {
        name  = "NIC_CLIENT_SECRET"
        value = data.azurerm_key_vault_secret.nic_m2m_client_secret.value
    }
    secrets {
        name  = "NIC_TOKEN_AUDIENCE"
        value = var.oauth_audience
    }
    secrets {
        name  = "GRANT_TYPE"
        value = local.nic_grant_type
    }
}

resource "auth0_action" "inject_persona_data" {
    name    = "inject-persona-data"
    code    = file("${path.module}/assets/auth0/action-inject-persona-data.js")
    deploy  = true
    runtime = local.nodejs_runtime
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
    dependencies {
        name    = "axios"
        version = "latest"
    }
    secrets {
        name  = "PERMISSION_SERVICE_URL"
        value = data.terraform_remote_state.permission_service.outputs.api_management_route["route_v1"]
    }
    secrets {
        name  = "INTERNAL_API_SUBSCRIPTION_KEY"
        value = azurerm_api_management_subscription.client_hub_user.primary_key
    }
}

resource "auth0_action" "adaptive_mfa" {
    name    = "adaptive-mfa"
    supported_triggers {
        id      = local.post_login_trigger
        version = local.trigger_version_v3
    }
    code    = file("${path.module}/assets/auth0/action-adaptive-mfa.js")
    deploy  = true
    runtime = local.nodejs_runtime
}

resource "auth0_trigger_action" "inject_email" {
  trigger = local.post_login_trigger
  action_id = auth0_action.inject_email.id
  display_name = auth0_action.inject_email.name
}

resource "auth0_trigger_action" "inject_name" {
  trigger = local.post_login_trigger
  action_id = auth0_action.inject_name.id
  display_name = auth0_action.inject_name.name
}

resource "auth0_trigger_action" "inject_p2_access_management_data" {
  trigger = local.post_login_trigger
  action_id = auth0_action.inject_p2_access_management_data.id
  display_name = auth0_action.inject_p2_access_management_data.name
}

resource "auth0_trigger_action" "inject_noninteractive_client_data" {
  trigger = local.credentials_exchange_trigger
  action_id = auth0_action.inject_noninteractive_client_data.id
  display_name = auth0_action.inject_noninteractive_client_data.name
}

resource "auth0_trigger_action" "inject_ad_data" {
  trigger = local.post_login_trigger
  action_id = auth0_action.inject_ad_data.id
  display_name = auth0_action.inject_ad_data.name
}

resource "auth0_trigger_action" "inject_persona_data" {
  trigger = local.post_login_trigger
  action_id = auth0_action.inject_persona_data.id
  display_name = auth0_action.inject_persona_data.name
}

resource "auth0_trigger_action" "adaptive_mfa" {
  trigger = local.post_login_trigger
  action_id = auth0_action.adaptive_mfa.id
  display_name = auth0_action.adaptive_mfa.name
}