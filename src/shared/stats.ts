import fs from "node:fs";
import path from "node:path";
import { resolveProjectPath } from "./paths";

export type IntentName = "CODE" | "FACTUAL" | "CONCEPTUAL" | "DECISION" | "CREATIVE" | "DEBUG";

export interface RequestStatInput {
  intent: IntentName;
  domains: string[];
  tokensSaved: number;
  fillerRemoved: number;
}

export interface SessionStats {
  startedAt: string;
  requestsProcessed: number;
  totalTokensSaved: number;
  averageTokensSaved: number;
  averageFillerRemoved: number;
  totalFillerRemoved: number;
  topIntents: Array<{ intent: IntentName; count: number }>;
  lastDomains: string[];
}

const DEFAULT_STATS: SessionStats = {
  startedAt: new Date().toISOString(),
  requestsProcessed: 0,
  totalTokensSaved: 0,
  averageTokensSaved: 0,
  averageFillerRemoved: 0,
  totalFillerRemoved: 0,
  topIntents: [],
  lastDomains: []
};

function statsFilePath(): string {
  const configured = process.env.PRISM_STATS_FILE?.trim();
  if (!configured) {
    return resolveProjectPath(".prism-session.json");
  }

  return path.isAbsolute(configured) ? configured : resolveProjectPath(configured);
}

function intentMapFromStats(stats: SessionStats): Record<IntentName, number> {
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

function persistStats(stats: SessionStats): void {
  fs.writeFileSync(statsFilePath(), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}

export function resetSessionStats(): SessionStats {
  const freshStats: SessionStats = {
    ...DEFAULT_STATS,
    startedAt: new Date().toISOString()
  };
  persistStats(freshStats);
  return freshStats;
}

export function readSessionStats(): SessionStats {
  const targetPath = statsFilePath();
  if (!fs.existsSync(targetPath)) {
    return resetSessionStats();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as SessionStats;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      topIntents: parsed.topIntents ?? []
    };
  } catch {
    return resetSessionStats();
  }
}

export function recordRequestStat(input: RequestStatInput): SessionStats {
  const existing = readSessionStats();
  const intentCounts = intentMapFromStats(existing);
  intentCounts[input.intent] += 1;

  const requestsProcessed = existing.requestsProcessed + 1;
  const totalTokensSaved = existing.totalTokensSaved + input.tokensSaved;
  const totalFillerRemoved = existing.totalFillerRemoved + input.fillerRemoved;

  const updated: SessionStats = {
    ...existing,
    requestsProcessed,
    totalTokensSaved,
    totalFillerRemoved,
    averageTokensSaved: requestsProcessed === 0 ? 0 : totalTokensSaved / requestsProcessed,
    averageFillerRemoved: requestsProcessed === 0 ? 0 : totalFillerRemoved / requestsProcessed,
    lastDomains: input.domains,
    topIntents: (Object.entries(intentCounts) as Array<[IntentName, number]>)
      .map(([intent, count]) => ({ intent, count }))
      .sort((left, right) => right.count - left.count)
  };

  persistStats(updated);
  return updated;
}
