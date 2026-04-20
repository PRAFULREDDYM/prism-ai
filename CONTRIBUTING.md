# Contributing to Prism AI

Thank you for your interest in contributing to Prism! This project thrives on community-driven semantic routing rules.

## How to Contribute Rules

The core of Prism's intelligence lies in two JSON files located in the `rules/` directory. These are the primary files you should contribute to.

### 1. Intent Rules (`rules/intents.json`)

Intents define how Prism routes incoming prompts. Each intent has a `threshold`, `keywords`, and `patterns` (regex).

- **Keywords**: Token-based matching. Increases the score for the intent if found.
- **Patterns**: Regular expression matching. Significantly boosts the score for the intent.
- **Threshold**: The minimum score required for a prompt to be classified under this intent.

**Example addition:**
```json
"DEBUG": {
  "threshold": 2.7,
  "keywords": ["error", "failing", "broken"],
  "patterns": ["\\bnot working\\b", "\\berror\\b"]
}
```

### 2. Filler Patterns (`rules/fillers.json`)

Fillers are common phrases used by LLMs that don't add semantic value to the routing but help identify the "persona" or "style" of the response. These are used to "clean" the prompt or response for better indexing.

- **Types**: `prefix`, `suffix`, or `inline`.
- **Label**: An optional category for the filler (e.g., `reason`, `note`, `context`).

**Example addition:**
```json
{ "pattern": "^\\s*sure!?\\s*", "label": "", "type": "prefix" }
```

## Pull Request Process

1. **Fork the repo** and create your branch from `main`.
2. **Add your rules** to `rules/intents.json` or `rules/fillers.json`.
3. **Test your rules** locally using `npm run dry-run` to see how they impact routing:
   ```bash
   npm run dry-run "Your test prompt here"
   ```
4. **Submit a Pull Request** with a clear description of why the new rules are needed and examples of prompts they improve.

## Development Setup

```bash
npm install
npm run build
npm test
```

We look forward to your contributions!
