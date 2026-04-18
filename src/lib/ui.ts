import type { PaymentProvider } from "@/lib/types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdAmount(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return typeof value === "string" ? `${value} USD` : usdFormatter.format(0);
  }

  return usdFormatter.format(numericValue);
}

export function formatStatusLabel(status?: string) {
  if (!status) {
    return "Idle";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getStatusColor(status?: string) {
  switch (status) {
    case "paid":
    case "completed":
    case "active":
      return "success";
    case "processing":
      return "processing";
    case "awaiting_payment":
    case "pending":
    case "created":
      return "warning";
    case "failed":
    case "expired":
      return "error";
    default:
      return "default";
  }
}

export function getProviderLabel(provider: PaymentProvider) {
  switch (provider) {
    case "tempo_testnet":
      return "Tempo testnet";
    case "stripe_mpp":
      return "Stripe deposit rail";
    default:
      return "Mock Tempo";
  }
}

export function getInvocationStep(
  invocationStatus?: string,
  paymentStatus?: string,
  hasResult?: boolean,
) {
  if (hasResult || invocationStatus === "completed") {
    return 2;
  }

  if (
    paymentStatus === "paid" ||
    invocationStatus === "paid" ||
    invocationStatus === "processing"
  ) {
    return 1;
  }

  return 0;
}
