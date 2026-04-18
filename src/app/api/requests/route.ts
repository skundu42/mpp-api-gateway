import { randomUUID } from "node:crypto";

import { createRequest } from "@/lib/store";
import { SERVICE_CURRENCY, SERVICE_PRICE_AMOUNT, validateRoastInput } from "@/lib/roast";
import type { RoastInputPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as RoastInputPayload;
    const validatedInput = validateRoastInput(input);

    const serviceRequest = createRequest({
      id: randomUUID(),
      serviceType: "landing-page-roast",
      inputPayload: validatedInput,
      priceAmount: SERVICE_PRICE_AMOUNT,
      currency: SERVICE_CURRENCY,
      status: "created",
    });

    return Response.json({
      request: serviceRequest,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to create service request.",
      },
      { status: 400 },
    );
  }
}
