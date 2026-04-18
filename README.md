# AgentPaywall

Machine-payable landing page roast demo built from the product definition in `Agents.md`.

## Modes

- `mock`: browser-friendly demo flow with simulated Tempo settlement
- `stripe_mpp`: real agent-facing MPP route backed by Stripe + Tempo deposit mode

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local`.

- Leave `PAYMENTS_PROVIDER=mock` for the local UI demo.
- Set `PAYMENTS_PROVIDER=stripe_mpp` and `STRIPE_SECRET_KEY` to enable the MPP-protected route at `/api/mpp/requests/:requestId`.

## Implemented API surface

- `POST /api/requests`
- `POST /api/payments/initiate`
- `GET /api/payments/:id/status`
- `POST /api/payments/:id/simulate`
- `POST /api/requests/:id/execute`
- `GET /api/requests/:id/result`
- `POST /api/mpp/requests/:id`
