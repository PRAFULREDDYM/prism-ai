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

Prism is a local proxy that sits in front of the Claude API and makes every request sharper before it leaves your machine. It classifies the prompt, activates only the most relevant knowledge domains through a compact system fragment, and strips filler from the response.

<div align="center">
<img src="./demo.gif" alt="Prism demo" width="600" />
</div>

Most “context optimization” tools use AI to compress AI, adding latency and cost. Prism uses deterministic BM25 scoring over a fixed knowledge graph and a rule-based intent classifier to route requests into the right semantic lane instantly.

| | Token Cost | Mechanism | Feedback |
|---|---|---|---|
| Typical Proxies | 💰 Extra calls | Model-based | Black box |
| **Prism** | 🆓 Zero | BM25 + Rules | Inspectable CLI |

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
2. Load the `extension/` folder in `chrome://extensions` via “Load unpacked”.

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

1. **Intent Classifier**: Classifies prompts into `CODE`, `FACTUAL`, `CONCEPTUAL`, etc., using a deterministic rule set in `rules/intents.json`.
2. **Knowledge Graph**: Queries 40+ knowledge domains in microseconds. Boosts relevant nodes and expands via graph links.
3. **Context Injector**: Converts winning domains into a lean system fragment (<300 tokens) via `tiktoken`.
4. **Response Enforcer**: Strips preamble, sign-offs, and transitions. Labels inline fluff (e.g., `[reason]`, `[context]`).

---

## Usage

### Local Development
```bash
git clone https://github.com/PRAFULREDDYM/prism-ai.git
cd prism-ai
npm install && npm run build
node bin/prism.js start
```

### Dry-run Pipeline
Test classification and routing without calling the API:
```bash
prism test "How do I implement a debounced search in React?"
```

### CLI Commands
- `prism status`: Show session stats and token savings.
- `prism domains`: List all loaded knowledge domains.
- `prism start --port 3180`: Run on a custom port.

---

## Used By

- [**prism-agent**](https://github.com/PRAFULREDDYM/prism-agent): A standalone terminal AI coding agent powered by Prism's knowledge routing.

---

## Contributing

We welcome contributions to the knowledge base and routing rules. See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to add:
- New intent rules to `rules/intents.json`.
- New filler patterns to `rules/fillers.json`.

---

## License

MIT — see [LICENSE](LICENSE).
