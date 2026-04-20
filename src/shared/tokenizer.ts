import natural from "natural";
import { Tiktoken, get_encoding } from "tiktoken";

const wordTokenizer = new natural.WordTokenizer();
const encoder = get_encoding("cl100k_base");

function requireEncoder(): Tiktoken {
  if (!encoder) {
    throw new Error("Unable to initialize the cl100k_base tokenizer");
  }

  return encoder;
}

export function tokenizeWords(input: string): string[] {
  return (wordTokenizer.tokenize(input.toLowerCase()) ?? [])
    .map((token) => token.trim())
    .filter(Boolean);
}

export function stemWord(token: string): string {
  return natural.PorterStemmer.stem(token.toLowerCase());
}

export function tokenizeAndStem(input: string): string[] {
  return tokenizeWords(input).map(stemWord);
}

export function countTokens(input: string): number {
  return requireEncoder().encode(input).length;
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
