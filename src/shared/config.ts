import dotenv from "dotenv";

dotenv.config();

export interface PrismConfig {
  port: number;
  anthropicBaseUrl: string;
}

export function getConfig(overrides: Partial<PrismConfig> = {}): PrismConfig {
  return {
    port: overrides.port ?? Number(process.env.PRISM_PORT ?? 3179),
    anthropicBaseUrl: overrides.anthropicBaseUrl ?? (process.env.PRISM_ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com")
  };
}
