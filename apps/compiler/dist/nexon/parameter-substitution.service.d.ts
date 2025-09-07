import { ParamValue } from '@gj/ir-schema';
import { SubstitutionContext, SubstitutionResult, NexonParameter } from './types';
/**
 * Service for parameter substitution in Nexon templates
 * Handles JSON literals, expressions, and secretRef values
 */
export declare class ParameterSubstitutionService {
    private readonly logger;
    /**
     * Substitute parameters in a template object
     */
    substituteParameters(template: any, context: SubstitutionContext, parameterDefinitions?: Record<string, NexonParameter>): Promise<SubstitutionResult>;
    /**
     * Substitute a single parameter value
     */
    substituteParameter(paramName: string, paramValue: ParamValue, context: SubstitutionContext, paramDefinition?: NexonParameter): Promise<SubstitutionResult>;
    /**
     * Recursively substitute values in any data structure
     */
    private substituteValue;
    /**
     * Substitute parameters in an array
     */
    private substituteArray;
    /**
     * Substitute parameters in an object
     */
    private substituteObject;
    /**
     * Handle secret reference tokens (without expansion)
     */
    private handleSecretRef;
    /**
     * Handle expression tokens
     */
    private handleExpression;
    /**
     * Evaluate a simple expression
     * This is a basic implementation - in production, you might want to use a more robust expression engine
     */
    private evaluateExpression;
    /**
     * Evaluate simple JSONPath expressions
     */
    private evaluateJsonPath;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Convert ParamValue objects to plain values for expression context
     */
    private convertParamValues;
    /**
     * Validate parameter against its definition
     */
    private validateParameter;
    /**
     * Validate value against constraints
     */
    private validateConstraints;
    /**
     * Get the type of a value
     */
    private getValueType;
    /**
     * Check if value is a SecretRefToken
     */
    private isSecretRefToken;
    /**
     * Check if value is an ExpressionToken
     */
    private isExpressionToken;
    /**
     * Handle template string interpolation (e.g., "{{params.url}}")
     */
    private handleTemplateString;
    /**
     * Evaluate template expressions like "params.url", "stage.title", etc.
     */
    private evaluateTemplateExpression;
    /**
     * Evaluate conditional expressions like "params.apiKey ? 'bearer' : ''" or "params.method || 'GET'"
     */
    private evaluateConditionalExpression;
    /**
     * Evaluate JSON.stringify expressions
     */
    private evaluateJsonStringify;
    /**
     * Convert string values to appropriate types
     */
    private convertStringValue;
}
//# sourceMappingURL=parameter-substitution.service.d.ts.map