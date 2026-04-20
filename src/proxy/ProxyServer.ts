import express, { type Request, type Response } from "express";
import { classifyIntent } from "../graph/IntentClassifier";
import { DEFAULT_KNOWLEDGE_GRAPH, listKnowledgeDomains, queryGraph } from "../graph/KnowledgeGraph";
import { buildContextFragment } from "../router/ContextInjector";
import { enforceResponse } from "../enforcer/ResponseEnforcer";
import {
  buildAnthropicSse,
  contentToText,
  copyRequestHeaders,
  copyResponseHeaders,
  extractLastUserPrompt,
  extractTextFromSse,
  parseSsePayload,
  prependSystemPrompt,
  replaceAssistantContent
} from "../shared/anthropic";
import { getConfig } from "../shared/config";
import { readSessionStats, recordRequestStat, resetSessionStats, type IntentName } from "../shared/stats";

function applyCors(res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function appendPrismHeaders(
  res: Response,
  details: { intent: string; domains: string[]; tokensSaved: number; fillerRemoved: number }
): void {
  res.setHeader("x-prism-intent", details.intent);
  res.setHeader("x-prism-domains", details.domains.join(","));
  res.setHeader("x-prism-tokens-saved", String(details.tokensSaved));
  res.setHeader("x-prism-filler-removed", String(details.fillerRemoved));
}

function logRequest(details: { intent: string; domains: string[]; tokensSaved: number; fillerRemoved: number }): void {
  console.log(
    `[PRISM] intent=${details.intent} domains=${details.domains.join(",")} tokens_saved=${details.tokensSaved} filler_removed=${details.fillerRemoved}`
  );
}

function toIntentName(intent: string): IntentName {
  return intent as IntentName;
}

async function handleNonStreamResponse(upstreamResponse: globalThis.Response, res: Response, pipeline: {
  intent: string;
  domains: string[];
}): Promise<void> {
  const payloadText = await upstreamResponse.text();
  const forwardedHeaders = copyResponseHeaders(upstreamResponse.headers);
  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(upstreamResponse.status).send(payloadText);
    return;
  }

  const parsed = JSON.parse(payloadText) as Record<string, unknown>;
  const rawAssistantText = contentToText(parsed.content);
  const enforced = enforceResponse(rawAssistantText);
  const cleanedBody = replaceAssistantContent(parsed, enforced.cleaned);

  Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
  appendPrismHeaders(res, {
    intent: pipeline.intent,
    domains: pipeline.domains,
    tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
    fillerRemoved: enforced.reductions
  });

  recordRequestStat({
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

async function handleStreamResponse(upstreamResponse: globalThis.Response, res: Response, pipeline: {
  intent: string;
  domains: string[];
}): Promise<void> {
  const payloadText = await upstreamResponse.text();
  const events = parseSsePayload(payloadText);
  const rawAssistantText = extractTextFromSse(events);
  const enforced = enforceResponse(rawAssistantText);
  const ssePayload = buildAnthropicSse(enforced.cleaned, events);
  const forwardedHeaders = copyResponseHeaders(upstreamResponse.headers);

  Object.entries(forwardedHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache");
  appendPrismHeaders(res, {
    intent: pipeline.intent,
    domains: pipeline.domains,
    tokensSaved: enforced.tokensBefore - enforced.tokensAfter,
    fillerRemoved: enforced.reductions
  });

  recordRequestStat({
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

export function startProxy(port: number): void {
  const config = getConfig({ port });
  const app = express();

  resetSessionStats();

  app.use(express.json({ limit: "5mb" }));
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
      graphDomains: listKnowledgeDomains().length
    });
  });

  app.get("/stats", async (_req, res) => {
    res.json(readSessionStats());
  });

  app.get("/domains", (_req, res) => {
    res.json(listKnowledgeDomains());
  });

  app.post("/v1/messages", async (req: Request, res: Response) => {
    try {
      const prompt = extractLastUserPrompt(req.body as Record<string, unknown>);
      const intentResult = classifyIntent(prompt);
      const nodes = queryGraph(DEFAULT_KNOWLEDGE_GRAPH, prompt, intentResult.intent);
      const context = buildContextFragment(nodes, intentResult, prompt);
      const upstreamBody = prependSystemPrompt(req.body as Record<string, unknown>, context.fragment);

      const upstreamResponse = await fetch(`${config.anthropicBaseUrl.replace(/\/$/, "")}/v1/messages`, {
        method: "POST",
        headers: {
          ...copyRequestHeaders(req.headers as Record<string, unknown>),
          "content-type": "application/json"
        },
        body: JSON.stringify(upstreamBody)
      });

      const pipeline = {
        intent: intentResult.intent,
        domains: context.domains
      };

      if ((req.body as Record<string, unknown>).stream === true) {
        await handleStreamResponse(upstreamResponse, res, pipeline);
        return;
      }

      await handleNonStreamResponse(upstreamResponse, res, pipeline);
    } catch (error) {
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
