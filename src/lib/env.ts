import type { PaymentProvider } from "@/lib/types";

const provider =
  (process.env.PAYMENTS_PROVIDER as PaymentProvider | undefined) ?? "mock";

if (provider !== "mock" && provider !== "stripe_mpp") {
  throw new Error(`Unsupported PAYMENTS_PROVIDER: ${provider}`);
}

export const appEnv = {
  provider,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  mppSecretKey: process.env.MPP_SECRET_KEY,
  publicProvider:
    (process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER as PaymentProvider | undefined) ??
    provider,
};
