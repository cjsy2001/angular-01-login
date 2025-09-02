Overview

We have bunch of meeting to dicuss how to implement Federated Authentication into IFS Central (client hub) with Auth0.

## Meeting One

Federation Solution Meeting Summary
Core Problem
IFS Central currently manages user identities internally, but customers increasingly request federation - allowing them to maintain control of user identities through their own systems (Active Directory, Azure AD) rather than sharing user data with external services.
Proposed Solution Architecture
Key Component: Personas
The solution introduces personas as a bridge between customer identity systems and IFS Central:

Persona: A descriptive role (e.g., "Revenue Accountant", "Field Engineer") that maps to:

Enterprise store groups (AD groups on customer side)
Application entitlements and permissions in IFS Central


One-to-many mapping: Multiple AD groups can map to one persona, or vice versa
Cross-platform utility: Personas work for both federated and regular users

Authentication Flow

User initiates login with domain indicating federated connection
Auth0 redirects to customer's identity provider (ADFS, LDAP, Azure AD)
Customer system authenticates user internally
Upon success, user redirected back with token containing:

User profile information
AD group memberships
Persona mappings



Implementation Workflow
First-Time Login Process

User Creation: IFS Central attempts to find user, gets 404, creates new user
Persona Assignment: Maps AD groups to personas, triggers persona assignment event
Entitlement Granting: Automatically grants applications/permissions based on persona configuration
Product Notification: Security Sync API informs relevant products of new user access
User Ready: User can access applications like any regular IFS Central user

Subsequent Logins

Delta Detection: Compare current AD groups with stored persona assignments
Reconciliation: Grant/revoke entitlements based on changes
Product Updates: Notify products of access changes via Security Sync API
Timing Optimization: Pre-calculate changes when possible to minimize wait times

Technical Requirements
Quantum Leap Team Tasks

Persona Management UI: Interface for configuring persona-to-entitlement mappings
New Events:

Persona user assigned/unassigned
Enhanced entitlement granted/revoked events


Persona Service: New API endpoints for persona management
Federation Detection: Logic to identify federated users and handle accordingly

Product Team Tasks

Security Sync Service Implementation: Core requirement for all products
OAuth Integration: Products must support OAuth authentication
Platform Persona Service: New endpoints to handle persona-based events:

Application user service updates
Application permission service updates
Persona-specific grant/revoke operations


Wait State Handling: Implement loading screens during federation setup

Key Technical Details
Token Changes

Email: Required as primary identifier
AD Groups: Included for persona mapping
Federation Flag: Indicates federated user status
Org Information: Still injected as before

Federation Providers

Primary Focus: Active Directory and Azure Active Directory
Future Expansion: Other providers (like KeyCloak for IFS Cloud) can be added incrementally
On-Premise: Customers must provide their own federation servers

Critical Dependencies
Cross-Product Coordination
All products in a suite must implement Security Sync services before federation can be offered to customers. A federated customer purchasing IFS Central + multiple products requires consistent federation support across all applications.
Timing Considerations

User Experience: Minimize wait times during login by pre-calculating persona changes
Product Synchronization: Ensure applications are ready before user attempts access
Status Monitoring: Need mechanism to detect when federation setup is complete

Support Model

Multiple Connections: Auth0 supports both managed (IFS internal) and federated connections simultaneously
Internal Users: IFS consultants/support continue using managed connections
Customer Choice: Customers can provide AD accounts for long-term embedded consultants

Outstanding Questions

KeyCloak Support: Timeline for supporting IFS Cloud's identity provider
Area-Specific Personas: Whether personas can be scoped to application areas vs tenant-wide
Standardization: Automating Citrix application configuration to reduce per-customer customization

The meeting concluded with consensus to proceed, contingent on coordinated implementation across all relevant product teams.

## Meeting Two

Federation and Persona Solution - Technical Implementation Summary
This meeting revealed significant gaps in the current federation implementation and outlined the complex authentication workflow needed to support three distinct user types in IFS Central.
The Three User Authentication Types
The system must support three different authentication patterns:

Managed Users: Auth0-managed credentials stored in Auth0 database
Hosted Federated Users: P2C/Cubasp Active Directory authentication
Customer Federated Users: External customer Active Directory systems

Critical Implementation Gaps Identified
Major Gap 1: Missing Claims Population for Managed Users

Managed users currently cannot access Citrix applications through OAuth
The Auth0 post-login flow is not populating required AD claims (SAM account name, user principal name) for managed users
This explains why some users are reporting access issues

Major Gap 2: Missing Customer Federation Validation

No Azure AD customer federated connections exist in the current setup
The Citrix Netscaler application only has P2C connection, missing P2 Arc Users connection
Customer federation workflow hasn't been properly tested or implemented

Technical Architecture Requirements
Auth0 Post-Login Flow Enhancement:

Must populate AD claims for ALL three user types
Claims needed: SAM account name, user principal name, org information
Different logic paths based on connection type (managed vs federated)

Virtual Desktop Credentials Management:

For customer federated users' first login: must generate AD credentials in the orchestrator
Username generation: 8-character limit, typically first/last name + numbers
These credentials are prerequisites for application entitlements

Application Configuration:

Each application requiring Citrix access needs proper Auth0 connection setup
Applications must support multiple connection types simultaneously
Security Sync Service implementation required for all participating applications

Step-by-Step Implementation Workflow
Phase 1: Fix Current Gaps

Restore missing Auth0 rules for managed user claim population
Add P2 Arc Users connection to Citrix Netscaler application
Implement virtual desktop credential lookup for managed users

Phase 2: Customer Federation First Login

User authenticates via customer's identity provider
Auth0 receives AD group information from customer system
Map AD groups to personas (revenue accountant, field engineer, etc.)
Create virtual desktop credentials in P2C/Cubasp
Grant entitlements based on persona mappings
Populate required claims in JWT token
Notify applications via Security Sync API

Phase 3: Customer Federation Subsequent Logins

Compare current AD groups with stored persona assignments
Calculate delta (added/removed permissions)
Update virtual desktop credentials if needed
Grant/revoke entitlements based on changes
Update claims in token
Notify applications of changes

Application Team Requirements
For Citrix Applications (like Merrick):

Implement Security Sync Service endpoints
Handle virtual desktop credential requirements
Support OAuth token validation
Process entitlement grant/revoke events

For Web Applications:

Implement OAuth connection support
Add multiple Auth0 connections (managed + federated)
Implement loading states for first-time federated users
Support silent authentication for token refresh

Outstanding Technical Details
Configuration Verification Needed:

Identify exact Citrix application ID in Auth0
Confirm which claim (SAM account name vs user principal name) Citrix requires
Validate storefront vs Netscaler configuration requirements

Documentation Requirements:

Document what each application team needs to implement
Create adoption guide for persona-based authentication
Define testing procedures for all three user types

Critical Success Factors
The implementation cannot be deployed piecemeal - all applications in a customer suite must support federation before rollout. The complexity lies not just in the Auth0 configuration, but in ensuring every participating application properly handles the Security Sync Service notifications and supports the virtual desktop credential requirements.
The meeting highlighted this is primarily a system integration challenge requiring coordination across multiple teams, with the Auth0 rule fixes being the immediate priority to restore basic functionality for existing users.

## Meeting Three


Meeting notes
Federated User Login Workflow: Chukwudi and Jie discussed the detailed workflow for federated user login, covering steps from initial authentication through entitlements, persona retrieval, virtual desktop credential creation, claim population, and application access, with Chukwudi outlining the technical flow and Jie seeking clarification on implementation status.
Citrix Integration and Claim Verification: Chukwudi and Jie reviewed the integration points with Citrix, focusing on the need to verify which claim Citrix requires for authentication, and discussed steps to identify the correct claim and server configuration, including consulting with Hassan for administrative details.
Current Implementation Status and Gaps: Jie and Chukwudi clarified the current state of the federated login workflow, with Jie noting some client-side authentication is functional, while Chukwudi confirmed that key pipeline steps such as user existence checks, persona retrieval, and claim population are not yet implemented.
Persona Concept and Mapping: Jie sought clarification on the definition of 'persona,' with Chukwudi explaining that a persona represents a reusable group of groups and roles, facilitating mapping from Active Directory groups to application-level access and supporting federation requirements.
Follow-up tasks
Citrix Claim Verification: Ask Claude or confirm within Citrix which server and application are used to configure OAuth and identify the specific claim (SAM account name or user principal name) required for authentication. (Jie)
Citrix Claim Verification: Coordinate with Hassan, the Citrix administrator, to validate which server holds the OAuth configuration and have him demonstrate where the claim is validated in Citrix. (Chukwudi, Jie)
Persona Definition Clarification: Clarify with Rachel what constitutes a persona and how it differs from a user or user group in the current system. (Jie)

## Meeting Four


Meeting notes
Federated User Authentication Workflow Planning: Chukwudi led the team, including Chayan, Rachel, Jie, and Indila, in outlining the requirements and workflow for federated user authentication, focusing on login flows, claim population, orchestration, and UI waiting phases, with emphasis on distributing work and identifying gaps for the next five weeks.
Documentation and Onboarding for Federation Workflow: Jie requested comprehensive documentation to understand the federation workflow, prompting Chayan and Rachel to discuss existing resources and commit to creating a more complete onboarding guide, with references to architecture docs and Lucidchart diagrams.
UI Screens and Entitlement Mapping: Rachel and Chayan discussed the status and requirements of UI screens for entitlement and permission mapping, identifying two primary screens as necessary and a third screen for group imports as optional, with Rachel continuing work on acceptance tests and mapping features.
Tenant Provisioning and Federation Setup: Chukwudi outlined the need to set up tenant provisioning for federated users, including logging in as a federated tenant, mapping entitlements, and validating workflows, with the team tasked to identify blockers and create a roadmap for implementation.
Technical Details of Federated Authentication Flow: Chayan and Indila discussed the technical aspects of federated authentication, including claim mapping, tenant ID handling, login form behavior, and the need for fallback mechanisms and master data mapping, with Rachel and Chayan agreeing to clarify user experience and process requirements.
Work Distribution and Next Steps: The team, led by Chayan and Rachel, discussed distributing tasks, creating maps of upcoming work, and iterating to resolve unknowns, with a focus on clarifying responsibilities and ensuring progress within the five-week timeline.
Follow-up tasks
Federation Workflow Documentation: Create comprehensive documentation outlining the current federation workflow, components involved, and remaining work to be done for onboarding new contributors. (Chayan)
UI Screens for Federation: Identify and list all UI screens related to federation, specifying which are required for initial implementation and which can be deferred, and clarify any gaps. (Rachel, Chayan)
Knowledge Transfer for New Team Members: Provide relevant documentation and guidance to Jie and Indila to help them ramp up on the federation workflow and repository structure. (Rachel, Chayan)
Tenant ID Mapping Process: Define and document the process for mapping customer tenant IDs to internal tenant IDs, including fallback mechanisms and required data mapping for federation. (Chayan)
Federated Login User Experience: Clarify and document the expected user experience for federated login, including the flow and UI changes required for different identity providers. (Chayan, Rachel)
Federation Feature Support Scope: Confirm and document which identity services (e.g., Active Directory, Azure Intra) need to be supported for the federation feature in the current phase. (Chayan)

