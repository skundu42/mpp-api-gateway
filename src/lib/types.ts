export type ServiceType = "landing-page-roast";
export type CurrencyCode = "USDC";

export type ServiceRequestStatus =
  | "created"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "completed"
  | "failed";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired";

export type PaymentProvider = "mock" | "stripe_mpp";

export interface RoastInputPayload {
  websiteUrl?: string;
  marketingCopy?: string;
  brandName?: string;
  targetAudience?: string;
}

export interface RoastResult {
  summary: string;
  clarityScore: number;
  headlineFeedback: string;
  ctaFeedback: string;
  conversionSuggestions: string[];
  trustSignals: string[];
  processingNotes: string[];
}

export interface ServiceRequest {
  id: string;
  serviceType: ServiceType;
  inputPayload: RoastInputPayload;
  priceAmount: string;
  currency: CurrencyCode;
  status: ServiceRequestStatus;
  paymentSessionId?: string;
  transactionReference?: string;
  resultPayload?: RoastResult;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSession {
  id: string;
  serviceRequestId: string;
  amount: string;
  currency: CurrencyCode;
  provider: PaymentProvider;
  status: PaymentStatus;
  mppReference: string;
  tempoTxHash?: string;
  payToAddress?: string;
  supportedTokenContract?: string;
  verificationTimestamp?: string;
  statusMessage: string;
  createdAt: string;
  updatedAt: string;
}
