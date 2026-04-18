"use client";

import { useEffect, useRef, useState } from "react";

import type {
  PaymentSession,
  PaymentStatus,
  RoastInputPayload,
  RoastResult,
  ServiceRequestStatus,
} from "@/lib/types";

type Stage = "idle" | "request_created" | "payment_pending" | "payment_paid" | "completed";

interface RequestResponse {
  request: {
    id: string;
    status: ServiceRequestStatus;
    priceAmount: string;
    currency: string;
  };
}

interface PaymentResponse {
  payment: PaymentSession;
}

interface ResultResponse {
  requestId: string;
  result: RoastResult;
  transactionReference?: string;
}

const agentCurl = (requestId: string) =>
  [
    "npx mppx account create",
    "npx mppx account fund",
    `npx mppx http://localhost:3000/api/mpp/requests/${requestId} --method POST`,
  ].join("\n");

export function PaywallApp({
  provider,
}: {
  provider: "mock" | "stripe_mpp";
}) {
  const [form, setForm] = useState<RoastInputPayload>({
    websiteUrl: "",
    marketingCopy: "",
    brandName: "",
    targetAudience: "",
  });
  const [stage, setStage] = useState<Stage>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<ServiceRequestStatus | null>(null);
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [transactionReference, setTransactionReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const lastExecutedRequestId = useRef<string | null>(null);

  async function parseOrThrow<T>(response: Response): Promise<T> {
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? "Request failed.");
    }

    return body as T;
  }

  async function createRequest() {
    setBusyAction("create");
    setError(null);
    setResult(null);
    setPayment(null);
    setTransactionReference(null);
    lastExecutedRequestId.current = null;

    try {
      const payload = await parseOrThrow<RequestResponse>(
        await fetch("/api/requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }),
      );

      setRequestId(payload.request.id);
      setRequestStatus(payload.request.status);
      setStage("request_created");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create request.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function initiatePayment() {
    if (!requestId) return;

    setBusyAction("payment");
    setError(null);

    try {
      const payload = await parseOrThrow<PaymentResponse>(
        await fetch("/api/payments/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requestId }),
        }),
      );

      setPayment(payload.payment);
      setRequestStatus("awaiting_payment");
      setStage("payment_pending");
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Failed to initiate payment.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function simulatePayment() {
    if (!payment) return;

    setBusyAction("simulate");
    setError(null);

    try {
      const payload = await parseOrThrow<PaymentResponse>(
        await fetch(`/api/payments/${payment.id}/simulate`, {
          method: "POST",
        }),
      );

      setPayment(payload.payment);
      setRequestStatus("paid");
      setStage("payment_paid");
    } catch (simulateError) {
      setError(
        simulateError instanceof Error ? simulateError.message : "Payment simulation failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshPaymentStatus() {
    if (!payment) return;

    try {
      const payload = await parseOrThrow<PaymentResponse>(
        await fetch(`/api/payments/${payment.id}/status`),
      );

      setPayment(payload.payment);
      if (payload.payment.status === "paid") {
        setRequestStatus("paid");
        setStage("payment_paid");
      }
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to refresh payment status.",
      );
    }
  }

  async function executeRequest() {
    if (!requestId) return;
    if (lastExecutedRequestId.current === requestId) return;

    lastExecutedRequestId.current = requestId;
    setBusyAction("execute");
    setError(null);

    try {
      const payload = await parseOrThrow<ResultResponse>(
        await fetch(`/api/requests/${requestId}/execute`, {
          method: "POST",
        }),
      );

      setResult(payload.result);
      setTransactionReference(payload.transactionReference ?? null);
      setRequestStatus("completed");
      setStage("completed");
    } catch (executeError) {
      lastExecutedRequestId.current = null;
      setError(
        executeError instanceof Error ? executeError.message : "Execution failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  function resetFlow() {
    setForm({
      websiteUrl: "",
      marketingCopy: "",
      brandName: "",
      targetAudience: "",
    });
    setStage("idle");
    setRequestId(null);
    setRequestStatus(null);
    setPayment(null);
    setResult(null);
    setTransactionReference(null);
    setError(null);
    setBusyAction(null);
    lastExecutedRequestId.current = null;
  }

  useEffect(() => {
    if (!payment || payment.status !== "pending") {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshPaymentStatus();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [payment]);

  useEffect(() => {
    if (payment?.status === "paid" && requestStatus !== "completed") {
      void executeRequest();
    }
  }, [payment?.status, requestStatus]);

  const paymentStatus: PaymentStatus | null = payment?.status ?? null;

  return (
    <div className="shell">
      <div className="page">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Tempo + MPP pay-per-use demo</div>
            <h1>Pay two cents. Unlock a sharper landing page.</h1>
            <p className="hero-subtitle">
              AgentPaywall turns a premium microservice into an instant machine-payable
              product. Submit a URL or your hero copy, trigger a payment session, and
              unlock the roast only after payment verifies.
            </p>

            <div className="hero-grid">
              <div className="metric">
                <div className="metric-value">0.02 USDC</div>
                <div className="metric-label">Fixed price per roast</div>
              </div>
              <div className="metric">
                <div className="metric-value">{"<"}10s</div>
                <div className="metric-label">Payment-to-unlock target</div>
              </div>
              <div className="metric">
                <div className="metric-value">{provider === "mock" ? "Demo" : "Live"}</div>
                <div className="metric-label">Current payment mode</div>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="stack">
              <div className="pill">Service: Landing Page Roast</div>
              <strong>What buyers get</strong>
              <p>Headline feedback, CTA feedback, a clarity score, and conversion ideas.</p>
            </div>
            <div className="stack" style={{ marginTop: 18 }}>
              <strong>How it works</strong>
              <p>1. Create a request. 2. Pay via MPP on Tempo. 3. Unlock the result after verification.</p>
            </div>
            <div className="stack" style={{ marginTop: 18 }}>
              <strong>Machine-readable path</strong>
              <p>
                The agent endpoint is already separated from the browser demo, so the
                payment protocol can harden without changing the product flow.
              </p>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="card">
            <h2 className="section-title">Create a paid request</h2>
            <p className="section-copy">
              Use either a website URL or marketing copy. The form validates before
              payment starts so the payment session stays tied to a usable request.
            </p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="websiteUrl">Website URL</label>
                <input
                  id="websiteUrl"
                  placeholder="https://example.com"
                  value={form.websiteUrl ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, websiteUrl: event.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="marketingCopy">Marketing copy</label>
                <textarea
                  id="marketingCopy"
                  placeholder="Paste the hero copy, feature block, or value proposition you want roasted."
                  value={form.marketingCopy ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      marketingCopy: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="brandName">Brand name</label>
                  <input
                    id="brandName"
                    placeholder="AgentPaywall"
                    value={form.brandName ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, brandName: event.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="targetAudience">Target audience</label>
                  <input
                    id="targetAudience"
                    placeholder="Indie founders selling SaaS"
                    value={form.targetAudience ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        targetAudience: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="button-row">
                <button
                  className="button button-primary"
                  disabled={busyAction !== null}
                  onClick={() => void createRequest()}
                  type="button"
                >
                  {busyAction === "create" ? "Creating request..." : "Create paid request"}
                </button>
                <button
                  className="button button-ghost"
                  disabled={busyAction !== null}
                  onClick={resetFlow}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            {provider === "mock" ? (
              <div className="banner">
                Browser demo mode is active. Payment verification is simulated, but the
                request, payment, lock, and execution boundaries match the real product.
              </div>
            ) : (
              <div className="banner">
                Stripe MPP mode is configured. Use the agent endpoint below for real 402
                payment challenges; the browser flow stays intentionally thin.
              </div>
            )}

            {error ? <div className="banner error">{error}</div> : null}
          </section>

          <aside className="card">
            <h2 className="section-title">Payment lifecycle</h2>
            <p className="section-copy">
              The result stays locked until the payment session flips to a verified state.
            </p>

            <div className="status-grid">
              <div className="status-item">
                <strong>Request</strong>
                <div className="mono">{requestId ?? "Not created yet"}</div>
                <div className="muted">Status: {requestStatus ?? "idle"}</div>
              </div>

              <div className="status-item">
                <strong>Payment session</strong>
                <div className="mono">{payment?.id ?? "No session yet"}</div>
                <div className="muted">Status: {paymentStatus ?? "uninitialized"}</div>
              </div>

              <div className="status-item">
                <strong>Unlock state</strong>
                <div className={stage === "completed" ? "success" : "warning"}>
                  {stage === "completed" ? "Unlocked" : "Locked until payment verifies"}
                </div>
              </div>
            </div>

            <div className="button-row" style={{ marginTop: 18 }}>
              <button
                className="button button-secondary"
                disabled={!requestId || busyAction !== null || stage === "completed"}
                onClick={() => void initiatePayment()}
                type="button"
              >
                {busyAction === "payment" ? "Starting payment..." : "Pay and run"}
              </button>

              <button
                className="button button-ghost"
                disabled={
                  provider !== "mock" ||
                  !payment ||
                  payment.status !== "pending" ||
                  busyAction !== null
                }
                onClick={() => void simulatePayment()}
                type="button"
              >
                {busyAction === "simulate" ? "Verifying..." : "Simulate payment"}
              </button>
            </div>

            {payment ? (
              <div className="banner" style={{ marginTop: 18 }}>
                <div>Reference: <span className="mono">{payment.mppReference}</span></div>
                {payment.tempoTxHash ? (
                  <div>Tempo tx: <span className="mono">{payment.tempoTxHash}</span></div>
                ) : null}
                <div>{payment.statusMessage}</div>
              </div>
            ) : null}
          </aside>
        </div>

        <section className="content-grid">
          <div className="card">
            <h2 className="section-title">Unlocked roast</h2>
            <p className="section-copy">
              The service output appears only after payment is confirmed and execution completes.
            </p>

            {result ? (
              <>
                <div className="score">Clarity score: {result.clarityScore} / 100</div>

                <div className="status-grid">
                  <div className="status-item">
                    <strong>Summary</strong>
                    <p className="muted">{result.summary}</p>
                  </div>
                  <div className="status-item">
                    <strong>Headline feedback</strong>
                    <p className="muted">{result.headlineFeedback}</p>
                  </div>
                  <div className="status-item">
                    <strong>CTA feedback</strong>
                    <p className="muted">{result.ctaFeedback}</p>
                  </div>
                  <div className="status-item">
                    <strong>Conversion suggestions</strong>
                    <ul className="result-list">
                      {result.conversionSuggestions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="status-item">
                    <strong>Trust signal notes</strong>
                    <ul className="result-list">
                      {result.trustSignals.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="status-item">
                    <strong>Processing notes</strong>
                    <ul className="result-list">
                      {result.processingNotes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {transactionReference ? (
                  <div className="banner success">
                    Payment reference: <span className="mono">{transactionReference}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="banner">
                Result locked. Create a request, pay, and the roast will appear here.
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="section-title">Agent endpoint</h2>
            <p className="section-copy">
              The product is structured for a human demo first, but the MPP route is already
              isolated for agent-native HTTP 402 flows.
            </p>

            <div className="how-grid">
              <div className="how-step">
                <strong>1. Create a request</strong>
                <p className="muted">Use the form to mint a request ID and bind the payload.</p>
              </div>
              <div className="how-step">
                <strong>2. Hit the MPP-protected route</strong>
                <p className="muted">The server responds with a payment challenge until the request is paid.</p>
              </div>
              <div className="how-step">
                <strong>3. Receive the paid result with a receipt</strong>
                <p className="muted">On success, the response includes the unlocked roast payload.</p>
              </div>
            </div>

            <div className="code">
              {requestId ? agentCurl(requestId) : "Create a request to generate the agent command."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
