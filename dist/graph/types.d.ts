import type { IntentName } from "../shared/stats";
export type Intent = IntentName;
export interface IntentRule {
    keywords: string[];
    patterns: string[];
    threshold: number;
}
export interface IntentRuleSet {
    defaultIntent: Intent;
    intents: Record<Intent, IntentRule>;
}
export interface IntentResult {
    intent: Intent;
    confidence: number;
    matchedSignals: string[];
}
export interface KnowledgeDomainNode {
    id: string;
    label: string;
    keywords: string[];
    related_domains: string[];
    intent_affinity: Intent[];
}
export interface GraphDocument {
    node: KnowledgeDomainNode;
    tokens: string[];
    termFrequency: Map<string, number>;
    length: number;
}
export interface KnowledgeGraph {
    nodes: KnowledgeDomainNode[];
    documents: GraphDocument[];
    documentFrequency: Map<string, number>;
    nodeById: Map<string, KnowledgeDomainNode>;
    averageDocumentLength: number;
}
export interface GraphResult {
    id: string;
    label: string;
    score: number;
    source: "primary" | "related";
    relatedTo?: string;
}
export interface ContextFragmentResult {
    fragment: string;
    tokenCount: number;
    domains: string[];
}
