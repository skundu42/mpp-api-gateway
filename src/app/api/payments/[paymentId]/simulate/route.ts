import { simulatePayment } from "@/lib/payment-provider";

export async function POST(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  try {
    const { paymentId } = await context.params;
    const payment = await simulatePayment(paymentId);
    return Response.json({ payment });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to simulate payment.",
      },
      { status: 400 },
    );
  }
}
