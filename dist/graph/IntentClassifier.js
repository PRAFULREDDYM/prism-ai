"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntentRuleSet = getIntentRuleSet;
exports.classifyIntent = classifyIntent;
const node_fs_1 = __importDefault(require("node:fs"));
const paths_1 = require("../shared/paths");
const tokenizer_1 = require("../shared/tokenizer");
const INTENT_PRIORITY = {
    DEBUG: 6,
    CODE: 5,
    DECISION: 4,
    FACTUAL: 3,
    CREATIVE: 2,
    CONCEPTUAL: 1
};
let cachedRuleSet = null;
function loadRuleSet() {
    if (cachedRuleSet) {
        return cachedRuleSet;
    }
    const raw = node_fs_1.default.readFileSync((0, paths_1.resolveProjectPath)("rules", "intents.json"), "utf8");
    cachedRuleSet = JSON.parse(raw);
    return cachedRuleSet;
}
function getIntentRuleSet() {
    return structuredClone(loadRuleSet());
}
function phrasePresent(prompt, phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(prompt);
}
function scoreRule(prompt, rule) {
    const promptLower = prompt.toLowerCase();
    const tokens = (0, tokenizer_1.tokenizeWords)(prompt);
    const stems = new Set(tokens.map(tokenizer_1.stemWord));
    const tokenSet = new Set(tokens);
    const signals = new Set();
    let score = 0;
    for (const keyword of rule.keywords) {
        const normalizedKeyword = keyword.toLowerCase();
        const isPhrase = normalizedKeyword.includes(" ");
        const matched = isPhrase
            ? promptLower.includes(normalizedKeyword)
            : tokenSet.has(normalizedKeyword) || stems.has((0, tokenizer_1.stemWord)(normalizedKeyword)) || phrasePresent(promptLower, normalizedKeyword);
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
function computeConfidence(score, threshold, margin) {
    if (score <= 0) {
        return 0.2;
    }
    const thresholdFactor = Math.min(1, score / Math.max(threshold, 0.1));
    const marginFactor = Math.max(0, Math.min(1, margin / Math.max(score, 1)));
    const confidence = 0.35 + thresholdFactor * 0.45 + marginFactor * 0.2;
    return Number(Math.min(0.99, confidence).toFixed(2));
}
function classifyIntent(prompt, ruleSet = loadRuleSet()) {
    const rules = ruleSet;
    const scored = Object.entries(rules.intents).map(([intent, rule]) => {
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
//# sourceMappingURL=IntentClassifier.js.map