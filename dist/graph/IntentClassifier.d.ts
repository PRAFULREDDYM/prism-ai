import type { Intent, IntentResult, IntentRuleSet } from "./types";
export declare function getIntentRuleSet(): IntentRuleSet;
export declare function classifyIntent(prompt: string, ruleSet?: IntentRuleSet): IntentResult;
export type { Intent, IntentResult };
