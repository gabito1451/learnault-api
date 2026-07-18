# Domain Inventory

## Current System Structure

### Identified Domains (from routes and controllers)

Based on the current codebase structure, the following domains have been identified:

1. **Identity & Access** (`auth`)
   - Routes: `/v1/auth`
   - Controllers: `auth.controller.ts`
   - Schemas: `auth.schema.ts`
   - Responsibilities: Registration, login, logout, email verification, token management

2. **User Management** (`users`)
   - Routes: `/v1/users`
   - Controllers: `user.controller.ts`
   - Types: `user.types.ts`
   - Responsibilities: User profiles, password changes, wallet address management

3. **Learning Content** (`modules`)
   - Routes: `/v1/modules`
   - Controllers: `module.controller.ts`
   - Types: `module.types.ts`
   - Database: `Module`, `Completion` models
   - Responsibilities: Course modules, learning content management, completions

4. **Credentials** (`credentials`)
   - Routes: `/v1/credentials`
   - Controllers: `credential.controller.ts`
   - Types: `credential.types.ts`
   - Database: `Credential` model
   - Responsibilities: Digital credential issuance, verification, on-chain credential management

5. **Rewards** (`rewards`)
   - Routes: `/v1/rewards`
   - Controllers: `reward.controller.ts`
   - Services: `reward.service.ts`
   - Types: `reward.types.ts`
   - Database: `Transaction` model
   - Responsibilities: Reward calculation, distribution, withdrawal, balance management

6. **Referrals** (`referrals`)
   - Routes: `/v1/referrals`
   - Controllers: `referral.controller.ts`
   - Database: `ReferralCode`, `Referral` models
   - Responsibilities: Referral code generation, tracking, bonus payment

7. **Notifications** (`notifications`)
   - Routes: `/v1/notifications`
   - Controllers: `notification.controller.ts`
   - Services: `notification.service.ts`
   - Database: `DeviceToken`, `NotificationPreference`, `NotificationLog` models
   - Responsibilities: Push notifications, device token management, preferences

8. **Organizations/Employers** (`employers`)
   - Routes: `/v1/employer`
   - Controllers: `employer.controller.ts`
   - Responsibilities: Employer/organization management

9. **Synchronization** (`sync`)
   - Routes: `/v1/sync`
   - Controllers: `sync.controller.ts`
   - Database: `SyncEvent` model
   - Responsibilities: Client-server sync, event handling, idempotency

10. **Blockchain Integration** (`blockchain`)
    - Services: `stellar.service.ts`, `soroban.service.ts`
    - Config: `stellar.ts`
    - Responsibilities: Stellar/Soroban integration, payment processing, on-chain operations

### Shared Kernel Components

Components that are cross-cutting and should be part of the shared kernel:

1. **Configuration** (`config/`)
   - `database.ts` - Database client and connection
   - `env.ts` - Environment variable validation
   - `logger.ts` - Logging configuration
   - `stellar.ts` - Blockchain configuration
   - `swagger.ts` - API documentation configuration

2. **Error Handling** (`utils/errors.ts`, `middleware/error.middleware.ts`)
   - Error types and error handler middleware
   - `errorHandler.ts`

3. **Middleware** (`middleware/`)
   - `auth.middleware.ts` - JWT authentication
   - `validation.middleware.ts` - Request validation
   - `rate-limit.middleware.ts` - Rate limiting

4. **Utilities** (`utils/`)
   - `jwt.ts` - JWT token utilities
   - `password.ts` - Password hashing
   - `date.ts`, `number.ts`, `string.ts` - Common helpers
   - `helpers.ts` - General utilities
   - `constant.ts` - Application constants

5. **Messaging Infrastructure**
   - `services/webhook.service.ts` - Webhook delivery
   - `services/email.service.ts` - Email delivery (outbox pattern)
   - Database: `WebhookEndpoint`, `WebhookDelivery`, `EmailDelivery` models

### Cross-Domain Dependencies Detected

#### Strong Dependencies (Direct Service Calls)

1. **AuthController → EmailService**
   - `auth.controller.ts` imports `emailService` to send verification emails
   - Type: Synchronous service call (queued)

2. **RewardService → StellarService**
   - `reward.service.ts` imports `StellarService` for payment processing
   - Type: Synchronous service call

3. **RewardService → NotificationService**
   - `reward.service.ts` imports `NotificationService` to send reward notifications
   - Type: Fire-and-forget async call

#### Implicit Dependencies (via Database)

1. **Rewards → Users** (via `Transaction.userId`)
2. **Credentials → Users** (via `Credential.userId`)
3. **Credentials → Modules** (via `Credential.moduleId`)
4. **Completions → Users + Modules** (junction table)
5. **Referrals → Users** (both referrer and referree)
6. **Notifications → Users** (via `NotificationLog.userId`, `DeviceToken.userId`)
7. **EmailDelivery → Users** (via `EmailDelivery.userId`)

#### Orchestration Concerns (Needs Resolution)

The following workflows span multiple domains and need clear ownership:

1. **Module Completion Flow**
   - Touches: Learning Content, Rewards, Credentials, Notifications, Referrals
   - Current: Unclear ownership
   - Question: Who orchestrates the flow?

2. **Reward Claim Flow**
   - Touches: Rewards, Blockchain, Referrals, Notifications
   - Current: `RewardService` orchestrates
   - Issue: Direct dependencies on NotificationService

3. **User Registration Flow**
   - Touches: Identity, Users, Notifications (email)
   - Current: `AuthController` orchestrates
   - Issue: Direct dependency on EmailService

4. **Credential Issuance Flow**
   - Touches: Credentials, Blockchain, Users, Modules
   - Current: Unclear ownership

### Type Dependencies

Cross-domain type imports detected:

1. `reward.controller.ts` uses types from `reward.types.ts` (✓ same domain)
2. `auth.controller.ts` uses `UserRole` from `user.types.ts` (cross-domain)
3. Various controllers import from `api.types.ts` (shared types)

### Database Schema Observations

From `prisma/schema.prisma`:

- Strong foreign key relationships create implicit dependencies
- Some models serve multiple domains (e.g., `User`)
- Transaction tables (`Transaction`, `WebhookDelivery`, `EmailDelivery`) follow outbox pattern
- No clear domain boundaries in database organization

## Next Steps

1. Define clear domain responsibilities and boundaries
2. Establish the shared kernel
3. Resolve orchestration ownership
4. Define public interfaces for each domain
5. Establish forbidden dependency rules
6. Implement import boundary checks
