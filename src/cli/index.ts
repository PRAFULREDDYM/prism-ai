import chalk from "chalk";
import { Command } from "commander";
import { classifyIntent } from "../graph/IntentClassifier";
import { DEFAULT_KNOWLEDGE_GRAPH, listKnowledgeDomains, queryGraph } from "../graph/KnowledgeGraph";
import { buildContextFragment } from "../router/ContextInjector";
import { getConfig } from "../shared/config";
import { readSessionStats } from "../shared/stats";
import { startProxy } from "../proxy/ProxyServer";

function printBanner(port: number): void {
  console.log(chalk.green("◆ Prism v0.1.0"));
  console.log(chalk.dim(`Knowledge graph: ${listKnowledgeDomains().length} domains loaded`));
  console.log(chalk.green(`Proxy: http://localhost:${port}`));
  console.log("Route your Claude API calls here instead of api.anthropic.com");
  console.log(chalk.dim("Zero extra tokens. Zero extra API calls."));
}

async function fetchStatusFromProxy(port: number): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/stats`, {
      signal: AbortSignal.timeout(700)
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function showStatus(port: number): Promise<void> {
  const liveStats = await fetchStatusFromProxy(port);
  const stats = liveStats ?? (readSessionStats() as unknown as Record<string, unknown>);
  const intents = Array.isArray(stats.topIntents) ? stats.topIntents : [];

  console.log(chalk.green(`Prism status: ${liveStats ? "active" : "offline"}`));
  console.log(chalk.dim(`Port: ${port}`));
  console.log(`Requests processed: ${stats.requestsProcessed ?? 0}`);
  console.log(`Average tokens saved: ${Number(stats.averageTokensSaved ?? 0).toFixed(2)}`);
  console.log(`Average filler removed: ${Number(stats.averageFillerRemoved ?? 0).toFixed(2)}`);
  console.log(
    `Top intents: ${
      intents.length > 0
        ? intents
            .slice(0, 3)
            .map((item) => `${String((item as { intent: string }).intent)}(${String((item as { count: number }).count)})`)
            .join(", ")
        : "none yet"
    }`
  );
}

function showDryRun(prompt: string): void {
  const intent = classifyIntent(prompt);
  const domains = queryGraph(DEFAULT_KNOWLEDGE_GRAPH, prompt, intent.intent);
  const fragment = buildContextFragment(domains, intent, prompt);

  console.log(chalk.green("Prism dry run"));
  console.log(`Intent: ${intent.intent} (${intent.confidence})`);
  console.log(`Signals: ${intent.matchedSignals.join(", ") || "none"}`);
  console.log(`Domains: ${fragment.domains.join(", ")}`);
  console.log(`Token count: ${fragment.tokenCount}`);
  console.log(chalk.dim("Context fragment:"));
  console.log(fragment.fragment);
}

function showDomains(): void {
  console.log(chalk.green(`Prism domains (${listKnowledgeDomains().length})`));
  for (const domain of listKnowledgeDomains()) {
    console.log(`- ${domain.label} [${domain.id}]`);
  }
}

export function createProgram(): Command {
  const program = new Command();
  const config = getConfig();

  program.name("prism").description("Local deterministic semantic router for Claude").version("0.1.0");

  program
    .command("start")
    .description("start the proxy")
    .option("-p, --port <port>", "custom Prism port", String(config.port))
    .action((options: { port: string }) => {
      const port = Number(options.port);
      printBanner(port);
      startProxy(port);
    });

  program
    .command("status")
    .description("show current session stats")
    .option("-p, --port <port>", "Prism port", String(config.port))
    .action(async (options: { port: string }) => {
      await showStatus(Number(options.port));
    });

  program
    .command("test")
    .description("dry run a prompt through Prism")
    .argument("<prompt>", "prompt to classify and route")
    .action((prompt: string) => {
      showDryRun(prompt);
    });

  program
    .command("domains")
    .description("list all knowledge domains")
    .action(() => {
      showDomains();
    });

  return program;
}

const program = createProgram();
void program.parseAsync(process.argv);
