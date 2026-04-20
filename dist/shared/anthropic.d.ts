export interface AnthropicTextBlock {
    type: string;
    text?: string;
    [key: string]: unknown;
}
export interface AnthropicMessage {
    role: string;
    content: string | AnthropicTextBlock[];
}
export declare function contentToText(content: unknown): string;
export declare function extractLastUserPrompt(body: Record<string, unknown>): string;
export declare function prependSystemPrompt(body: Record<string, unknown>, fragment: string): Record<string, unknown>;
export declare function replaceAssistantContent(responseBody: Record<string, unknown>, cleanedText: string): Record<string, unknown>;
export declare function copyRequestHeaders(headers: Record<string, unknown>): Record<string, string>;
export declare function copyResponseHeaders(headers: Headers): Record<string, string>;
export interface ParsedSseEvent {
    event: string;
    data: string;
}
export declare function parseSsePayload(payload: string): ParsedSseEvent[];
export declare function extractTextFromSse(events: ParsedSseEvent[]): string;
export declare function buildAnthropicSse(cleanedText: string, upstreamEvents: ParsedSseEvent[]): string;
