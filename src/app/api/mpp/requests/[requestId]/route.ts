import { generateRoastResult } from "@/lib/roast";
import { handleMppProtectedExecution } from "@/lib/mpp";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;

  return handleMppProtectedExecution(request, requestId, async () =>
    generateRoastResult(
      (
        await import("@/lib/store")
      ).getRequest(requestId)?.inputPayload ?? {},
    ),
  );
}
