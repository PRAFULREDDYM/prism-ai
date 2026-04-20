import fs from "node:fs";
import { resolveProjectPath } from "../shared/paths";
import { countTokens, normalizeWhitespace } from "../shared/tokenizer";

export interface FillerRule {
  pattern: string;
  label: string;
  type: "prefix" | "suffix" | "inline";
}

export interface EnforcedResponse {
  cleaned: string;
  tokensBefore: number;
  tokensAfter: number;
  reductions: number;
}

let cachedRules: FillerRule[] | null = null;

function loadFillerRules(): FillerRule[] {
  if (cachedRules) {
    return cachedRules;
  }

  const raw = fs.readFileSync(resolveProjectPath("rules", "fillers.json"), "utf8");
  cachedRules = JSON.parse(raw) as FillerRule[];
  return cachedRules;
}

export function getFillerRules(): FillerRule[] {
  return structuredClone(loadFillerRules());
}

function applyRule(input: string, rule: FillerRule): { output: string; replacements: number } {
  const regex = new RegExp(rule.pattern, "gim");
  let replacements = 0;

  const output = input.replace(regex, () => {
    replacements += 1;
    if (rule.type === "inline") {
      return ` [${rule.label}] `;
    }

    return "";
  });

  return { output, replacements };
}

function postProcess(input: string): string {
  return normalizeWhitespace(
    input
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\[\s+/g, "[")
      .replace(/\s+\]/g, "]")
  );
}

export function enforceResponse(raw: string, rules: FillerRule[] = loadFillerRules()): EnforcedResponse {
  const tokensBefore = countTokens(raw);
  let cleaned = raw;
  let reductions = 0;

  for (const rule of rules) {
    const result = applyRule(cleaned, rule);
    cleaned = result.output;
    reductions += result.replacements;
  }

  cleaned = postProcess(cleaned);
  const tokensAfter = countTokens(cleaned);

  return {
    cleaned,
    tokensBefore,
    tokensAfter,
    reductions
  };
}
