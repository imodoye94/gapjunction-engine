// packages/redactor-core/src/index.ts
// Core redaction utilities for sensitive data
export function redactText(text, rules) {
    return rules.reduce((result, rule) => {
        return result.replace(rule.pattern, rule.replacement);
    }, text);
}
export const DEFAULT_RULES = [
    { pattern: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, replacement: '[REDACTED-CARD]' },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
];
//# sourceMappingURL=index.js.map