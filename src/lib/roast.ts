import type { RoastInputPayload, RoastResult } from "@/lib/types";

export const SERVICE_PRICE_AMOUNT = "0.02";
export const SERVICE_CURRENCY = "USDC";

export function validateRoastInput(input: RoastInputPayload) {
  const websiteUrl = input.websiteUrl?.trim();
  const marketingCopy = input.marketingCopy?.trim();
  const brandName = input.brandName?.trim();
  const targetAudience = input.targetAudience?.trim();

  if (!websiteUrl && !marketingCopy) {
    throw new Error("Provide either a website URL or marketing copy to roast.");
  }

  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new Error("Website URL must be a valid http or https URL.");
    }
  }

  if (marketingCopy && marketingCopy.length < 40) {
    throw new Error("Marketing copy should be at least 40 characters long.");
  }

  if (marketingCopy && marketingCopy.length > 5000) {
    throw new Error("Marketing copy must stay under 5000 characters.");
  }

  return {
    websiteUrl,
    marketingCopy,
    brandName,
    targetAudience,
  };
}

function extractSourceText(input: ReturnType<typeof validateRoastInput>) {
  return [input.brandName, input.targetAudience, input.marketingCopy, input.websiteUrl]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

export function generateRoastResult(
  rawInput: RoastInputPayload,
): RoastResult {
  const input = validateRoastInput(rawInput);
  const source = extractSourceText(input);

  let clarityScore = 58;

  if (input.brandName) clarityScore += 6;
  if (input.targetAudience) clarityScore += 6;
  if (input.marketingCopy && input.marketingCopy.length > 160) clarityScore += 4;
  if (hasAny(source, ["free", "save", "faster", "instant", "simple"])) clarityScore += 4;
  if (hasAny(source, ["start", "book", "buy", "try", "schedule", "get"])) clarityScore += 4;
  if (hasAny(source, ["trusted by", "case study", "testimonial", "%", "roi", "results"])) {
    clarityScore += 5;
  }
  if (input.marketingCopy && input.marketingCopy.length > 1000) clarityScore -= 6;
  if (!hasAny(source, ["you", "your"])) clarityScore -= 3;

  clarityScore = Math.max(35, Math.min(92, clarityScore));

  const summary =
    clarityScore >= 75
      ? "The offer is understandable, but it still needs sharper proof and a more forceful next step."
      : "The page reads like an introduction, not a conversion system. The core offer needs more specificity and stronger buyer cues.";

  const headlineFeedback = input.marketingCopy
    ? hasAny(source, ["save", "faster", "instant", "roi", "grow"])
      ? "Your headline has benefit language, but it still needs a concrete outcome or time-to-value promise so the first screen feels specific."
      : "The headline likely explains what the product is without making the payoff obvious. Lead with the result, not the category."
    : "Because only a URL was provided, this roast can’t inspect the live hero copy. Treat the headline as the first thing to tighten: outcome, audience, and proof should all appear fast.";

  const ctaFeedback = hasAny(source, ["book", "buy", "start", "try", "get"])
    ? "You have CTA language present, but it should match the buyer’s intent more tightly. A specific verb like 'Get My Roast' or 'See My Conversion Gaps' will usually convert better than a generic action."
    : "The page needs a clearer call to action. Ask for one obvious next step and make it feel low-risk and immediate.";

  const conversionSuggestions = [
    "Rewrite the hero to combine audience, outcome, and a measurable promise in one sentence.",
    "Pair the primary CTA with one line that removes risk: turnaround time, pricing, or what the buyer receives.",
    "Add one trust block above the fold with proof points, logos, or concrete outcomes instead of generic claims.",
  ];

  if (!input.targetAudience) {
    conversionSuggestions.push("State the target audience explicitly so visitors can self-identify within three seconds.");
  }

  if (!input.brandName) {
    conversionSuggestions.push("Name the brand or product consistently to make the offer feel deliberate rather than generic.");
  }

  const trustSignals = hasAny(source, ["trusted by", "testimonial", "case study", "reviews", "customers"])
    ? [
        "Existing proof language is present, but it should be closer to the first CTA.",
        "Quantify proof wherever possible: customer count, conversion lift, or response time.",
      ]
    : [
        "No strong trust signal is evident from the submitted input.",
        "Add a proof strip, customer result, or implementation guarantee before asking for commitment.",
      ];

  const processingNotes = input.websiteUrl && !input.marketingCopy
    ? [
        "This roast was generated from the submitted URL metadata only; live page fetching is not enabled yet.",
        "For deeper feedback, submit the hero copy or relevant landing page text.",
      ]
    : [
        "This MVP roast uses deterministic heuristics so results stay fast and demo-friendly.",
        "The analyzer can be swapped for an LLM later without changing the payment flow.",
      ];

  return {
    summary,
    clarityScore,
    headlineFeedback,
    ctaFeedback,
    conversionSuggestions,
    trustSignals,
    processingNotes,
  };
}
