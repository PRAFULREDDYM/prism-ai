"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prism = exports.PrismClient = void 0;
const ResponseEnforcer_1 = require("../enforcer/ResponseEnforcer");
const IntentClassifier_1 = require("../graph/IntentClassifier");
const KnowledgeGraph_1 = require("../graph/KnowledgeGraph");
const anthropic_1 = require("../shared/anthropic");
const tokenizer_1 = require("../shared/tokenizer");
const ContextInjector_1 = require("../router/ContextInjector");
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-0";
const DEFAULT_MAX_TOKENS = 1024;
function createDefaultState() {
    const graphDomains = (0, KnowledgeGraph_1.listKnowledgeDomains)();
    return {
        rules: (0, IntentClassifier_1.getIntentRuleSet)(),
        graphDomains,
        fillerPatterns: (0, ResponseEnforcer_1.getFillerRules)(),
        graph: (0, KnowledgeGraph_1.buildGraph)(graphDomains)
    };
}
function cloneValue(value) {
    return structuredClone(value);
}
class PrismClient {
    state = createDefaultState();
    configure(options) {
        if (options.rules) {
            this.state.rules = cloneValue(options.rules);
        }
        if (options.graphDomains) {
            this.state.graphDomains = cloneValue(options.graphDomains);
            this.state.graph = (0, KnowledgeGraph_1.buildGraph)(this.state.graphDomains);
        }
        if (options.fillerPatterns) {
            this.state.fillerPatterns = cloneValue(options.fillerPatterns);
        }
    }
    test(prompt) {
        const pipeline = this.runPipeline(prompt);
        return {
            intent: pipeline.intent.intent,
            domains: pipeline.domains,
            fragment: pipeline.fragment,
            tokenCount: pipeline.tokenCount
        };
    }
    async send(options) {
        const { prompt, apiKey } = options;
        if (!prompt.trim()) {
            throw new Error("Prism send requires a non-empty prompt.");
        }
        if (!apiKey.trim()) {
            throw new Error("Prism send requires a non-empty Anthropic API key.");
        }
        const pipeline = this.runPipeline(prompt);
        const response = await fetch(ANTHROPIC_MESSAGES_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION
            },
            body: JSON.stringify({
                model: options.model ?? DEFAULT_MODEL,
                max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
                system: pipeline.fragment,
                messages: [{ role: "user", content: prompt }]
            })
        });
        const responseText = await response.text();
        const responseBody = responseText ? JSON.parse(responseText) : {};
        if (!response.ok) {
            const message = typeof responseBody.error === "object" &&
                responseBody.error &&
                typeof responseBody.error.message === "string"
                ? (responseBody.error.message ?? "Anthropic request failed")
                : `Anthropic request failed with status ${response.status}`;
            throw new Error(message);
        }
        const rawContent = (0, anthropic_1.contentToText)(responseBody.content);
        const enforced = (0, ResponseEnforcer_1.enforceResponse)(rawContent, this.state.fillerPatterns);
        const usage = responseBody.usage;
        return {
            content: enforced.cleaned,
            intent: pipeline.intent.intent,
            domains: pipeline.domains,
            tokensIn: usage?.input_tokens ?? (0, tokenizer_1.countTokens)(`${pipeline.fragment}\n\n${prompt}`),
            tokensOut: enforced.tokensAfter,
            fillerRemoved: enforced.reductions
        };
    }
    runPipeline(prompt) {
        const intent = (0, IntentClassifier_1.classifyIntent)(prompt, this.state.rules);
        const graphResults = (0, KnowledgeGraph_1.queryGraph)(this.state.graph, prompt, intent.intent);
        const context = (0, ContextInjector_1.buildContextFragment)(graphResults, intent, prompt);
        return {
            intent,
            fragment: context.fragment,
            tokenCount: context.tokenCount,
            domains: context.domains
        };
    }
}
exports.PrismClient = PrismClient;
exports.prism = new PrismClient();
//# sourceMappingURL=PrismClient.js.map