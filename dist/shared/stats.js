"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSessionStats = resetSessionStats;
exports.readSessionStats = readSessionStats;
exports.recordRequestStat = recordRequestStat;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("./paths");
const DEFAULT_STATS = {
    startedAt: new Date().toISOString(),
    requestsProcessed: 0,
    totalTokensSaved: 0,
    averageTokensSaved: 0,
    averageFillerRemoved: 0,
    totalFillerRemoved: 0,
    topIntents: [],
    lastDomains: []
};
function statsFilePath() {
    const configured = process.env.PRISM_STATS_FILE?.trim();
    if (!configured) {
        return (0, paths_1.resolveProjectPath)(".prism-session.json");
    }
    return node_path_1.default.isAbsolute(configured) ? configured : (0, paths_1.resolveProjectPath)(configured);
}
function intentMapFromStats(stats) {
    const base = {
        CODE: 0,
        FACTUAL: 0,
        CONCEPTUAL: 0,
        DECISION: 0,
        CREATIVE: 0,
        DEBUG: 0
    };
    for (const item of stats.topIntents) {
        base[item.intent] = item.count;
    }
    return base;
}
function persistStats(stats) {
    node_fs_1.default.writeFileSync(statsFilePath(), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}
function resetSessionStats() {
    const freshStats = {
        ...DEFAULT_STATS,
        startedAt: new Date().toISOString()
    };
    persistStats(freshStats);
    return freshStats;
}
function readSessionStats() {
    const targetPath = statsFilePath();
    if (!node_fs_1.default.existsSync(targetPath)) {
        return resetSessionStats();
    }
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(targetPath, "utf8"));
        return {
            ...DEFAULT_STATS,
            ...parsed,
            topIntents: parsed.topIntents ?? []
        };
    }
    catch {
        return resetSessionStats();
    }
}
function recordRequestStat(input) {
    const existing = readSessionStats();
    const intentCounts = intentMapFromStats(existing);
    intentCounts[input.intent] += 1;
    const requestsProcessed = existing.requestsProcessed + 1;
    const totalTokensSaved = existing.totalTokensSaved + input.tokensSaved;
    const totalFillerRemoved = existing.totalFillerRemoved + input.fillerRemoved;
    const updated = {
        ...existing,
        requestsProcessed,
        totalTokensSaved,
        totalFillerRemoved,
        averageTokensSaved: requestsProcessed === 0 ? 0 : totalTokensSaved / requestsProcessed,
        averageFillerRemoved: requestsProcessed === 0 ? 0 : totalFillerRemoved / requestsProcessed,
        lastDomains: input.domains,
        topIntents: Object.entries(intentCounts)
            .map(([intent, count]) => ({ intent, count }))
            .sort((left, right) => right.count - left.count)
    };
    persistStats(updated);
    return updated;
}
//# sourceMappingURL=stats.js.map