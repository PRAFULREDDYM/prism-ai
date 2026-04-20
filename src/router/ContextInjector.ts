import { countTokens } from "../shared/tokenizer";
import type { IntentResult, GraphResult, ContextFragmentResult } from "../graph/types";

const DENSITY_INSTRUCTION =
  "Be dense. Replace meta-commentary with labels: [reason] [context] [caveat] [note]. Skip preamble and sign-off.";

function uniqueDomainLabels(nodes: GraphResult[]): string[] {
  return Array.from(new Set(nodes.map((node) => node.label))).slice(0, 5);
}

function pickDomain(domains: string[], index: number, fallback: string): string {
  return domains[index] ?? domains[0] ?? fallback;
}

function fragmentForIntent(intent: IntentResult["intent"], domains: string[]): string {
  const primary = pickDomain(domains, 0, "the relevant domain");
  const secondary = pickDomain(domains, 1, primary);

  switch (intent) {
    case "CODE":
      return `Focus on ${primary}. Apply ${secondary} principles. Respond with code first, explanation after. No preamble. ${DENSITY_INSTRUCTION}`;
    case "FACTUAL":
      return `Answer from ${primary} knowledge. One direct answer. No padding. Facts only. ${DENSITY_INSTRUCTION}`;
    case "DEBUG":
      return `Diagnose from ${primary} perspective. State the cause first. Then the fix. Then why. ${DENSITY_INSTRUCTION}`;
    case "CONCEPTUAL":
      return `Explain using ${primary} and ${secondary} framing. Dense explanation. Skip what user already implied they know. ${DENSITY_INSTRUCTION}`;
    case "DECISION":
      return `Compare options through ${primary} lens. Use tradeoffs format. No recommendation preamble. ${DENSITY_INSTRUCTION}`;
    case "CREATIVE":
      return `Generate ${primary}-style content. Match the implied tone. No meta-commentary. ${DENSITY_INSTRUCTION}`;
    default:
      return `Explain using ${primary} framing. ${DENSITY_INSTRUCTION}`;
  }
}

export function buildContextFragment(
  nodes: GraphResult[],
  intentResult: IntentResult,
  prompt: string
): ContextFragmentResult {
  void prompt;

  let domains = uniqueDomainLabels(nodes);
  let fragment = fragmentForIntent(intentResult.intent, domains);
  let tokenCount = countTokens(fragment);

  while (tokenCount > 300 && domains.length > 1) {
    domains = domains.slice(0, domains.length - 1);
    fragment = fragmentForIntent(intentResult.intent, domains);
    tokenCount = countTokens(fragment);
  }

  if (tokenCount > 300) {
    fragment = `${fragmentForIntent(intentResult.intent, domains.slice(0, 1))}`;
    tokenCount = countTokens(fragment);
  }

  return {
    fragment,
    tokenCount,
    domains
  };
}
