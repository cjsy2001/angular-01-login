locals {
  first_name = "client"
  last_name  = "hub"
  user_id    = "${local.first_name}${local.last_name}"
  group_name = "internal"
  product_id = "internal"
  user_email = "client.hub@p2energysolutions.com"
}

resource "random_password" "user_password" {
  length           = 16
  special          = false
  override_special = "!_"
}

# WARNING: Changing user_id or group_name will force a new resource to be created
resource "azurerm_api_management_user" "client_hub_user" {
  user_id             = local.user_id
  api_management_name = data.terraform_remote_state.api_management.outputs.api_mgmt_name
  resource_group_name = data.terraform_remote_state.api_management.outputs.resource_group_name
  first_name          = local.first_name
  last_name           = local.last_name
  email               = local.user_email
  password            = random_password.user_password.result
}

resource "azurerm_api_management_group_user" "group_user" {
  user_id             = azurerm_api_management_user.client_hub_user.user_id
  group_name          = local.group_name
  resource_group_name = data.terraform_remote_state.api_management.outputs.resource_group_name
  api_management_name = data.terraform_remote_state.api_management.outputs.api_mgmt_name
}

resource "azurerm_api_management_subscription" "client_hub_user" {
  resource_group_name = data.terraform_remote_state.api_management.outputs.resource_group_name
  api_management_name = data.terraform_remote_state.api_management.outputs.api_mgmt_name
  user_id             = azurerm_api_management_user.client_hub_user.id
  product_id          = data.terraform_remote_state.api_management.outputs.api_mgmt_product_internal_id
  display_name        = "${data.terraform_remote_state.api_management.outputs.api_mgmt_product_internal_name}-${local.user_id}"
  state               = "active"
  depends_on          = [azurerm_api_management_group_user.group_user]
}

