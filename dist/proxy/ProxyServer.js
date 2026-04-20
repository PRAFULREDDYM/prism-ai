"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startProxy = startProxy;
const express_1 = __importDefault(require("express"));
const IntentClassifier_1 = require("../graph/IntentClassifier");
const KnowledgeGraph_1 = require("../graph/KnowledgeGraph");
const ContextInjector_1 = require("../router/ContextInjector");
const ResponseEnforcer_1 = require("../enforcer/ResponseEnforcer");
const anthropic_1 = require("../shared/anthropic");
const config_1 = require("../shared/config");
const stats_1 = require("../shared/stats");
function applyCors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}
function appendPrismHeaders(res, details) {
    res.setHeader("x-prism-intent", details.intent);
    res.setHeader("x-prism-domains", details.domains.join(","));
    res.setHeader("x-prism-tokens-saved", String(details.tokensSaved));
    res.setHeader("x-prism-filler-removed", String(details.fillerRemoved));
}
function logRequest(details) {
    console.log(`[PRISM] intent=${details.intent} domains=${details.domains.join(",")} tokens_saved=${details.tokensSaved} filler_removed=${details.fillerRemoved}`);
}
function toIntentName(intent) {
    return intent;
}
async function handleNonStreamResponse(upstreamResponse, res, pipeline) {
    const payloadText = await upstreamResponse.text();
    const forwardedHeaders = (0, anthropic_1.copyResponseHeaders)(upstreamResponse.headers);
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
        res.status(upstreamResponse.status).send(payloadText);
        return;
    }
    const parsed = JSON.parse(payloadText);
    const rawAssistantText = (0, anthropic_1.contentToText)(parsed.content);
    const enforced = (0, ResponseEnforcer_1.enforceResponse)(rawAssistantText);
    const cleanedBody = (0, anthropic_1.replaceAssistantContent)(parsed, enforced.cleaned);
    Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
    appendPrismHeaders(res, {
        intent: pipeline.intent,
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    (0, stats_1.recordRequestStat)({
        intent: toIntentName(pipeline.intent),
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    logRequest({
        intent: pipeline.intent,
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    res.status(upstreamResponse.status).json(cleanedBody);
}
async function handleStreamResponse(upstreamResponse, res, pipeline) {
    const payloadText = await upstreamResponse.text();
    const events = (0, anthropic_1.parseSsePayload)(payloadText);
    const rawAssistantText = (0, anthropic_1.extractTextFromSse)(events);
    const enforced = (0, ResponseEnforcer_1.enforceResponse)(rawAssistantText);
    const ssePayload = (0, anthropic_1.buildAnthropicSse)(enforced.cleaned, events);
    const forwardedHeaders = (0, anthropic_1.copyResponseHeaders)(upstreamResponse.headers);
    Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    appendPrismHeaders(res, {
        intent: pipeline.intent,
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    (0, stats_1.recordRequestStat)({
        intent: toIntentName(pipeline.intent),
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    logRequest({
        intent: pipeline.intent,
        domains: pipeline.domains,
        tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
        fillerRemoved: enforced.reductions
    });
    res.status(upstreamResponse.status);
    res.write(ssePayload);
    res.end();
}
function startProxy(port) {
    const config = (0, config_1.getConfig)({ port });
    const app = (0, express_1.default)();
    (0, stats_1.resetSessionStats)();
    app.use(express_1.default.json({ limit: "5mb" }));
    app.use((req, res, next) => {
        applyCors(res);
        if (req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }
        next();
    });
    app.get("/", (_req, res) => {
        res.json({
            ok: true,
            service: "prism",
            proxy: `http://localhost:${config.port}`,
            routes: {
                health: "/health",
                stats: "/stats",
                domains: "/domains",
                messages: "/v1/messages"
            },
            note: "Point your Claude client at /v1/messages instead of api.anthropic.com/v1/messages."
        });
    });
    app.get("/health", (_req, res) => {
        res.json({
            ok: true,
            service: "prism",
            graphDomains: (0, KnowledgeGraph_1.listKnowledgeDomains)().length
        });
    });
    app.get("/stats", async (_req, res) => {
        res.json((0, stats_1.readSessionStats)());
    });
    app.get("/domains", (_req, res) => {
        res.json((0, KnowledgeGraph_1.listKnowledgeDomains)());
    });
    app.post("/v1/messages", async (req, res) => {
        try {
            const prompt = (0, anthropic_1.extractLastUserPrompt)(req.body);
            const intentResult = (0, IntentClassifier_1.classifyIntent)(prompt);
            const nodes = (0, KnowledgeGraph_1.queryGraph)(KnowledgeGraph_1.DEFAULT_KNOWLEDGE_GRAPH, prompt, intentResult.intent);
            const context = (0, ContextInjector_1.buildContextFragment)(nodes, intentResult, prompt);
            const upstreamBody = (0, anthropic_1.prependSystemPrompt)(req.body, context.fragment);
            const upstreamResponse = await fetch(`${config.anthropicBaseUrl.replace(/\/$/, "")}/v1/messages`, {
                method: "POST",
                headers: {
                    ...(0, anthropic_1.copyRequestHeaders)(req.headers),
                    "content-type": "application/json"
                },
                body: JSON.stringify(upstreamBody)
            });
            const pipeline = {
                intent: intentResult.intent,
                domains: context.domains
            };
            if (req.body.stream === true) {
                await handleStreamResponse(upstreamResponse, res, pipeline);
                return;
            }
            await handleNonStreamResponse(upstreamResponse, res, pipeline);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown Prism proxy error";
            res.status(500).json({
                error: {
                    type: "prism_error",
                    message
                }
            });
        }
    });
    app.listen(config.port, "127.0.0.1", () => {
        console.log(`Prism proxy listening on http://localhost:${config.port}`);
    });
}
//# sourceMappingURL=ProxyServer.js.map