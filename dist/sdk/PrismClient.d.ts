import { type FillerRule } from "../enforcer/ResponseEnforcer";
import type { Intent, IntentRuleSet, KnowledgeDomainNode } from "../graph/types";
export interface PrismSendOptions {
    prompt: string;
    apiKey: string;
    model?: string;
    maxTokens?: number;
}
export interface PrismResponse {
    content: string;
    intent: Intent;
    domains: string[];
    tokensIn: number;
    tokensOut: number;
    fillerRemoved: number;
}
export interface PrismDryRun {
    intent: Intent;
    domains: string[];
    fragment: string;
    tokenCount: number;
}
export interface PrismConfigureOptions {
    rules?: IntentRuleSet;
    graphDomains?: KnowledgeDomainNode[];
    fillerPatterns?: FillerRule[];
}
export declare class PrismClient {
    private state;
    configure(options: PrismConfigureOptions): void;
    test(prompt: string): PrismDryRun;
    send(options: PrismSendOptions): Promise<PrismResponse>;
    private runPipeline;
}
export declare const prism: PrismClient;
