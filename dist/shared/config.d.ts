export interface PrismConfig {
    port: number;
    anthropicBaseUrl: string;
}
export declare function getConfig(overrides?: Partial<PrismConfig>): PrismConfig;
