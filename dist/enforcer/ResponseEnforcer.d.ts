export interface FillerRule {
    pattern: string;
    label: string;
    type: "prefix" | "suffix" | "inline";
}
export interface EnforcedResponse {
    cleaned: string;
    tokensBefore: number;
    tokensAfter: number;
    reductions: number;
}
export declare function getFillerRules(): FillerRule[];
export declare function enforceResponse(raw: string, rules?: FillerRule[]): EnforcedResponse;
