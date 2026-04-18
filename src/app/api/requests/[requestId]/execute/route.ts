import { generateRoastResult } from "@/lib/roast";
import { attachRequestResult, getPaymentSession, getRequest, setRequestStatus } from "@/lib/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params;
    const serviceRequest = getRequest(requestId);

    if (!serviceRequest) {
      return Response.json({ error: "Service request not found." }, { status: 404 });
    }

    if (!serviceRequest.paymentSessionId) {
      return Response.json(
        { error: "Payment session has not been created for this request." },
        { status: 400 },
      );
    }

    const payment = getPaymentSession(serviceRequest.paymentSessionId);

    if (!payment || payment.status !== "paid") {
      return Response.json(
        { error: "Payment must be verified before execution." },
        { status: 402 },
      );
    }

    if (serviceRequest.resultPayload) {
      return Response.json({
        requestId,
        result: serviceRequest.resultPayload,
        transactionReference: serviceRequest.transactionReference,
      });
    }

    setRequestStatus(requestId, "processing");
    const result = generateRoastResult(serviceRequest.inputPayload);
    attachRequestResult(requestId, result, payment.tempoTxHash ?? payment.mppReference);

    return Response.json({
      requestId,
      result,
      transactionReference: payment.tempoTxHash ?? payment.mppReference,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to execute request.",
      },
      { status: 500 },
    );
  }
}
