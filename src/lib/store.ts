import type {
  PaymentSession,
  PaymentStatus,
  RoastResult,
  ServiceRequest,
  ServiceRequestStatus,
} from "@/lib/types";

const requests = new Map<string, ServiceRequest>();
const payments = new Map<string, PaymentSession>();

function now() {
  return new Date().toISOString();
}

function mergeUpdatedAt<T extends { updatedAt: string }>(
  current: T,
  updates: Partial<T>,
): T {
  return {
    ...current,
    ...updates,
    updatedAt: now(),
  };
}

export function listRequests() {
  return [...requests.values()];
}

export function createRequest(
  request: Omit<ServiceRequest, "createdAt" | "updatedAt">,
): ServiceRequest {
  const created = {
    ...request,
    createdAt: now(),
    updatedAt: now(),
  };

  requests.set(created.id, created);
  return created;
}

export function getRequest(requestId: string) {
  return requests.get(requestId);
}

export function updateRequest(
  requestId: string,
  updates: Partial<ServiceRequest>,
): ServiceRequest | undefined {
  const existing = requests.get(requestId);

  if (!existing) {
    return undefined;
  }

  const updated = mergeUpdatedAt(existing, updates);
  requests.set(requestId, updated);
  return updated;
}

export function setRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  errorMessage?: string,
) {
  return updateRequest(requestId, {
    status,
    errorMessage,
  });
}

export function attachRequestResult(
  requestId: string,
  result: RoastResult,
  transactionReference?: string,
) {
  return updateRequest(requestId, {
    status: "completed",
    resultPayload: result,
    transactionReference,
    errorMessage: undefined,
  });
}

export function createPaymentSession(
  session: Omit<PaymentSession, "createdAt" | "updatedAt">,
): PaymentSession {
  const created = {
    ...session,
    createdAt: now(),
    updatedAt: now(),
  };

  payments.set(created.id, created);
  return created;
}

export function getPaymentSession(paymentId: string) {
  return payments.get(paymentId);
}

export function updatePaymentSession(
  paymentId: string,
  updates: Partial<PaymentSession>,
): PaymentSession | undefined {
  const existing = payments.get(paymentId);

  if (!existing) {
    return undefined;
  }

  const updated = mergeUpdatedAt(existing, updates);
  payments.set(paymentId, updated);
  return updated;
}

export function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  extra: Partial<PaymentSession> = {},
) {
  return updatePaymentSession(paymentId, {
    status,
    ...extra,
  });
}
