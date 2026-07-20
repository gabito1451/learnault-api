# Request and Domain Event Flows

This document maps the key request flows and domain event propagation patterns across the Learnault API bounded contexts.

---

## Table of Contents

1. [User Registration Flow](#user-registration-flow)
2. [User Login Flow](#user-login-flow)
3. [Module Completion Flow](#module-completion-flow)
4. [Reward Claim Flow](#reward-claim-flow)
5. [Credential Issuance Flow](#credential-issuance-flow)
6. [Referral Application Flow](#referral-application-flow)
7. [Withdrawal Flow](#withdrawal-flow)
8. [Notification Delivery Flow](#notification-delivery-flow)

---

## User Registration Flow

### Trigger
`POST /api/v1/auth/register`

### Request Flow

```plaintext
Client
  ↓ POST /api/v1/auth/register { email, username, password }
Identity Domain (AuthController)
  ↓ Validate request
  ↓ Hash password
  ↓ Create user in database
  ↓ Generate verification token
  ↓ Queue verification email (via EmailService)
  ↓ Publish DomainEvent: UserRegistered
  ↓ Return JWT + user data
Client
```

### Domain Event Flow

```plaintext
Identity Domain
  ↓ Event: UserRegistered { userId, email, role, timestamp }
  ├─→ Users Domain (event handler)
  │     ↓ Initialize default user preferences
  │     ↓ Create user profile record
  │
  ├─→ Referrals Domain (event handler)
  │     ↓ Check if user has pending referral code
  │     ↓ Apply referral if found
  │     ↓ Publish: ReferralApplied
  │
  └─→ Notifications Domain (event handler)
        ↓ Initialize default notification preferences
        ↓ Create preference record
```

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Identity | User creation, token generation, email queueing, event publication |
| Messaging Infrastructure | Email delivery (outbox pattern) |
| Users | Profile initialization (reacts to event) |
| Referrals | Referral application (reacts to event) |
| Notifications | Preference initialization (reacts to event) |

---

## User Login Flow

### Trigger
`POST /api/v1/auth/login`

### Request Flow

```plaintext
Client
  ↓ POST /api/v1/auth/login { email, password }
Identity Domain (AuthController)
  ↓ Validate request
  ↓ Find user by email
  ↓ Compare password hash
  ↓ Update lastLoginAt timestamp
  ↓ Generate JWT token
  ↓ Publish DomainEvent: UserLoggedIn (optional)
  ↓ Return JWT + user data
Client
```

### Domain Event Flow

```plaintext
Identity Domain
  ↓ Event: UserLoggedIn { userId, timestamp } [Optional]
  └─→ Analytics/Audit Service (future)
        ↓ Log login event
        ↓ Track user activity
```

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Identity | Authentication, JWT generation |
| Users | User data retrieval (via database query) |

---

## Module Completion Flow

### Trigger
`POST /api/v1/modules/:id/complete`

### Request Flow

```plaintext
Client
  ↓ POST /api/v1/modules/:id/complete { score }
Learning Domain (ModuleController)
  ↓ Authenticate user
  ↓ Validate module exists
  ↓ Check if already completed
  ↓ Record completion in database
  ↓ Publish DomainEvent: ModuleCompleted
  ↓ Return completion data
Client
```

### Domain Event Flow

```plaintext
Learning Domain
  ↓ Event: ModuleCompleted { userId, moduleId, score, timestamp }
  │
  ├─→ Rewards Domain (event handler)
  │     ↓ Calculate reward (base + streak + referral)
  │     ↓ Process payment via BlockchainService
  │     ↓ Record transaction
  │     ↓ Publish: RewardClaimed
  │     │
  │     └─→ Notifications Domain (reacts to RewardClaimed)
  │           ↓ Send "You earned X XLM" notification
  │
  ├─→ Credentials Domain (event handler)
  │     ↓ Validate completion score meets threshold
  │     ↓ Issue credential
  │     ↓ Store on-chain via BlockchainService
  │     ↓ Publish: CredentialIssued
  │     │
  │     └─→ Notifications Domain (reacts to CredentialIssued)
  │           ↓ Send "Credential issued" notification
  │
  └─→ Referrals Domain (event handler)
        ↓ Check if user was referred
        ↓ Check referral bonus eligibility
        ↓ Publish: ReferralBonusEligible
        │
        └─→ Rewards Domain (reacts to ReferralBonusEligible)
              ↓ Process referral bonus payment
```

### Orchestration

**Owner:** Learning Domain

The Learning domain ONLY records the completion and publishes the event. It does NOT:
- Calculate or distribute rewards
- Issue credentials
- Send notifications

All downstream actions are decoupled via event handlers.

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Learning | Completion recording, event publication |
| Rewards | Reward calculation and distribution (event handler) |
| Credentials | Credential issuance (event handler) |
| Referrals | Referral bonus eligibility (event handler) |
| Notifications | User notifications (event handler) |
| Blockchain Infrastructure | Payment processing, on-chain credential storage |

---

## Reward Claim Flow

### Trigger
`POST /api/v1/rewards/claim` or `ModuleCompleted` event

### Request Flow (Direct API Call)

```plaintext
Client
  ↓ POST /api/v1/rewards/claim { moduleId, walletAddress, referralCode? }
Rewards Domain (RewardController)
  ↓ Authenticate user
  ↓ Validate module completion
  ↓ Check not already claimed
  ↓ Calculate reward breakdown
  ↓ Process payment via BlockchainService
  ↓ Mark as claimed
  ↓ Record transaction
  ↓ Publish DomainEvent: RewardClaimed
  ↓ Return reward result
Client
```

### Domain Event Flow

```plaintext
Rewards Domain
  ↓ Event: RewardClaimed { userId, moduleId, amount, breakdown, txHash, timestamp }
  │
  ├─→ Notifications Domain (event handler)
  │     ↓ Check user notification preferences
  │     ↓ Queue push notification
  │     ↓ Send "You earned X XLM"
  │
  └─→ Referrals Domain (event handler - if referral bonus included)
        ↓ Update referral bonus paid status
        ↓ Publish: ReferralBonusPaid
```

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Rewards | Reward calculation, payment processing, transaction recording |
| Blockchain Infrastructure | Payment execution |
| Notifications | User notification (event handler) |
| Referrals | Bonus tracking (event handler) |

---

## Credential Issuance Flow

### Trigger
`POST /api/v1/credentials/issue` or `ModuleCompleted` event

### Request Flow (Direct API Call)

```plaintext
Client
  ↓ POST /api/v1/credentials/issue { moduleId }
Credentials Domain (CredentialController)
  ↓ Authenticate user
  ↓ Validate module completion
  ↓ Check not already issued
  ↓ Issue on-chain credential via BlockchainService
  ↓ Store credential record
  ↓ Publish DomainEvent: CredentialIssued
  ↓ Return credential data
Client
```

### Domain Event Flow

```plaintext
Credentials Domain
  ↓ Event: CredentialIssued { credentialId, userId, moduleId, onChainId, timestamp }
  │
  └─→ Notifications Domain (event handler)
        ↓ Check user notification preferences
        ↓ Queue push notification
        ↓ Send "Credential issued for Module X"
```

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Credentials | Credential issuance, on-chain storage, event publication |
| Blockchain Infrastructure | On-chain credential creation |
| Notifications | User notification (event handler) |

---

## Referral Application Flow

### Trigger
`POST /api/v1/referrals/apply`

### Request Flow

```plaintext
Client
  ↓ POST /api/v1/referrals/apply { code }
Referrals Domain (ReferralController)
  ↓ Authenticate user
  ↓ Validate referral code exists
  ↓ Check user not already referred
  ↓ Apply referral relationship
  ↓ Publish DomainEvent: ReferralApplied
  ↓ Return referral data
Client
```

### Domain Event Flow

```plaintext
Referrals Domain
  ↓ Event: ReferralApplied { referrerId, referreeId, code, timestamp }
  │
  └─→ Analytics/Gamification Domain (future)
        ↓ Track referral metrics
        ↓ Update leaderboard
```

### Future: Referral Bonus Payment

When referree completes first module:

```plaintext
Learning Domain
  ↓ Event: ModuleCompleted { userId: referreeId, ... }
  ↓
Referrals Domain (event handler)
  ↓ Check if user is a referree
  ↓ Check if this is first completion
  ↓ Publish: ReferralBonusEligible { referrerId, amount, ... }
  ↓
Rewards Domain (event handler)
  ↓ Process referral bonus payment
  ↓ Publish: ReferralBonusPaid
```

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Referrals | Referral tracking, bonus eligibility determination |
| Rewards | Bonus payment processing (event handler) |

---

## Withdrawal Flow

### Trigger
`POST /api/v1/rewards/withdraw`

### Request Flow

```plaintext
Client
  ↓ POST /api/v1/rewards/withdraw { walletAddress, amount, memo? }
Rewards Domain (RewardController)
  ↓ Authenticate user
  ↓ Validate wallet address
  ↓ Check sufficient balance
  ↓ Create pending withdrawal transaction
  ↓ Process payment via BlockchainService
  ↓ Update transaction status (completed/failed)
  ↓ Publish DomainEvent: WithdrawalProcessed
  ↓ Return withdrawal result
Client
```

### Domain Event Flow

```plaintext
Rewards Domain
  ↓ Event: WithdrawalProcessed { userId, amount, walletAddress, txHash, timestamp }
  │
  └─→ Notifications Domain (event handler)
        ↓ Send "Withdrawal successful" notification
```

### Error Handling

If blockchain payment fails:
- Transaction marked as `failed`
- Balance remains unchanged
- User can retry

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Rewards | Balance validation, transaction management |
| Blockchain Infrastructure | Payment execution |
| Notifications | User notification (event handler) |

---

## Notification Delivery Flow

### Trigger
Domain events or direct API calls

### Event-Driven Flow

```plaintext
Source Domain
  ↓ Publish DomainEvent (e.g., RewardClaimed)
  ↓
Notifications Domain (event handler)
  ↓ Receive event
  ↓ Check user notification preferences
  ↓ Skip if user opted out
  ↓ Queue notification in NotificationLog
  ↓ Retrieve device tokens
  ↓ Send via Firebase Admin SDK
  ↓ Handle delivery status (success/retry/dead-letter)
  ↓ Update NotificationLog
```

### Direct API Flow

```plaintext
Client
  ↓ POST /api/v1/notifications/register-device { token, platform }
Notifications Domain (NotificationController)
  ↓ Store device token
  ↓ Return success
Client
```

### Retry Logic

- Pending notifications are retried with exponential backoff
- Max 5 attempts (1min, 5min, 25min intervals)
- Dead-letter after max attempts
- Preference checking happens before queueing

### Responsibilities

| Domain | Responsibility |
|--------|---------------|
| Notifications | Delivery management, preference enforcement, retry logic |
| Firebase | Push notification infrastructure |

---

## Cross-Cutting Concerns

### Idempotency

- All event handlers MUST be idempotent
- Use `idempotencyKey` or check existing state before processing
- Duplicate events should be safe to process

### Error Handling

- Event handler failures should NOT fail the originating request
- Failed event processing goes to dead-letter queue (future)
- Compensating transactions for critical failures (future)

### Observability

- All domain events are logged
- Event processing traces for debugging
- Metrics for event throughput and latency (future)

---

## Event Schema (Future)

All domain events will follow this schema:

```typescript
interface DomainEvent {
  eventId: string          // UUID
  eventType: string        // e.g., "UserRegistered"
  aggregateId: string      // e.g., userId
  aggregateType: string    // e.g., "User"
  payload: object          // Event-specific data
  timestamp: Date
  version: number          // For event versioning
  metadata?: {
    correlationId?: string // For tracing
    causationId?: string   // Event that caused this event
    userId?: string        // Actor who triggered
  }
}
```

---

## Migration Path

Current state: Direct service-to-service calls exist (e.g., `RewardService → NotificationService`)

Target state: Event-driven communication via domain events

**Phase 1:** Document flows (this document)  
**Phase 2:** Implement event infrastructure  
**Phase 3:** Refactor to event-driven architecture  
**Phase 4:** Remove direct cross-domain service calls  

---

## Summary Table: Domain Interactions

| Source Domain | Target Domain | Interaction Type | Purpose |
|--------------|---------------|------------------|---------|
| Identity | Messaging Infra | Service Call | Email delivery |
| Identity | Users | Domain Event | Profile initialization |
| Identity | Referrals | Domain Event | Referral application |
| Learning | Rewards | Domain Event | Reward distribution |
| Learning | Credentials | Domain Event | Credential issuance |
| Learning | Referrals | Domain Event | Referral bonus check |
| Rewards | Blockchain Infra | Service Call | Payment processing |
| Rewards | Notifications | Domain Event | Reward notification |
| Credentials | Blockchain Infra | Service Call | On-chain storage |
| Credentials | Notifications | Domain Event | Credential notification |
| All Domains | Shared Kernel | Direct Import | Config, errors, middleware, utils |
