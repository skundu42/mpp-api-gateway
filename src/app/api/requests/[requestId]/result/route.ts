import { getRequest } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await context.params;
    const serviceRequest = getRequest(requestId);

    if (!serviceRequest) {
      return Response.json({ error: "Service request not found." }, { status: 404 });
    }

    if (!serviceRequest.resultPayload) {
      return Response.json(
        { error: "Result is still locked." },
        { status: 403 },
      );
    }

    return Response.json({
      requestId,
      result: serviceRequest.resultPayload,
      transactionReference: serviceRequest.transactionReference,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch result.",
      },
      { status: 500 },
    );
  }
}
