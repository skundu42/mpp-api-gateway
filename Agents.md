**PRD**

**Product Name**
`AgentPaywall`
Alternative working title: `Tempo Gate`

**One-Line Summary**
A web application that lets users and AI agents pay per API call or per session using **MPP on Tempo**, unlocking premium digital services without subscriptions or prepaid credits.

**Document Version**
v1.0  
Date: April 18, 2026

**1. Overview**
AgentPaywall is a pay-per-use monetization layer for digital services. It solves a core gap in agentic commerce: most APIs and tools are sold through monthly subscriptions, fixed credit packs, or manual billing flows that do not work well for autonomous agents, hackathon demos, or lightweight web products.

This application uses **Tempo** as the payments-first blockchain and **MPP (Machine Payment Protocol)** as the payment rail to authorize small, instant, stablecoin-based payments for digital services. A buyer pays for exactly what they use, and the service unlocks immediately after payment verification.

The first version is a focused MVP designed to be built and demoed in 4 hours.

**2. Problem Statement**
Digital services are difficult to monetize in a way that is:
- instant,
- machine-readable,
- low-friction,
- pay-per-use,
- and suitable for AI agents.

Current API monetization models create several problems:
- Subscriptions force users to commit before trying a tool.
- Credit wallets add onboarding friction.
- Traditional card billing is not agent-native.
- Small-value transactions are operationally difficult.
- Autonomous agents cannot easily discover, authorize, and settle payments for services on demand.

This blocks new classes of applications where services should be purchasable in real time for a few cents.

**3. Proposed Solution**
Build a web app where a seller exposes a digital service behind a payment gate. A buyer can:
- view the service,
- see exact pricing,
- initiate an MPP payment/session on Tempo,
- complete payment,
- and receive the requested output immediately.

The platform acts as a thin bridge between:
- service usage,
- machine-readable payment intent,
- payment verification,
- and content/API access.

**4. Vision**
Enable machine-native commerce for digital services, where AI agents and human users can pay instantly for APIs, tools, and outputs on a per-use basis.

**5. Goals**
**Primary Goals**
- Demonstrate an end-to-end MPP-powered payment flow on Tempo.
- Unlock a digital service immediately after successful payment.
- Show clear linkage between payment intent, settlement, and service delivery.
- Provide a judge-friendly demo with visible business value.

**Secondary Goals**
- Support a simple reusable pattern for other paid APIs.
- Make the app understandable for both crypto-native and non-crypto audiences.
- Keep architecture small enough for a 4-hour hackathon implementation.

**6. Non-Goals**
For the MVP, the app will not include:
- multi-vendor marketplace support,
- refunds/disputes,
- recurring billing,
- advanced analytics dashboards,
- production-grade KYC/compliance workflows,
- multi-chain support,
- identity/reputation systems,
- complex access tiers,
- decentralized hosting guarantees,
- large-scale fraud prevention systems.

**7. Target Users**
**Primary User Segment**
- Hackathon judges and demo viewers evaluating machine-payment use cases.
- Developers building APIs or microtools who want to monetize them instantly.
- AI agent builders who want agents to pay for services autonomously.

**Secondary User Segment**
- End users who want to pay small amounts for one-off digital services.
- Indie hackers testing new pricing models for tools.

**8. Core Use Cases**
1. A user pays `$0.02` to run an AI website roast.
2. A developer pays per request to access a premium utility API.
3. An AI agent programmatically opens a payment session and purchases a service result.
4. A seller demonstrates real-time monetization of a microservice without subscriptions.

**9. MVP Scope**
The MVP will focus on one concrete service to keep the build tight. Recommended demo service:

**Recommended Service**
`Landing Page Roast`
User submits:
- website URL, or
- a block of marketing copy.

The app returns:
- headline feedback,
- CTA feedback,
- UI/clarity score,
- conversion suggestions.

This is ideal because:
- it is easy to explain,
- fast to demo,
- output is visible,
- and “pay to unlock” is intuitive.

**Alternate Service Options**
- Resume review
- PDF summary
- Screenshot API
- Text summarizer
- Product description generator

**10. User Stories**
**Buyer Stories**
- As a buyer, I want to see exactly what the service does before paying.
- As a buyer, I want to know the exact price before starting.
- As a buyer, I want to pay instantly without subscriptions.
- As a buyer, I want clear confirmation that payment succeeded.
- As a buyer, I want the result delivered immediately after payment.

**Seller Stories**
- As a seller, I want to gate a service behind a paywall.
- As a seller, I want the app to verify payment before serving results.
- As a seller, I want pricing to be simple and transparent.
- As a seller, I want a demoable proof that machine payments work.

**Agent Stories**
- As an AI agent, I want a machine-readable payment flow.
- As an AI agent, I want to pay per use, not manage subscriptions.
- As an AI agent, I want immediate access after payment confirmation.

**11. Functional Requirements**
**11.1 Landing / Service Page**
The application must:
- display the service name,
- explain what the service does,
- show the price in stablecoin terms,
- show expected turnaround time,
- present a clear “Pay and Run” CTA.

**11.2 Input Collection**
The application must:
- accept the minimum required user input for the chosen service,
- validate that input before payment,
- show any constraints clearly.

Example for Landing Page Roast:
- URL input or pasted text
- optional brand name
- optional target audience

**11.3 Pricing Display**
The application must:
- show a fixed price per request for MVP,
- display the stablecoin amount clearly,
- show what the user receives for that payment.

**11.4 MPP Payment Initialization**
The application must:
- create or request a machine payment/session through MPP-compatible flow,
- display payment instructions or payment approval state,
- associate the payment attempt with the pending service request.

**11.5 Payment Verification**
The backend must:
- verify successful payment on Tempo before delivering the result,
- ensure the payment corresponds to the specific request/session,
- reject unpaid or invalid requests.

**11.6 Service Execution**
After payment is confirmed, the app must:
- run the underlying service logic,
- generate the result,
- return it in the UI,
- tie the result to the paid session.

**11.7 Result Display**
The application must:
- show the service output in a readable format,
- show payment success state,
- optionally show transaction/session reference for trust.

**11.8 Error Handling**
The application must handle:
- invalid input,
- abandoned payment,
- failed payment verification,
- blockchain timeout,
- service execution failure,
- duplicate requests.

**11.9 Minimal Proof of Payment**
The application should:
- display a transaction hash, session ID, or payment reference,
- indicate that settlement occurred on Tempo.

**12. Out of Scope for MVP but Important for Future**
- usage history,
- downloadable invoices,
- vendor onboarding,
- adjustable pricing rules,
- streaming micropayments by duration,
- session top-ups,
- multiple service SKUs,
- access tokens / API keys for developers,
- webhook callbacks,
- service catalog marketplace,
- escrow or refund policies.

**13. Product Flow**
**Primary Flow**
1. User opens the service page.
2. User enters service input.
3. App validates input.
4. App displays exact price and “Pay and Run”.
5. User initiates MPP payment/session.
6. Backend waits for or verifies payment success.
7. On confirmation, backend runs the service.
8. UI displays success, result, and payment reference.

**Failure Flow**
1. User initiates payment.
2. Payment times out or fails.
3. App marks request as unpaid.
4. Service result remains locked.
5. User can retry payment.

**14. UX Requirements**
The UX should feel like a real payments product, not a crypto demo.

**Key UX principles**
- Clear pricing
- Low friction
- Immediate feedback
- Trust through transparency
- Minimal wallet jargon where possible

**Required Screens**
- Home/service page
- Payment pending state
- Payment success state
- Result screen
- Error/retry state

**Suggested UI Sections**
**Service Hero**
- Service title
- short description
- price tag
- CTA

**How It Works**
- Submit input
- Pay via MPP on Tempo
- Get result instantly

**Input Form**
- clean, short, single-purpose

**Payment Status Panel**
- awaiting payment
- verifying
- paid
- failed

**Result Panel**
- unlocked output
- payment reference
- optional transaction explorer link

**15. Technical Requirements**
**Frontend**
- Web app with responsive UI
- Must show payment lifecycle clearly
- Must store temporary request state
- Should support human demo flow first
- Should be easy to extend for agent/API flow later

**Backend**
- Endpoint to create service request
- Endpoint to initialize payment/session
- Endpoint to verify payment status
- Endpoint to execute service after authorization
- Request/payment mapping persistence

**Blockchain / Protocol**
- Use Tempo-compatible flow
- Use MPP-compatible session/payment interaction
- Use stablecoin-denominated pricing where possible

**Persistence**
Minimal database or lightweight storage for:
- request ID
- user input
- payment/session ID
- payment status
- result status
- result payload or reference

A lightweight in-memory store is acceptable for hackathon MVP if persistence is not critical.

**16. Suggested Architecture**
**Frontend**
- React / Next.js / Vite app
- pages/components for service, payment state, result view

**Backend**
- Node.js/Express or Next.js API routes
- service request creation
- payment orchestration
- verification logic
- result generation

**Payment Layer**
- MPP session/payment initiation
- Tempo payment status lookup
- transaction/session verification

**Service Layer**
- mock AI analyzer, or
- real LLM-backed analysis endpoint

**Storage**
- in-memory object store, SQLite, or simple JSON/db layer

**17. Data Model**
**ServiceRequest**
- `id`
- `serviceType`
- `inputPayload`
- `priceAmount`
- `currency`
- `status` (`created`, `awaiting_payment`, `paid`, `processing`, `completed`, `failed`)
- `paymentSessionId`
- `transactionReference`
- `resultPayload`
- `createdAt`
- `updatedAt`

**PaymentSession**
- `id`
- `serviceRequestId`
- `amount`
- `currency`
- `status`
- `mppReference`
- `tempoTxHash`
- `verificationTimestamp`

**18. API Requirements**
Suggested endpoints:

`POST /api/requests`
- create a new service request
- validate input
- return request ID and price

`POST /api/payments/initiate`
- create payment/session for request
- return payment metadata

`GET /api/payments/:id/status`
- poll payment state

`POST /api/requests/:id/execute`
- execute only if payment verified

`GET /api/requests/:id/result`
- fetch result if unlocked

**19. Success Metrics**
For hackathon MVP, success means:
- successful end-to-end payment-to-unlock demo,
- payment verification works reliably,
- result appears only after payment,
- judges can understand the business value in under 60 seconds.

**Quantitative MVP Metrics**
- time from payment to unlock: under 10 seconds target
- payment verification success rate in demo: >95%
- end-to-end flow completed within one live demo without manual intervention

**20. Demo Success Criteria**
The demo is successful if:
- the app clearly shows a paid service,
- the payment happens on Tempo using MPP flow,
- the result remains locked before payment,
- the result unlocks immediately after payment,
- a payment proof/reference is visible.

**21. Business Value**
This product validates a new pricing model:
- no subscriptions,
- no credit bundles,
- no checkout complexity,
- just-in-time payment for digital work.

Potential categories enabled:
- AI tools
- API endpoints
- data feeds
- autonomous agent services
- digital content access
- developer utilities

**22. Risks**
**Technical Risks**
- MPP integration complexity in limited time
- Tempo testnet/mainnet environment confusion
- payment verification edge cases
- wallet/payment UX friction
- external AI API latency

**Product Risks**
- judges may not understand MPP without simple framing
- too much crypto terminology can reduce clarity
- if service output is weak, payment innovation may be overlooked

**Mitigations**
- keep one fixed-price service
- use a simple input/output demo
- show clear status labels
- surface the payment reference prominently
- reduce scope aggressively

**23. Security and Trust Considerations**
Even in MVP, the app should:
- never deliver premium output before confirmed payment,
- validate request IDs and payment associations,
- prevent duplicate execution on the same paid request unless intended,
- sanitize user inputs,
- avoid exposing private keys in frontend,
- keep sensitive blockchain credentials server-side.

**24. Compliance / Legal Considerations**
For hackathon MVP:
- do not market as a regulated financial product,
- frame as a payment-gated digital service,
- avoid custody language,
- avoid handling user funds beyond the direct payment flow,
- avoid unsupported compliance claims.

**25. Assumptions**
- Tempo environment and developer tooling are available.
- MPP integration can be demonstrated at least at session/payment level.
- Stablecoin-denominated payments are supported in the chosen environment.
- A simple service can be implemented quickly enough to keep the payment flow as the hero.

**26. Dependencies**
- Tempo RPC / developer environment
- MPP documentation / session flow
- wallet/payment integration
- optional LLM or analysis engine
- frontend hosting/runtime
- backend environment

**27. Recommended MVP Build Plan**
**Hour 1**
- set up frontend and backend skeleton
- define request and payment states
- build service page UI

**Hour 2**
- implement request creation
- wire MPP/Tempo payment initiation
- add payment status polling

**Hour 3**
- implement verification and service unlock
- connect the output generator
- add success/failure states

**Hour 4**
- polish UI
- add payment reference display
- test demo flow
- prepare judge script

**28. Future Roadmap**
**V2**
- multiple services
- seller dashboard
- dynamic pricing
- transaction history
- agent-to-agent purchase flow
- developer API keys after payment

**V3**
- marketplace of machine-payable APIs
- streaming payments
- subscriptions plus pay-per-use hybrid
- vendor analytics
- reputational trust layer
- webhook/event integrations

**29. Judge Pitch**
“Today, APIs and AI tools are sold with subscriptions and prepaid credits. That model breaks for autonomous agents and one-off usage. AgentPaywall lets any tool sell access instantly, per request, using MPP on Tempo. Pay a few cents, verify onchain, unlock the result immediately.”

**30. Final Product Definition**
AgentPaywall is a Tempo + MPP-powered pay-per-use gateway for digital services. It proves that machine payments can unlock real web functionality in real time, with a user flow that is understandable, monetizable, and practical for agentic commerce.

If you want, I can turn this into:
1. a **hackathon submission-ready PRD in Notion style**,
2. a **technical architecture doc**,
3. or a **full build checklist with screens, APIs, and demo script**.
