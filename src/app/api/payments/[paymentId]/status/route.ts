import { getPaymentStatus } from "@/lib/payment-provider";

export async function GET(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await context.params;
    const payment = await getPaymentStatus(paymentId);
    return Response.json({ payment });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to retrieve payment status.",
      },
      { status: 404 },
    );
  }
}
