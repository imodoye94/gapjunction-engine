export interface RedactionRule {
    pattern: RegExp;
    replacement: string;
}
export declare function redactText(text: string, rules: RedactionRule[]): string;
export declare const DEFAULT_RULES: RedactionRule[];
//# sourceMappingURL=index.d.ts.map