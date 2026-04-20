# Prism SDK

The Prism SDK runs the full Prism pipeline in-process:

`IntentClassifier -> KnowledgeGraph -> ContextInjector -> Anthropic Messages API -> ResponseEnforcer`

There are no subprocesses and no extra network calls beyond the single Anthropic request made by `prism.send(...)`.

## Install

```bash
npm install
npm run build
```

## Import

TypeScript:

```ts
import { prism } from "prism-ai";
```

JavaScript:

```js
const { prism } = require("prism-ai");
```

## `prism.send(...)`

Send a prompt through the full Prism pipeline and get the cleaned Claude response back.

```ts
import { prism } from "prism-ai";

const response = await prism.send({
  prompt: "What is the capital of India?",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: "claude-sonnet-4-0",
  maxTokens: 256
});

console.log(response);
```

Response shape:

```ts
{
  content: string;
  intent: "CODE" | "FACTUAL" | "CONCEPTUAL" | "DECISION" | "CREATIVE" | "DEBUG";
  domains: string[];
  tokensIn: number;
  tokensOut: number;
  fillerRemoved: number;
}
```

Notes:

- `model` is optional. If omitted, Prism uses `claude-sonnet-4-0`.
- `maxTokens` is optional. If omitted, Prism uses `1024`.
- `tokensIn` comes from Anthropic usage when available, with a local token-count fallback.
- `tokensOut` is the post-enforcement output token count.

## `prism.test(...)`

Run the same deterministic routing pipeline as the CLI dry-run command, without calling Anthropic.

```ts
import { prism } from "prism-ai";

const dryRun = prism.test("fix this TypeError in my React component");

console.log(dryRun);
```

Return shape:

```ts
{
  intent: "CODE" | "FACTUAL" | "CONCEPTUAL" | "DECISION" | "CREATIVE" | "DEBUG";
  domains: string[];
  fragment: string;
  tokenCount: number;
}
```

## `prism.configure(...)`

Override Prism’s in-memory rule set, graph domains, or filler patterns for the current process.

```ts
import { prism } from "prism-ai";

prism.configure({
  rules: {
    defaultIntent: "CONCEPTUAL",
    intents: {
      CODE: { threshold: 2, keywords: ["function"], patterns: ["\\\\bfunction\\\\b"] },
      FACTUAL: { threshold: 2, keywords: ["capital"], patterns: ["\\\\bwhat is\\\\b"] },
      CONCEPTUAL: { threshold: 2, keywords: ["explain"], patterns: ["\\\\bhow does\\\\b"] },
      DECISION: { threshold: 2, keywords: ["compare"], patterns: ["\\\\bshould i\\\\b"] },
      CREATIVE: { threshold: 2, keywords: ["write"], patterns: ["\\\\bwrite\\\\b"] },
      DEBUG: { threshold: 2, keywords: ["error"], patterns: ["\\\\berror\\\\b"] }
    }
  }
});
```

Accepted configuration shape:

```ts
prism.configure({
  rules?: IntentRuleSet;
  graphDomains?: KnowledgeDomainNode[];
  fillerPatterns?: Array<{
    pattern: string;
    label: string;
    type: "prefix" | "suffix" | "inline";
  }>;
});
```

Behavior:

- `rules` replaces the deterministic intent rules used by `prism.test()` and `prism.send()`.
- `graphDomains` replaces the knowledge graph corpus and rebuilds the BM25 graph immediately.
- `fillerPatterns` replaces the response enforcement rules used after Anthropic returns content.

## Example

```ts
import { prism } from "prism-ai";

const preview = prism.test("should I use PostgreSQL or MongoDB");
console.log(preview.intent, preview.domains, preview.fragment);

const answer = await prism.send({
  prompt: "should I use PostgreSQL or MongoDB",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 300
});

console.log(answer.content);
```
