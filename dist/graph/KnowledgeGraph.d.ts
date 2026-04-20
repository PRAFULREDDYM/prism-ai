import type { GraphResult, Intent, KnowledgeDomainNode, KnowledgeGraph } from "./types";
export declare function buildGraph(nodes?: KnowledgeDomainNode[]): KnowledgeGraph;
export declare function queryGraph(graph: KnowledgeGraph, prompt: string, intent: Intent): GraphResult[];
export declare function listKnowledgeDomains(): KnowledgeDomainNode[];
export declare const DEFAULT_KNOWLEDGE_GRAPH: KnowledgeGraph;
