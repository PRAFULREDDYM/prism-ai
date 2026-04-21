<div align="center">

```
  ██████╗ ██████╗ ██╗███████╗███╗   ███╗     █████╗ ██╗
  ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║    ██╔══██╗██║
  ██████╔╝██████╔╝██║███████╗██╔████╔██║    ███████║██║
  ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║    ██╔══██║██║
  ██║     ██║  ██║██║███████║██║ ╚═╝ ██║    ██║  ██║██║
  ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝
```

**Zero-token semantic routing for Claude. Right knowledge. Right context. Every time.**

[![npm version](https://img.shields.io/npm/v/prism-ai.svg?style=flat-square&color=89b4fa)](https://www.npmjs.com/package/prism-ai)
[![Publish Status](https://github.com/PRAFULREDDYM/prism-ai/actions/workflows/publish.yml/badge.svg?style=flat-square)](https://github.com/PRAFULREDDYM/prism-ai/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-a6e3a1.svg?style=flat-square)](LICENSE)
[![Zero ML dependencies](https://img.shields.io/badge/ML%20Deps-Zero-f9e2af.svg?style=flat-square)](#)

</div>

Prism is a local proxy that sits in front of the Claude API and makes every request sharper before it leaves your machine. It classifies the prompt, activates only the most relevant knowledge domains through a compact system fragment, forwards the request with your original Anthropic headers, and strips filler from the response before it comes back. **No embeddings. No vector database. No second model compressing the first.**

<div align="center">
<img src="./demo.gif" alt="Prism demo" width="600" />
</div>

| | Token Cost | Mechanism | Feedback |
|---|---|---|---|
| Typical Proxies | 💰 Extra calls | Model-based | Black box |
| **Prism** | 🆓 Zero | BM25 + Rules | Inspectable CLI |

---

## Why This Exists

Most “context optimization” tools try to use AI to compress AI. That means extra calls, extra latency, more cost, and another layer that can hallucinate before your actual model even starts answering. It is the wrong abstraction.

Prism does the opposite. It uses deterministic BM25 scoring over a fixed knowledge graph, plus a rule-based intent classifier, to route the request into the right semantic lane every time. The system prompt stays lean. The routing stays inspectable. The behavior stays predictable. That is the core innovation: **precise context selection without another model in the loop.**

---

## Installation

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
2. Open `chrome://extensions` and enable Developer Mode.
3. Use “Load unpacked” and select the `extension/` folder.

---

## How it works

### Architecture

```text
User Prompt
    │
    ├── Intent Classifier (Scored rule graph)
    │
    ├── Knowledge Graph (BM25 + Graph links)
    │
    ├── Context Injector (System fragment synthesis)
    │
    └── Claude API ──> Response Enforcer (Filler removal) ──> Output
```

### 1. Intent Classifier
Prism starts by classifying the prompt into one of six deterministic intents: `CODE`, `FACTUAL`, `CONCEPTUAL`, `DECISION`, `CREATIVE`, or `DEBUG`. This is not a model call. It is a scored rule graph driven by keywords, regex phrases, and per-intent thresholds from `rules/intents.json`.

### 2. Knowledge Graph
Once Prism knows the task shape, it queries an in-memory knowledge graph of 40 Claude knowledge domains using BM25. Every domain is a hardcoded semantic node with keywords, neighboring domains, and intent affinities. Prism scores every node in microseconds and expands top matches via graph links to pull in nearby context.

### 3. Context Injector
The winning domains are converted into a lean system fragment that tells Claude exactly how to think about the request. The fragment is token-counted with `tiktoken` and kept under 300 tokens, ensuring the routing layer stays compact and predictable.

### 4. Response Enforcer
After Claude responds, Prism strips the filler: breezy preambles, sign-offs, and empty transitions. Prefixes disappear entirely. Inline fluff gets compact semantic labels such as `[reason]`, `[context]`, or `[caveat]`.

---

## The Before / After

### Prompt before Prism
```text
Can you explain what the capital of India is and maybe give me a little context around it?
```

### What Prism routes (System fragment)
```text
Intent: FACTUAL
Domains: Geography, History, Education
Answer from Geography knowledge. One direct answer. No padding. Facts only.
Be dense. Replace meta-commentary with labels: [reason] [context] [caveat] [note]. Skip preamble and sign-off.
```

### Response after Prism
```text
New Delhi is the capital of India. [note] people often say "Delhi," but the national capital is specifically New Delhi within the National Capital Territory of Delhi.
```

---

## CLI

Prism ships with a production-ready CLI:

- `prism start`: Starts the local proxy on `localhost:3179`
- `prism status`: Shows requests processed, average tokens saved, and top intents
- `prism test "..."`: Dry-runs classification, graph routing, and context injection
- `prism domains`: Lists all 40 knowledge domains loaded at startup

```text
◆ Prism v0.1.0
Knowledge graph: 40 domains loaded
Proxy: http://localhost:3179
Route your Claude API calls here instead of api.anthropic.com
```

---

## Configuration

Environment variables:
```bash
PRISM_PORT=3179
PRISM_ANTHROPIC_BASE_URL=https://api.anthropic.com
PRISM_STATS_FILE=.prism-session.json
```

---

## Used By

- [**prism-agent**](https://github.com/PRAFULREDDYM/prism-agent): A standalone terminal AI coding agent powered by Prism's knowledge routing.

---

## Contributing

Contributions are welcome. Good issues and PRs include:
- New intent rules that improve classification (`rules/intents.json`).
- Tighter filler patterns that remove fluff without erasing meaning (`rules/fillers.json`).
- Better domain keywords and graph links for more precise BM25 routing.
- Streaming compatibility improvements and extension polish.

---

## License

MIT — see [LICENSE](LICENSE).
