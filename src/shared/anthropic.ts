export interface AnthropicTextBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface AnthropicMessage {
  role: string;
  content: string | AnthropicTextBlock[];
}

function isTextBlock(block: unknown): block is AnthropicTextBlock {
  return Boolean(block) && typeof block === "object" && (block as AnthropicTextBlock).type === "text";
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(isTextBlock)
      .map((block) => block.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
}

export function extractLastUserPrompt(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? (body.messages as AnthropicMessage[]) : [];
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return lastUserMessage ? contentToText(lastUserMessage.content) : "";
}

export function prependSystemPrompt(body: Record<string, unknown>, fragment: string): Record<string, unknown> {
  const cloned = structuredClone(body);
  const existing = cloned.system;

  if (typeof existing === "string" && existing.trim().length > 0) {
    cloned.system = `${fragment}\n\n${existing}`;
    return cloned;
  }

  if (Array.isArray(existing)) {
    cloned.system = [{ type: "text", text: fragment }, ...existing];
    return cloned;
  }

  cloned.system = fragment;
  return cloned;
}

export function replaceAssistantContent(responseBody: Record<string, unknown>, cleanedText: string): Record<string, unknown> {
  const cloned = structuredClone(responseBody);
  const content = cloned.content;

  if (typeof content === "string") {
    cloned.content = cleanedText;
    return cloned;
  }

  if (Array.isArray(content)) {
    let inserted = false;
    cloned.content = content.flatMap((block) => {
      if (!isTextBlock(block)) {
        return [block];
      }

      if (inserted) {
        return [];
      }

      inserted = true;
      return [{ ...block, text: cleanedText }];
    });

    if (!inserted) {
      cloned.content = [{ type: "text", text: cleanedText }, ...content];
    }

    return cloned;
  }

  cloned.content = [{ type: "text", text: cleanedText }];
  return cloned;
}

export function copyRequestHeaders(headers: Record<string, unknown>): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) {
      continue;
    }

    const lowerKey = key.toLowerCase();
    if (["host", "content-length", "connection", "accept-encoding"].includes(lowerKey)) {
      continue;
    }

    forwarded[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  return forwarded;
}

export function copyResponseHeaders(headers: Headers): Record<string, string> {
  const forwarded: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (["content-length", "connection", "transfer-encoding", "content-encoding"].includes(key.toLowerCase())) {
      return;
    }

    forwarded[key] = value;
  });
  return forwarded;
}

export interface ParsedSseEvent {
  event: string;
  data: string;
}

export function parseSsePayload(payload: string): ParsedSseEvent[] {
  return payload
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:")) ?? "event: message";
      const dataLines = lines.filter((line) => line.startsWith("data:")).map((line) => line.replace(/^data:\s?/, ""));
      return {
        event: eventLine.replace(/^event:\s?/, ""),
        data: dataLines.join("\n")
      };
    });
}

export function extractTextFromSse(events: ParsedSseEvent[]): string {
  let text = "";

  for (const event of events) {
    if (!event.data || event.data === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(event.data) as Record<string, unknown>;
      if (event.event === "content_block_start") {
        const contentBlock = parsed.content_block as AnthropicTextBlock | undefined;
        if (contentBlock?.type === "text" && contentBlock.text) {
          text += contentBlock.text;
        }
      }

      if (event.event === "content_block_delta") {
        const delta = parsed.delta as AnthropicTextBlock | undefined;
        if (delta?.type === "text_delta" && delta.text) {
          text += delta.text;
        }
      }
    } catch {
      continue;
    }
  }

  return text;
}

export function buildAnthropicSse(cleanedText: string, upstreamEvents: ParsedSseEvent[]): string {
  const messageStart =
    upstreamEvents.find((event) => event.event === "message_start")?.data ??
    JSON.stringify({
      type: "message_start",
      message: {
        id: `msg_prism_${Date.now()}`,
        type: "message",
        role: "assistant",
        model: "claude",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    });
  const messageDelta =
    upstreamEvents.find((event) => event.event === "message_delta")?.data ??
    JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 0 }
    });

  const chunks = cleanedText.match(/.{1,240}|\n+/gs) ?? [cleanedText];
  const parts: string[] = [];

  parts.push(`event: message_start\ndata: ${messageStart}\n\n`);
  parts.push(`event: content_block_start\ndata: ${JSON.stringify({ index: 0, content_block: { type: "text", text: "" } })}\n\n`);

  for (const chunk of chunks) {
    parts.push(
      `event: content_block_delta\ndata: ${JSON.stringify({
        index: 0,
        delta: { type: "text_delta", text: chunk }
      })}\n\n`
    );
  }

  parts.push(`event: content_block_stop\ndata: ${JSON.stringify({ index: 0 })}\n\n`);
  parts.push(`event: message_delta\ndata: ${messageDelta}\n\n`);
  parts.push("event: message_stop\ndata: {}\n\n");

  return parts.join("");
}
