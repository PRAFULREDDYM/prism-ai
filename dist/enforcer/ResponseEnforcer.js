"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFillerRules = getFillerRules;
exports.enforceResponse = enforceResponse;
const node_fs_1 = __importDefault(require("node:fs"));
const paths_1 = require("../shared/paths");
const tokenizer_1 = require("../shared/tokenizer");
let cachedRules = null;
function loadFillerRules() {
    if (cachedRules) {
        return cachedRules;
    }
    const raw = node_fs_1.default.readFileSync((0, paths_1.resolveProjectPath)("rules", "fillers.json"), "utf8");
    cachedRules = JSON.parse(raw);
    return cachedRules;
}
function getFillerRules() {
    return structuredClone(loadFillerRules());
}
function applyRule(input, rule) {
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
function postProcess(input) {
    return (0, tokenizer_1.normalizeWhitespace)(input
        .replace(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/\[\s+/g, "[")
        .replace(/\s+\]/g, "]"));
}
function enforceResponse(raw, rules = loadFillerRules()) {
    const tokensBefore = (0, tokenizer_1.countTokens)(raw);
    let cleaned = raw;
    let reductions = 0;
    for (const rule of rules) {
        const result = applyRule(cleaned, rule);
        cleaned = result.output;
        reductions += result.replacements;
    }
    cleaned = postProcess(cleaned);
    const tokensAfter = (0, tokenizer_1.countTokens)(cleaned);
    return {
        cleaned,
        tokensBefore,
        tokensAfter,
        reductions
    };
}
//# sourceMappingURL=ResponseEnforcer.js.map