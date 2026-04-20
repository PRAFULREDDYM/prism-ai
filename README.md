# ◆ Prism

Zero-token semantic routing for Claude. Right knowledge. Right context. Every time.

![Prism demo](./demo.gif)

![npm version](https://img.shields.io/npm/v/prism-ai)
![Publish Status](https://github.com/PRAFULREDDYM/prism-ai/actions/workflows/publish.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Zero ML dependencies](https://img.shields.io/badge/ML%20deps-0-critical)

Prism is a local proxy that sits in front of the Claude API and makes every request sharper before it leaves your machine. It classifies the prompt, activates only the most relevant knowledge domains through a compact system fragment, forwards the request with your original Anthropic headers, and strips filler from the response before it comes back. No embeddings. No vector database. No second model compressing the first.

## Why This Exists

Most “context optimization” tools try to use AI to compress AI. That means extra calls, extra latency, more cost, and another layer that can hallucinate before your actual model even starts answering. It is the wrong abstraction.

Prism does the opposite. It uses deterministic BM25 scoring over a fixed knowledge graph, plus a rule-based intent classifier, to route the request into the right semantic lane every time. The system prompt stays lean. The routing stays inspectable. The behavior stays predictable. That is the core innovation: precise context selection without another model in the loop.

## Used By

- [**prism-agent**](https://github.com/PRAFULREDDYM/prism-agent): A standalone terminal AI coding agent powered by Prism's knowledge routing.

## Architecture

```text
User Prompt
   |
   v
Intent Classifier
   |
   v
Knowledge Graph
   |
   v
Context Injector
   |
   v
Claude API
   |
   v
Response Enforcer
   |
   v
User
```

## Install

### Option 1: `npx` (zero install)

```bash
npx prism-ai start
```

### Option 2: Global install

```bash
npm install -g prism-ai
prism start
```

### Option 3: Browser extension

1. Run Prism locally.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Drag the `extension/` folder into the page, or use “Load unpacked” and select it.

## Usage

Change your Claude API base URL from `https://api.anthropic.com` to `http://localhost:3179`. That is it.

Local project usage:

```bash
git clone <your-fork-or-local-copy>
cd prism
npm install
npm run build
node bin/prism.js start
```

Dry-run a prompt through the pipeline without calling Claude:

```bash
node bin/prism.js test "what is the capital of India"
```

## Recording the demo GIF

```bash
bash scripts/record_demo_gif.sh
```

Inspect current session stats:

```bash
node bin/prism.js status
```

List the knowledge domains loaded at startup:

```bash
node bin/prism.js domains
```

## How It Works

### 1. Intent Classifier

Prism starts by classifying the prompt into one of six deterministic intents: `CODE`, `FACTUAL`, `CONCEPTUAL`, `DECISION`, `CREATIVE`, or `DEBUG`. This is not a model call. It is a scored rule graph driven by keywords, regex phrases, and per-intent thresholds from `rules/intents.json`. The result is a concrete `{ intent, confidence, matchedSignals }` object you can inspect in the CLI.

### 2. Knowledge Graph

Once Prism knows the task shape, it queries an in-memory knowledge graph of 40 Claude knowledge domains using BM25. Every domain is a hardcoded semantic node with keywords, neighboring domains, and intent affinities. Prism scores every node in microseconds, boosts domains that naturally fit the current intent, and expands the top matches through graph links to pull in nearby context without dragging in whole libraries of irrelevant information.

### 3. Context Injector

The winning domains are converted into a lean system fragment that tells Claude exactly how to think about the request. Code prompts get “code first, explanation after.” Factual prompts get “facts only.” Decision prompts get tradeoff framing. The fragment is token-counted with `tiktoken` and kept under 300 tokens, so the routing layer stays compact and predictable.

### 4. Response Enforcer

After Claude responds, Prism strips the filler that wastes time and tokens: breezy preambles, sign-offs, meta-commentary, and empty transitions. Prefixes and sign-offs disappear entirely. Inline fluff gets compact semantic labels such as `[reason]`, `[context]`, or `[caveat]`. The output keeps the substance, loses the padding, and reports exactly how many tokens were saved.

## The Before / After

### Prompt before Prism

```text
Can you explain what the capital of India is and maybe give me a little context around it?
```

### What Prism routes

```text
Intent: FACTUAL
Domains: Geography, History, Education
System fragment:
Answer from Geography knowledge. One direct answer. No padding. Facts only.
Be dense. Replace meta-commentary with labels: [reason] [context] [caveat] [note]. Skip preamble and sign-off.
```

### Typical verbose response without Prism

```text
Sure! The capital of India is New Delhi. It's worth noting that people sometimes confuse Delhi with New Delhi, but New Delhi is the capital district within the broader National Capital Territory of Delhi. I hope this helps.
```

### Response after Prism

```text
New Delhi is the capital of India. [note] people often say "Delhi," but the national capital is specifically New Delhi within the National Capital Territory of Delhi.
```

That is the whole point: less fluff in, less fluff out, and the model’s attention aimed at the right knowledge domain before generation even starts.

## CLI

Prism ships with a production-ready CLI:

- `prism start` starts the local proxy on `localhost:3179`
- `prism start --port 3180` starts on a custom port
- `prism status` shows requests processed, average tokens saved, and top intents
- `prism test "..."` dry-runs classification, graph routing, and context injection
- `prism domains` lists all 40 knowledge domains loaded at startup

Startup banner:

```text
◆ Prism v0.1.0
Knowledge graph: 40 domains loaded
Proxy: http://localhost:3179
Route your Claude API calls here instead of api.anthropic.com
Zero extra tokens. Zero extra API calls.
```

## Browser Extension

The included Chrome/Edge Manifest V3 extension rewrites Claude web traffic through Prism when enabled. It adds a live pill badge inside `claude.ai`, shows session stats in the popup, and lets you toggle Prism on or off without restarting the proxy. When disabled, traffic continues directly to Anthropic with no interception.

## Configuration

Environment variables:

```bash
PRISM_PORT=3179
PRISM_ANTHROPIC_BASE_URL=https://api.anthropic.com
PRISM_STATS_FILE=.prism-session.json
```

Prism preserves all Anthropic headers, including `x-api-key`, `anthropic-version`, and streaming settings.

## Contributing

Contributions are welcome. Good issues and PRs include:

- new intent rules that improve deterministic classification without widening false positives
- tighter filler patterns that remove fluff without erasing meaning
- better domain keywords and graph links for more precise BM25 routing
- streaming compatibility improvements for more Anthropic client shapes
- browser extension polish and cross-browser testing

If you open a PR, include one or two prompt examples that show the behavioral change before and after Prism. The project is intentionally inspectable, so concrete examples matter more than vague benchmarks.

## License

MIT
