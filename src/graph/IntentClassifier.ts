import fs from "node:fs";
import { resolveProjectPath } from "../shared/paths";
import { stemWord, tokenizeWords } from "../shared/tokenizer";
import type { Intent, IntentResult, IntentRule, IntentRuleSet } from "./types";

const INTENT_PRIORITY: Record<Intent, number> = {
  DEBUG: 6,
  CODE: 5,
  DECISION: 4,
  FACTUAL: 3,
  CREATIVE: 2,
  CONCEPTUAL: 1
};

let cachedRuleSet: IntentRuleSet | null = null;

function loadRuleSet(): IntentRuleSet {
  if (cachedRuleSet) {
    return cachedRuleSet;
  }

  const raw = fs.readFileSync(resolveProjectPath("rules", "intents.json"), "utf8");
  cachedRuleSet = JSON.parse(raw) as IntentRuleSet;
  return cachedRuleSet;
}

export function getIntentRuleSet(): IntentRuleSet {
  return structuredClone(loadRuleSet());
}

function phrasePresent(prompt: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(prompt);
}

function scoreRule(prompt: string, rule: IntentRule): { score: number; signals: string[] } {
  const promptLower = prompt.toLowerCase();
  const tokens = tokenizeWords(prompt);
  const stems = new Set(tokens.map(stemWord));
  const tokenSet = new Set(tokens);
  const signals = new Set<string>();
  let score = 0;

  for (const keyword of rule.keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    const isPhrase = normalizedKeyword.includes(" ");
    const matched = isPhrase
      ? promptLower.includes(normalizedKeyword)
      : tokenSet.has(normalizedKeyword) || stems.has(stemWord(normalizedKeyword)) || phrasePresent(promptLower, normalizedKeyword);

    if (matched) {
      score += isPhrase ? 1.35 : 1;
      signals.add(`keyword:${keyword}`);
    }
  }

  for (const pattern of rule.patterns) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(prompt)) {
      score += 1.85;
      signals.add(`pattern:${pattern}`);
    }
  }

  return {
    score,
    signals: Array.from(signals)
  };
}

function computeConfidence(score: number, threshold: number, margin: number): number {
  if (score <= 0) {
    return 0.2;
  }

  const thresholdFactor = Math.min(1, score / Math.max(threshold, 0.1));
  const marginFactor = Math.max(0, Math.min(1, margin / Math.max(score, 1)));
  const confidence = 0.35 + thresholdFactor * 0.45 + marginFactor * 0.2;
  return Number(Math.min(0.99, confidence).toFixed(2));
}

export function classifyIntent(prompt: string, ruleSet: IntentRuleSet = loadRuleSet()): IntentResult {
  const rules = ruleSet;
  const scored = (Object.entries(rules.intents) as Array<[Intent, IntentRule]>).map(([intent, rule]) => {
    const result = scoreRule(prompt, rule);
    return {
      intent,
      threshold: rule.threshold,
      score: result.score,
      matchedSignals: result.signals
    };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return INTENT_PRIORITY[right.intent] - INTENT_PRIORITY[left.intent];
  });

  const best = scored[0];
  const second = scored[1];
  const margin = best.score - (second?.score ?? 0);

  if (!best || best.score < best.threshold) {
    const fallbackSignals = scored.find((item) => item.intent === rules.defaultIntent)?.matchedSignals ?? [];
    return {
      intent: rules.defaultIntent,
      confidence: Number((fallbackSignals.length > 0 ? 0.42 : 0.3).toFixed(2)),
      matchedSignals: fallbackSignals
    };
  }

  return {
    intent: best.intent,
    confidence: computeConfidence(best.score, best.threshold, margin),
    matchedSignals: best.matchedSignals
  };
}

export type { Intent, IntentResult };
