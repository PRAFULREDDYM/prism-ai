"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgram = createProgram;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const IntentClassifier_1 = require("../graph/IntentClassifier");
const KnowledgeGraph_1 = require("../graph/KnowledgeGraph");
const ContextInjector_1 = require("../router/ContextInjector");
const config_1 = require("../shared/config");
const stats_1 = require("../shared/stats");
const ProxyServer_1 = require("../proxy/ProxyServer");
function printBanner(port) {
    console.log(chalk_1.default.green("◆ Prism v0.1.0"));
    console.log(chalk_1.default.dim(`Knowledge graph: ${(0, KnowledgeGraph_1.listKnowledgeDomains)().length} domains loaded`));
    console.log(chalk_1.default.green(`Proxy: http://localhost:${port}`));
    console.log("Route your Claude API calls here instead of api.anthropic.com");
    console.log(chalk_1.default.dim("Zero extra tokens. Zero extra API calls."));
}
async function fetchStatusFromProxy(port) {
    try {
        const response = await fetch(`http://127.0.0.1:${port}/stats`, {
            signal: AbortSignal.timeout(700)
        });
        if (!response.ok) {
            return null;
        }
        return (await response.json());
    }
    catch {
        return null;
    }
}
async function showStatus(port) {
    const liveStats = await fetchStatusFromProxy(port);
    const stats = liveStats ?? (0, stats_1.readSessionStats)();
    const intents = Array.isArray(stats.topIntents) ? stats.topIntents : [];
    console.log(chalk_1.default.green(`Prism status: ${liveStats ? "active" : "offline"}`));
    console.log(chalk_1.default.dim(`Port: ${port}`));
    console.log(`Requests processed: ${stats.requestsProcessed ?? 0}`);
    console.log(`Average tokens saved: ${Number(stats.averageTokensSaved ?? 0).toFixed(2)}`);
    console.log(`Average filler removed: ${Number(stats.averageFillerRemoved ?? 0).toFixed(2)}`);
    console.log(`Top intents: ${intents.length > 0
        ? intents
            .slice(0, 3)
            .map((item) => `${String(item.intent)}(${String(item.count)})`)
            .join(", ")
        : "none yet"}`);
}
function showDryRun(prompt) {
    const intent = (0, IntentClassifier_1.classifyIntent)(prompt);
    const domains = (0, KnowledgeGraph_1.queryGraph)(KnowledgeGraph_1.DEFAULT_KNOWLEDGE_GRAPH, prompt, intent.intent);
    const fragment = (0, ContextInjector_1.buildContextFragment)(domains, intent, prompt);
    console.log(chalk_1.default.green("Prism dry run"));
    console.log(`Intent: ${intent.intent} (${intent.confidence})`);
    console.log(`Signals: ${intent.matchedSignals.join(", ") || "none"}`);
    console.log(`Domains: ${fragment.domains.join(", ")}`);
    console.log(`Token count: ${fragment.tokenCount}`);
    console.log(chalk_1.default.dim("Context fragment:"));
    console.log(fragment.fragment);
}
function showDomains() {
    console.log(chalk_1.default.green(`Prism domains (${(0, KnowledgeGraph_1.listKnowledgeDomains)().length})`));
    for (const domain of (0, KnowledgeGraph_1.listKnowledgeDomains)()) {
        console.log(`- ${domain.label} [${domain.id}]`);
    }
}
function createProgram() {
    const program = new commander_1.Command();
    const config = (0, config_1.getConfig)();
    program.name("prism").description("Local deterministic semantic router for Claude").version("0.1.0");
    program
        .command("start")
        .description("start the proxy")
        .option("-p, --port <port>", "custom Prism port", String(config.port))
        .action((options) => {
        const port = Number(options.port);
        printBanner(port);
        (0, ProxyServer_1.startProxy)(port);
    });
    program
        .command("status")
        .description("show current session stats")
        .option("-p, --port <port>", "Prism port", String(config.port))
        .action(async (options) => {
        await showStatus(Number(options.port));
    });
    program
        .command("test")
        .description("dry run a prompt through Prism")
        .argument("<prompt>", "prompt to classify and route")
        .action((prompt) => {
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
//# sourceMappingURL=index.js.map