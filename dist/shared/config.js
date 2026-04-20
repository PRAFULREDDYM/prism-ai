"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getConfig(overrides = {}) {
    return {
        port: overrides.port ?? Number(process.env.PRISM_PORT ?? 3179),
        anthropicBaseUrl: overrides.anthropicBaseUrl ?? (process.env.PRISM_ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com")
    };
}
//# sourceMappingURL=config.js.map