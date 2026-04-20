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
    topIntents: Array<{
        intent: IntentName;
        count: number;
    }>;
    lastDomains: string[];
}
export declare function resetSessionStats(): SessionStats;
export declare function readSessionStats(): SessionStats;
export declare function recordRequestStat(input: RequestStatInput): SessionStats;
