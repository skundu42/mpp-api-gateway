# AgentPaywall End-to-End Usage Guide

This guide explains how to run and use the app from start to finish as it exists in this repository today.

It covers:

- local setup
- the fastest browser demo flow
- the seller dashboard flow
- the agent/API payment flow
- mock mode vs Tempo testnet mode
- common failure cases

## 1. What the app does

AgentPaywall lets a seller publish a paid API endpoint. A buyer or agent can then:

1. discover the route
2. attempt an invocation
3. get a payment challenge
4. complete payment
5. retry the invocation
6. receive the unlocked result

There are two main product surfaces in this repo:

- `/`: a simplified two-page demo for quickly creating and testing a paid endpoint
- `/dashboard`: the seller console for registering, creating routes, and inspecting route details

The core paid execution endpoint is:

```text
POST /api/mpp/routes/:slug/invoke
```

## 2. Choose the right mode first

The app currently supports multiple payment-provider modes, but they are not all intended for the same workflow.

### Recommended modes

- `mock`: best for local demos, browser testing, and automated verification
- `tempo_testnet`: best for the real agent-style MPP flow on Tempo testnet

### Important behavior difference

- In `mock` mode, the browser demo can complete end to end because the UI exposes a `Simulate payment` action.
- In `tempo_testnet` mode, the canonical end-to-end flow is the agent/API route using an MPP-aware client. The browser demo is not the primary settlement path.

If you just want to prove the full product flow locally, start with `mock`.

## 3. Prerequisites

Before running the app, make sure you have:

- Node.js installed
- npm installed
- a Tempo-compatible wallet address if you want to use the seller dashboard

The repo does not pin a Node version, so use a version compatible with Next.js 16 in your environment.

## 4. Environment setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

A safe local setup for the full browser demo is:

```env
PAYMENTS_PROVIDER=mock
NEXT_PUBLIC_PAYMENTS_PROVIDER=mock
APP_BASE_URL=http://localhost:3000
SESSION_SECRET=replace-this-with-a-random-secret
MPP_SECRET_KEY=replace-this-with-a-random-secret
DATABASE_URL=
STRIPE_SECRET_KEY=
ADMIN_TOKEN=
```

### What each variable is for

- `PAYMENTS_PROVIDER`: server-side payment mode
- `NEXT_PUBLIC_PAYMENTS_PROVIDER`: client-side label/mode shown in the UI
- `APP_BASE_URL`: canonical app origin used in some server-rendered pages
- `SESSION_SECRET`: seller dashboard session configuration
- `MPP_SECRET_KEY`: signs and verifies MPP challenges
- `DATABASE_URL`: optional Postgres persistence

### Persistence note

If `DATABASE_URL` is empty, the app falls back to in-memory storage. That means:

- sellers, routes, invocations, and payments are lost when the dev server restarts
- local demos still work fine

## 5. Install and run

```bash
npm install
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 6. Fastest end-to-end browser demo

This is the quickest way to see the product working locally.

### Step 1: Open the home page

Go to `/`.

The current root page is a simplified seller-to-buyer flow:

1. create a paid endpoint
2. open a dedicated demo page for that endpoint
3. create an invocation
4. pay
5. unlock the response

### Step 2: Create a paid endpoint

On `/`, fill the form:

- `Upstream API URL`: optional
- `Endpoint label`: optional but recommended
- `HTTP method`: defaults to `POST`

You have two valid choices:

- Leave `Upstream API URL` empty to use the built-in demo upstream.
- Provide a real public upstream URL if you want the paid route to proxy an external API.

Then click `Create paid endpoint`.

The app returns:

- route metadata
- the generated gateway URL
- payment network metadata
- example `curl` and `mppx` commands
- a link to `/demo/:slug`

### Step 3: Open the generated route demo page

From the creation result, open the live demo page for the route.

This page lets you:

- inspect the route contract
- submit a request body
- create an invocation
- track payment state
- unlock and inspect the final response

### Step 4: Create the invocation

On `/demo/:slug`:

- keep the sample JSON body, or replace it with your own JSON
- click the button that creates the invocation

After that, the app creates:

- an invocation record
- a payment session linked to that invocation

### Step 5: Complete payment

#### If you are in `mock` mode

Click `Simulate payment`.

The app will:

- mark the payment as `paid`
- mark the invocation as `paid`
- attach a mock Tempo transaction reference

#### If you are in `tempo_testnet` mode

For the real payment flow, use the agent/API path described later in this guide. That is the intended Tempo-backed path for this repo.

### Step 6: Watch the app unlock the response

After payment is verified, the app automatically executes the invocation and shows:

- the paid result
- the invocation status
- the payment proof or transaction reference
- any explorer URL if one is available

For the built-in demo upstream, the unlocked response is the sample API result. For an external proxy route, the unlocked response is the upstream response returned through the gateway.

## 7. Seller dashboard flow

The dashboard is the operator-facing surface for creating real seller-owned routes.

Open `/dashboard`.

### Step 1: Register a seller account

If you are not logged in, the page shows inline registration and login forms.

To register, enter:

- `Provider name`
- `Email`
- `Password`
- `Tempo wallet address`

Validation rules enforced by the app:

- email must be valid
- password must be at least 8 characters
- wallet must be a valid EVM address in `0x...` format

After registration, the app automatically signs you in and creates a session cookie.

### Step 2: Create a paid route

Once signed in, fill the route form.

Important fields:

- `Route name`: seller-facing name for the paid endpoint
- `Slug`: optional stable public identifier used in the URL
- `Description`: optional explanation shown in route details
- `Upstream URL`: the external API the gateway will call after payment
- `HTTP method`: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`
- `Price amount`: fixed price per invocation
- `Auth header name`: optional upstream header name
- `Auth header value`: optional upstream header value

Then create the route.

The route becomes a seller-owned paid proxy endpoint.

### Step 3: Open the route details page

From the dashboard table, click `Details`.

The route detail page shows:

- the gateway URL
- the discovery URL
- the seller wallet
- payment network metadata
- example `curl` and `mppx` commands
- recent invocations
- payment proofs for completed calls

Use this page as the source of truth when handing the route to an agent or demoing the contract to judges.

## 8. Buyer and agent execution flow

This is the main paid API behavior of the app.

### Discovery endpoint

Before invoking a route, a buyer or agent can inspect:

```text
GET /api/routes/:slug
```

This returns:

- public route metadata
- the gateway URL
- payment method metadata
- Tempo chain details
- sample request bodies
- example `curl` and `mppx` commands

### Paid invocation endpoint

The protected endpoint is:

```text
POST /api/mpp/routes/:slug/invoke
```

What happens on the first request:

1. the app validates the request body for that route
2. it creates or reuses an invocation
3. it creates or reuses the payment session
4. it returns a payment challenge instead of the result

The upstream API is not called before payment is verified.

## 9. Exact mock-mode agent flow

This is the easiest fully scriptable end-to-end flow.

### Step 1: Create or identify a route

Create a route from:

- `/`
- `/dashboard`

Assume the route slug is `paid-proxy`.

### Step 2: Send the first invocation request

```bash
curl -i \
  -X POST http://localhost:3000/api/mpp/routes/paid-proxy/invoke \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"hello"}'
```

Expected result:

- HTTP `402 Payment Required`
- JSON body containing payment metadata
- an `invocationId`

In `mock` mode, the response body includes a hint telling you to retry with:

- `x-mock-payment: paid`
- `x-invocation-id: <invocationId>`

### Step 3: Retry with simulated payment proof

```bash
curl -i \
  -X POST http://localhost:3000/api/mpp/routes/paid-proxy/invoke \
  -H 'Content-Type: application/json' \
  -H 'x-mock-payment: paid' \
  -H 'x-invocation-id: REPLACE_WITH_INVOCATION_ID' \
  -d '{"prompt":"hello"}'
```

Expected result:

- HTTP `200 OK`
- the unlocked resource result
- a `Payment-Receipt` response header

### Step 4: Retry again with the same invocation

If you resend the same paid request for the same invocation, the app returns the saved result instead of charging and executing again.

That is important for:

- safe retries
- demos with flaky networking
- agent workflows that may repeat a request

### Optional: include an idempotency key

The protected agent endpoint supports the `Idempotency-Key` header.

Use it when your agent may retry before it receives a full response.

## 10. Tempo testnet agent flow

If you want the real MPP-backed path, use `PAYMENTS_PROVIDER=tempo_testnet`.

### What this mode is intended for

This mode is for the paid agent route, not the mock browser button flow.

The seller creates a route, and the agent then pays against the gateway using MPP on Tempo testnet.

### Basic flow

1. seller registers on `/dashboard`
2. seller creates a route with a Tempo wallet address on the account
3. agent discovers the route using `GET /api/routes/:slug`
4. agent invokes `POST /api/mpp/routes/:slug/invoke`
5. gateway returns an MPP challenge
6. the agent satisfies the challenge with a Tempo payment credential
7. the agent retries
8. gateway verifies payment, executes the upstream, and returns the result with a `Payment-Receipt`

### Recommended client

The route detail page already provides an example `mppx` command. For example:

```bash
npx mppx http://localhost:3000/api/mpp/routes/YOUR_SLUG/invoke \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Summarize the latest billing event"}'
```

That is the intended way to exercise the Tempo-backed flow locally.

### Seller wallet requirement

Tempo payment challenges are tied to the wallet address stored on the seller account. If the seller wallet is missing or invalid, the route cannot accept Tempo payments.

## 11. What gets executed after payment

After payment verification, the app executes one of two service types.

### Internal demo route

The internal demo route runs built-in app logic and returns a generated result.

### External proxy route

The external proxy route forwards the request to the configured upstream URL and returns the upstream response.

If you configured an upstream auth header in the dashboard, that header is attached when the gateway calls the upstream.

## 12. Statuses you will see

### Invocation statuses

- `created`: invocation exists but payment flow has not started
- `awaiting_payment`: payment session exists and the result is still locked
- `paid`: payment is verified and execution can start
- `processing`: the service is running
- `completed`: result is available
- `failed`: payment or execution failed

### Payment statuses

- `pending`: waiting for payment
- `paid`: payment verified
- `failed`: payment failed
- `expired`: payment window expired before settlement

## 13. Troubleshooting

### `401 Authentication required`

Cause:

- you are using a dashboard API without a valid seller session

Fix:

- sign in again at `/dashboard`

### `Route not found`

Cause:

- wrong slug
- route was created in in-memory mode and the server restarted

Fix:

- recreate the route, or configure `DATABASE_URL`

### Payment never completes in the browser

Cause:

- you are not in `mock` mode
- the browser flow is not the intended full Tempo settlement path in this repo

Fix:

- use `mock` mode for UI demos
- use the MPP agent flow for `tempo_testnet`

### Upstream call fails after payment

Cause:

- bad upstream URL
- upstream rejected the configured method, body, or auth header
- upstream is private or local and the app rejected it

Fix:

- use a public upstream URL
- verify the method and payload
- verify optional auth header settings

### Local or loopback upstream URLs are rejected

Cause:

- route validation blocks loopback and local-network upstreams

Fix:

- use a public reachable URL
- for quick testing, leave the upstream blank on `/` to use the built-in demo upstream

## 14. Recommended demo scripts

### Short judge demo

Use this when you want the fastest visual walkthrough:

1. start the app in `mock` mode
2. open `/`
3. create a paid endpoint using the built-in upstream
4. open the generated `/demo/:slug` page
5. create an invocation
6. click `Simulate payment`
7. show the unlocked response and payment proof

### Full seller-to-agent demo

Use this when you want to emphasize the product model:

1. open `/dashboard`
2. register a seller with a Tempo wallet
3. create a paid route
4. open route details and copy the gateway URL
5. call the route once and show the payment challenge
6. complete payment using the mock retry flow or an MPP client
7. call the route again and show the unlocked result plus `Payment-Receipt`

## 15. Quick reference

### Main pages

- `/`: quick demo route creator
- `/demo/:slug`: route-level paid invocation demo
- `/dashboard`: seller console
- `/dashboard/routes/:routeId`: route detail and contract view

### Main APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/dashboard/routes`
- `POST /api/dashboard/routes`
- `GET /api/dashboard/routes/:routeId`
- `GET /api/routes/:slug`
- `POST /api/routes/:slug/invocations`
- `GET /api/invocations/:invocationId`
- `POST /api/invocations/:invocationId/execute`
- `GET /api/payments/:paymentId/status`
- `POST /api/payments/:paymentId/simulate`
- `POST /api/mpp/routes/:slug/invoke`

## 16. Best way to use the app today

If you want the smoothest end-to-end experience:

- use `mock` mode for browser demos and screenshots
- use `/dashboard` to create seller-owned routes
- use `/demo/:slug` to show the gated browser experience
- use `/api/mpp/routes/:slug/invoke` for the real agent contract
- use `tempo_testnet` only when you want to exercise the actual MPP payment challenge flow
