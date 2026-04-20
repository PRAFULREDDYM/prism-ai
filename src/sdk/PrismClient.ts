import { enforceResponse, getFillerRules, type FillerRule } from "../enforcer/ResponseEnforcer";
import { classifyIntent, getIntentRuleSet } from "../graph/IntentClassifier";
import { buildGraph, listKnowledgeDomains, queryGraph } from "../graph/KnowledgeGraph";
import type { Intent, IntentRuleSet, KnowledgeDomainNode, KnowledgeGraph } from "../graph/types";
import { contentToText } from "../shared/anthropic";
import { countTokens } from "../shared/tokenizer";
import { buildContextFragment } from "../router/ContextInjector";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-0";
const DEFAULT_MAX_TOKENS = 1024;

export interface PrismSendOptions {
  prompt: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface PrismResponse {
  content: string;
  intent: Intent;
  domains: string[];
  tokensIn: number;
  tokensOut: number;
  fillerRemoved: number;
}

export interface PrismDryRun {
  intent: Intent;
  domains: string[];
  fragment: string;
  tokenCount: number;
}

export interface PrismConfigureOptions {
  rules?: IntentRuleSet;
  graphDomains?: KnowledgeDomainNode[];
  fillerPatterns?: FillerRule[];
}

interface PrismRuntimeState {
  rules: IntentRuleSet;
  graphDomains: KnowledgeDomainNode[];
  fillerPatterns: FillerRule[];
  graph: KnowledgeGraph;
}

interface PipelineState {
  intent: ReturnType<typeof classifyIntent>;
  fragment: string;
  tokenCount: number;
  domains: string[];
}

function createDefaultState(): PrismRuntimeState {
  const graphDomains = listKnowledgeDomains();
  return {
    rules: getIntentRuleSet(),
    graphDomains,
    fillerPatterns: getFillerRules(),
    graph: buildGraph(graphDomains)
  };
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export class PrismClient {
  private state: PrismRuntimeState = createDefaultState();

  configure(options: PrismConfigureOptions): void {
    if (options.rules) {
      this.state.rules = cloneValue(options.rules);
    }

    if (options.graphDomains) {
      this.state.graphDomains = cloneValue(options.graphDomains);
      this.state.graph = buildGraph(this.state.graphDomains);
    }

    if (options.fillerPatterns) {
      this.state.fillerPatterns = cloneValue(options.fillerPatterns);
    }
  }

  test(prompt: string): PrismDryRun {
    const pipeline = this.runPipeline(prompt);
    return {
      intent: pipeline.intent.intent,
      domains: pipeline.domains,
      fragment: pipeline.fragment,
      tokenCount: pipeline.tokenCount
    };
  }

  async send(options: PrismSendOptions): Promise<PrismResponse> {
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
    const responseBody = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};

    if (!response.ok) {
      const message =
        typeof responseBody.error === "object" &&
        responseBody.error &&
        typeof (responseBody.error as { message?: unknown }).message === "string"
          ? ((responseBody.error as { message: string }).message ?? "Anthropic request failed")
          : `Anthropic request failed with status ${response.status}`;

      throw new Error(message);
    }

    const rawContent = contentToText(responseBody.content);
    const enforced = enforceResponse(rawContent, this.state.fillerPatterns);
    const usage = responseBody.usage as { input_tokens?: number; output_tokens?: number } | undefined;

    return {
      content: enforced.cleaned,
      intent: pipeline.intent.intent,
      domains: pipeline.domains,
      tokensIn: usage?.input_tokens ?? countTokens(`${pipeline.fragment}\n\n${prompt}`),
      tokensOut: enforced.tokensAfter,
      fillerRemoved: enforced.reductions
    };
  }

  private runPipeline(prompt: string): PipelineState {
    const intent = classifyIntent(prompt, this.state.rules);
    const graphResults = queryGraph(this.state.graph, prompt, intent.intent);
    const context = buildContextFragment(graphResults, intent, prompt);

    return {
      intent,
      fragment: context.fragment,
      tokenCount: context.tokenCount,
      domains: context.domains
    };
  }
}

export const prism = new PrismClient();
