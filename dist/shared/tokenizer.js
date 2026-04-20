"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenizeWords = tokenizeWords;
exports.stemWord = stemWord;
exports.tokenizeAndStem = tokenizeAndStem;
exports.countTokens = countTokens;
exports.normalizeWhitespace = normalizeWhitespace;
const natural_1 = __importDefault(require("natural"));
const tiktoken_1 = require("tiktoken");
const wordTokenizer = new natural_1.default.WordTokenizer();
const encoder = (0, tiktoken_1.get_encoding)("cl100k_base");
function requireEncoder() {
    if (!encoder) {
        throw new Error("Unable to initialize the cl100k_base tokenizer");
    }
    return encoder;
}
function tokenizeWords(input) {
    return (wordTokenizer.tokenize(input.toLowerCase()) ?? [])
        .map((token) => token.trim())
        .filter(Boolean);
}
function stemWord(token) {
    return natural_1.default.PorterStemmer.stem(token.toLowerCase());
}
function tokenizeAndStem(input) {
    return tokenizeWords(input).map(stemWord);
}
function countTokens(input) {
    return requireEncoder().encode(input).length;
}
function normalizeWhitespace(input) {
    return input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
//# sourceMappingURL=tokenizer.js.map