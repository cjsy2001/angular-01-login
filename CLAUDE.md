# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the P2 Platform repository containing three major components for implementing federated authentication and security management across the P2 suite:

- **Client Hub** (`/client-hub/`) - Central authentication hub and application launchpad with user/org/permission management
- **Platform Functions User Security** (`/platform-functions-user-security/`) - Event-driven serverless security orchestration
- **Architecture Documentation** (`/arch-docs/`) - Technical documentation and architectural guidance

The platform implements federated authentication allowing customers to use their own identity providers (Active Directory, Azure AD) while maintaining control over application access through a persona-based permission model.

## Architecture

### Federated Authentication Flow
1. User logs in with domain email → Auth0 detects federation → Redirects to customer's identity provider
2. Customer AD authenticates → Returns with AD groups → Maps to P2 personas (e.g., "Revenue Accountant")
3. Personas grant application entitlements → Security events propagate changes → User accesses applications

### Event-Driven Security Architecture
- **Events** flow through Azure Service Bus topics (entitlement-granted, permission-revoked, etc.)
- **Security Functions** orchestrate permission changes using Durable Functions
- **Route Registry** maps security events to appropriate application APIs
- **Security Sync** ensures all applications in suite reflect permission changes

### Key Integration Points
- **Auth0**: Central authentication broker supporting managed and federated users
- **Azure Service Bus**: Event messaging backbone for security changes
- **DataManager API**: Central event publishing entry point
- **Permission Service**: Manages role-based access control with hierarchy (Global/Org/App Admin)

## Development Commands

### Client Hub (Full-Stack Application)

```bash
# Frontend (Angular)
cd client-hub/ui
npm install
npm start                    # Dev server on http://localhost:4200
npm run build-prod          # Production build
npm run lint                # Run ESLint
npm test                    # Run unit tests

# Backend (.NET API)
cd client-hub/src
dotnet build
dotnet run --project P2.ClientHub.Api
dotnet test

# Docker Development
cd client-hub
docker-compose up           # Start UI and API containers
docker-compose down         # Stop containers
```

### Platform Functions User Security (Azure Functions)

```bash
cd platform-functions-user-security/src
dotnet build P2.Platform.Security.Functions.sln
dotnet test P2.Platform.Security.Functions.sln

# Run locally
cd P2.Platform.Security.Functions
func start

# Run specific test
dotnet test --filter "FullyQualifiedName~TestClassName.TestMethodName"
```

### Architecture Documentation

```bash
cd arch-docs
# Build documentation site locally
mkdocs serve
```

## Code Architecture and Patterns

### Client Hub Structure
- **Frontend**: Angular 16 with lazy-loaded modules, PrimeNG components, RxJS state management
- **Backend**: .NET 6 Web API with policy-based authorization, custom auth handlers
- **Services**: Platform services via NuGet packages (@p2/platform-*)
- **Testing**: SpecFlow acceptance tests, xUnit unit tests, Selenium UI automation

### Security Functions Structure
- **Triggers**: Service Bus event triggers (`EntitlementGrantedFunction`, `UserCreatedFunction`)
- **Orchestrators**: Durable Functions for complex workflows (`UserDeleteOrchestrator`)
- **Activities**: Atomic operations (`ActivityDeleteUserFunction`)
- **Middleware**: Request/response logging, correlation ID tracking

### Key Design Patterns
- **Event-Driven**: Push-based notifications replace polling
- **Microservices**: Independent services for Users, Permissions, Notifications, etc.
- **Persona-Based Security**: Maps AD groups to application permissions
- **Idempotent Operations**: Ensure reliable, repeatable security changes
- **Route Registry**: Dynamic service discovery for security endpoints

## Testing Approach

### Unit Tests
```bash
# Client Hub
dotnet test P2.ClientHub.Api.UnitTests

# Security Functions
dotnet test P2.Platform.Security.Functions.UnitTests
```

### Acceptance Tests
```bash
# SpecFlow tests with different environments
dotnet test P2.ClientHub.AcceptanceTests --settings Arc.runsettings
```

### Test Organization
- Builder pattern for test scenarios
- Page Object Model for UI automation
- Mock external dependencies with Moq
- Test both success and failure paths

## Infrastructure

### Terraform Deployment
- **Client Hub**: `/client-hub/iac/hub/` - App Service, Auth0, monitoring
- **Security Functions**: `/platform-functions-user-security/iac/` - Function Apps, Service Bus
- **Environments**: Sandbox, Dev, Test, Arc, Production configurations

### Azure Resources
- App Services for web applications
- Function Apps for serverless compute
- Service Bus for messaging
- Application Insights for monitoring
- Key Vault for secrets management
- API Management for gateway

## Important Federation Concepts

### Three User Types
1. **Managed Users**: Auth0-managed credentials
2. **Hosted Federated**: P2C/Cubasp Active Directory
3. **Customer Federated**: External customer AD systems

### Persona Mapping
- Personas are reusable groups that map AD groups to application permissions
- One AD group can map to multiple personas and vice versa
- Personas work for both federated and non-federated users

### Virtual Desktop Credentials
- Required for Citrix application access
- Generated on first federated login
- Username format: 8 characters (firstname/lastname + numbers)

### Security Sync Requirements
- All applications in a suite must implement Security Sync before federation rollout
- Applications must handle virtual desktop credential requirements
- Loading states required during first-time federated user setup