import { randomUUID } from "node:crypto";

import { appEnv } from "@/lib/env";
import { SERVICE_CURRENCY, SERVICE_PRICE_AMOUNT } from "@/lib/roast";
import {
  createPaymentSession,
  getPaymentSession,
  getRequest,
  setPaymentStatus,
  setRequestStatus,
  updateRequest,
} from "@/lib/store";
import type { PaymentSession } from "@/lib/types";

export function getPaymentProviderLabel() {
  return appEnv.provider === "mock" ? "Mock Tempo" : "Stripe MPP";
}

export async function initiatePaymentForRequest(requestId: string) {
  const request = getRequest(requestId);

  if (!request) {
    throw new Error("Service request not found.");
  }

  if (request.paymentSessionId) {
    const existing = getPaymentSession(request.paymentSessionId);
    if (existing) {
      return existing;
    }
  }

  if (appEnv.provider === "stripe_mpp") {
    throw new Error(
      "The browser demo uses mock settlement. Use the MPP route for real agent payments.",
    );
  }

  const session = createPaymentSession({
    id: randomUUID(),
    serviceRequestId: request.id,
    amount: SERVICE_PRICE_AMOUNT,
    currency: SERVICE_CURRENCY,
    provider: "mock",
    status: "pending",
    mppReference: `mpp_demo_${request.id.slice(0, 8)}`,
    statusMessage: "Awaiting payment approval in demo mode.",
  });

  updateRequest(requestId, {
    paymentSessionId: session.id,
    status: "awaiting_payment",
  });

  return session;
}

export async function getPaymentStatus(paymentId: string) {
  const payment = getPaymentSession(paymentId);

  if (!payment) {
    throw new Error("Payment session not found.");
  }

  return payment;
}

export async function simulatePayment(paymentId: string): Promise<PaymentSession> {
  const payment = getPaymentSession(paymentId);

  if (!payment) {
    throw new Error("Payment session not found.");
  }

  if (payment.provider !== "mock") {
    throw new Error("Only mock payments can be simulated.");
  }

  if (payment.status === "paid") {
    return payment;
  }

  const txHash = `0x${randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64)}`;
  const verificationTimestamp = new Date().toISOString();

  const updatedPayment = setPaymentStatus(paymentId, "paid", {
    tempoTxHash: txHash,
    verificationTimestamp,
    statusMessage: "Payment verified on demo Tempo rail.",
  });

  if (!updatedPayment) {
    throw new Error("Failed to update payment session.");
  }

  setRequestStatus(payment.serviceRequestId, "paid");

  return updatedPayment;
}
