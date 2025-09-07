// packages/redactor-core/src/index.ts
// Core redaction utilities for sensitive data

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
}

export function redactText(text: string, rules: RedactionRule[]): string {
  return rules.reduce((result, rule) => {
    return result.replace(rule.pattern, rule.replacement);
  }, text);
}

export const DEFAULT_RULES: RedactionRule[] = [
  { pattern: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, replacement: '[REDACTED-CARD]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
];