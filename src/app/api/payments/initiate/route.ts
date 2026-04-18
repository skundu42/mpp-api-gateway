import { initiatePaymentForRequest } from "@/lib/payment-provider";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { requestId?: string };

    if (!body.requestId) {
      return Response.json({ error: "requestId is required." }, { status: 400 });
    }

    const payment = await initiatePaymentForRequest(body.requestId);
    return Response.json({ payment });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to initiate payment session.",
      },
      { status: 400 },
    );
  }
}
