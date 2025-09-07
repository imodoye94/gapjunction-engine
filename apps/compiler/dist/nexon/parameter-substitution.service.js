import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
/**
 * Service for parameter substitution in Nexon templates
 * Handles JSON literals, expressions, and secretRef values
 */
let ParameterSubstitutionService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ParameterSubstitutionService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ParameterSubstitutionService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new Logger(ParameterSubstitutionService.name);
        /**
         * Substitute parameters in a template object
         */
        async substituteParameters(template, context, parameterDefinitions) {
            this.logger.debug('Starting parameter substitution', {
                stageId: context.stage.id,
                parameterCount: Object.keys(context.parameters).length
            });
            try {
                const result = await this.substituteValue(template, context, parameterDefinitions);
                this.logger.debug('Parameter substitution completed', {
                    stageId: context.stage.id,
                    success: result.success
                });
                return result;
            }
            catch (error) {
                this.logger.error('Parameter substitution failed', error, {
                    stageId: context.stage.id
                });
                return {
                    success: false,
                    errors: [`Parameter substitution error: ${error.message}`]
                };
            }
        }
        /**
         * Substitute a single parameter value
         */
        async substituteParameter(paramName, paramValue, context, paramDefinition) {
            this.logger.debug('Substituting parameter', { paramName, stageId: context.stage.id });
            try {
                // Validate parameter if definition is provided
                if (paramDefinition) {
                    const validation = this.validateParameter(paramValue, paramDefinition);
                    if (!validation.success) {
                        return validation;
                    }
                }
                const result = await this.substituteValue(paramValue, context);
                this.logger.debug('Parameter substitution completed', {
                    paramName,
                    stageId: context.stage.id,
                    success: result.success
                });
                return result;
            }
            catch (error) {
                this.logger.error('Parameter substitution failed', error, {
                    paramName,
                    stageId: context.stage.id
                });
                return {
                    success: false,
                    errors: [`Parameter '${paramName}' substitution error: ${error.message}`]
                };
            }
        }
        /**
         * Recursively substitute values in any data structure
         */
        async substituteValue(value, context, parameterDefinitions, visited = new Set()) {
            // Handle null/undefined
            if (value === null || value === undefined) {
                return { success: true, value };
            }
            // Prevent circular references
            if (typeof value === 'object' && visited.has(value)) {
                return { success: true, value };
            }
            // Handle SecretRefToken
            if (this.isSecretRefToken(value)) {
                return this.handleSecretRef(value, context);
            }
            // Handle ExpressionToken
            if (this.isExpressionToken(value)) {
                return this.handleExpression(value, context);
            }
            // Handle arrays
            if (Array.isArray(value)) {
                visited.add(value);
                const result = await this.substituteArray(value, context, parameterDefinitions, visited);
                visited.delete(value);
                return result;
            }
            // Handle objects
            if (typeof value === 'object') {
                visited.add(value);
                const result = await this.substituteObject(value, context, parameterDefinitions, visited);
                visited.delete(value);
                return result;
            }
            // Handle string template interpolation (e.g., "{{params.url}}")
            if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
                return this.handleTemplateString(value, context);
            }
            // Handle primitive values (string, number, boolean)
            return { success: true, value };
        }
        /**
         * Substitute parameters in an array
         */
        async substituteArray(array, context, parameterDefinitions, visited = new Set()) {
            const substitutedArray = [];
            const errors = [];
            const warnings = [];
            for (let i = 0; i < array.length; i++) {
                const result = await this.substituteValue(array[i], context, parameterDefinitions, visited);
                if (result.success) {
                    substitutedArray.push(result.value);
                    if (result.warnings) {
                        warnings.push(...result.warnings);
                    }
                }
                else {
                    errors.push(`Array index ${i}: ${result.errors?.join(', ')}`);
                }
            }
            return {
                success: errors.length === 0,
                value: substitutedArray,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        /**
         * Substitute parameters in an object
         */
        async substituteObject(obj, context, parameterDefinitions, visited = new Set()) {
            const substitutedObj = {};
            const errors = [];
            const warnings = [];
            for (const [key, value] of Object.entries(obj)) {
                const result = await this.substituteValue(value, context, parameterDefinitions, visited);
                if (result.success) {
                    substitutedObj[key] = result.value;
                    if (result.warnings) {
                        warnings.push(...result.warnings);
                    }
                }
                else {
                    errors.push(`Property '${key}': ${result.errors?.join(', ')}`);
                }
            }
            return {
                success: errors.length === 0,
                value: substitutedObj,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        /**
         * Handle secret reference tokens (without expansion)
         */
        handleSecretRef(token, context) {
            this.logger.debug('Processing secret reference', {
                ref: token.secret.ref,
                stageId: context.stage.id
            });
            // For now, we just pass through the secret reference without expansion
            // The actual secret resolution will be handled by the runtime environment
            return {
                success: true,
                value: token,
                warnings: [`Secret reference '${token.secret.ref}' will be resolved at runtime`]
            };
        }
        /**
         * Handle expression tokens
         */
        async handleExpression(token, context) {
            this.logger.debug('Processing expression', {
                expression: token.expression,
                stageId: context.stage.id
            });
            try {
                const expressionContext = {
                    params: this.convertParamValues(context.parameters),
                    channel: context.channel,
                    env: process.env
                };
                const result = await this.evaluateExpression(token.expression, expressionContext);
                if (result.success) {
                    return {
                        success: true,
                        value: result.value
                    };
                }
                else {
                    return {
                        success: false,
                        errors: [`Expression evaluation failed: ${result.error}`]
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    errors: [`Expression processing error: ${error.message}`]
                };
            }
        }
        /**
         * Evaluate a simple expression
         * This is a basic implementation - in production, you might want to use a more robust expression engine
         */
        async evaluateExpression(expression, context) {
            try {
                // Handle simple JSONPath-like expressions
                if (expression.startsWith('$.')) {
                    return this.evaluateJsonPath(expression, context);
                }
                // Handle parameter references
                if (expression.startsWith('params.')) {
                    const paramPath = expression.substring(7); // Remove 'params.'
                    const value = this.getNestedValue(context.params, paramPath);
                    return { success: true, value };
                }
                // Handle channel references
                if (expression.startsWith('channel.')) {
                    const channelPath = expression.substring(8); // Remove 'channel.'
                    const value = this.getNestedValue(context.channel, channelPath);
                    return { success: true, value };
                }
                // Handle environment variables
                if (expression.startsWith('env.')) {
                    const envVar = expression.substring(4); // Remove 'env.'
                    const value = context.env?.[envVar];
                    return { success: true, value };
                }
                // For now, return the expression as-is for unsupported formats
                return {
                    success: false,
                    error: `Unsupported expression format: ${expression}`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Expression evaluation error: ${error.message}`
                };
            }
        }
        /**
         * Evaluate simple JSONPath expressions
         */
        evaluateJsonPath(expression, context) {
            try {
                // Simple implementation for basic JSONPath
                // In production, consider using a proper JSONPath library
                if (expression === '$.payload') {
                    return { success: true, value: context.payload };
                }
                // Handle nested payload access like $.payload.field
                if (expression.startsWith('$.payload.')) {
                    const path = expression.substring(10); // Remove '$.payload.'
                    const value = this.getNestedValue(context.payload, path);
                    return { success: true, value };
                }
                return {
                    success: false,
                    error: `Unsupported JSONPath expression: ${expression}`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `JSONPath evaluation error: ${error.message}`
                };
            }
        }
        /**
         * Get nested value from object using dot notation
         */
        getNestedValue(obj, path) {
            if (!obj || !path)
                return undefined;
            return path.split('.').reduce((current, key) => {
                return current && current[key] !== undefined ? current[key] : undefined;
            }, obj);
        }
        /**
         * Convert ParamValue objects to plain values for expression context
         */
        convertParamValues(parameters) {
            const converted = {};
            for (const [key, value] of Object.entries(parameters)) {
                if (this.isSecretRefToken(value) || this.isExpressionToken(value)) {
                    // Keep tokens as-is for now
                    converted[key] = value;
                }
                else {
                    converted[key] = value;
                }
            }
            return converted;
        }
        /**
         * Validate parameter against its definition
         */
        validateParameter(value, definition) {
            const errors = [];
            // Check required parameters
            if (definition.required && (value === null || value === undefined)) {
                errors.push('Parameter is required but not provided');
            }
            // Type checking for non-token values
            if (value !== null && value !== undefined &&
                !this.isSecretRefToken(value) && !this.isExpressionToken(value)) {
                const actualType = this.getValueType(value);
                if (definition.type !== actualType && definition.type !== 'object') {
                    errors.push(`Expected type '${definition.type}' but got '${actualType}'`);
                }
                // Validation constraints
                if (definition.validation) {
                    const validationErrors = this.validateConstraints(value, definition.validation);
                    errors.push(...validationErrors);
                }
            }
            return {
                success: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        /**
         * Validate value against constraints
         */
        validateConstraints(value, validation) {
            const errors = [];
            // Number constraints
            if (typeof value === 'number') {
                if (validation.min !== undefined && value < validation.min) {
                    errors.push(`Value ${value} is less than minimum ${validation.min}`);
                }
                if (validation.max !== undefined && value > validation.max) {
                    errors.push(`Value ${value} is greater than maximum ${validation.max}`);
                }
            }
            // String constraints
            if (typeof value === 'string') {
                if (validation.minLength !== undefined && value.length < validation.minLength) {
                    errors.push(`String length ${value.length} is less than minimum ${validation.minLength}`);
                }
                if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                    errors.push(`String length ${value.length} is greater than maximum ${validation.maxLength}`);
                }
                if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                    errors.push(`String does not match pattern ${validation.pattern}`);
                }
            }
            // Array constraints
            if (Array.isArray(value)) {
                if (validation.minLength !== undefined && value.length < validation.minLength) {
                    errors.push(`Array length ${value.length} is less than minimum ${validation.minLength}`);
                }
                if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                    errors.push(`Array length ${value.length} is greater than maximum ${validation.maxLength}`);
                }
            }
            // Enum constraints
            if (validation.enum && !validation.enum.includes(value)) {
                errors.push(`Value is not one of allowed values: ${validation.enum.join(', ')}`);
            }
            return errors;
        }
        /**
         * Get the type of a value
         */
        getValueType(value) {
            if (Array.isArray(value))
                return 'array';
            if (value === null)
                return 'null';
            return typeof value;
        }
        /**
         * Check if value is a SecretRefToken
         */
        isSecretRefToken(value) {
            return value && typeof value === 'object' && 'secret' in value &&
                value.secret && typeof value.secret === 'object' &&
                value.secret.type === 'secretRef' && typeof value.secret.ref === 'string';
        }
        /**
         * Check if value is an ExpressionToken
         */
        isExpressionToken(value) {
            return value && typeof value === 'object' && 'expression' in value &&
                typeof value.expression === 'string';
        }
        /**
         * Handle template string interpolation (e.g., "{{params.url}}")
         */
        handleTemplateString(template, context) {
            try {
                let result = template;
                const warnings = [];
                // Find all template expressions in the string
                const templateRegex = /\{\{([^}]+)\}\}/g;
                let match;
                while ((match = templateRegex.exec(template)) !== null) {
                    const expression = match[1].trim();
                    const fullMatch = match[0];
                    // Evaluate the expression
                    const expressionResult = this.evaluateTemplateExpression(expression, context);
                    if (expressionResult.success) {
                        // Replace the template expression with the evaluated value
                        const replacement = expressionResult.value !== undefined ?
                            String(expressionResult.value) : '';
                        result = result.replace(fullMatch, replacement);
                    }
                    else {
                        // If evaluation fails, keep the original template expression
                        warnings.push(`Failed to evaluate template expression '${expression}': ${expressionResult.error}`);
                    }
                }
                // Try to parse the result as JSON if it looks like a JSON structure
                if (result.startsWith('{') || result.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(result);
                        return {
                            success: true,
                            value: parsed,
                            warnings: warnings.length > 0 ? warnings : undefined
                        };
                    }
                    catch {
                        // If JSON parsing fails, return as string
                    }
                }
                // Try to convert to appropriate type
                const convertedValue = this.convertStringValue(result);
                return {
                    success: true,
                    value: convertedValue,
                    warnings: warnings.length > 0 ? warnings : undefined
                };
            }
            catch (error) {
                return {
                    success: false,
                    errors: [`Template string processing error: ${error.message}`]
                };
            }
        }
        /**
         * Evaluate template expressions like "params.url", "stage.title", etc.
         */
        evaluateTemplateExpression(expression, context) {
            try {
                // Handle parameter references
                if (expression.startsWith('params.')) {
                    const paramPath = expression.substring(7); // Remove 'params.'
                    const value = this.getNestedValue(context.parameters, paramPath);
                    return { success: true, value };
                }
                // Handle stage references
                if (expression.startsWith('stage.')) {
                    const stagePath = expression.substring(6); // Remove 'stage.'
                    const value = this.getNestedValue(context.stage, stagePath);
                    return { success: true, value };
                }
                // Handle channel references
                if (expression.startsWith('channel.')) {
                    const channelPath = expression.substring(8); // Remove 'channel.'
                    const value = this.getNestedValue(context.channel, channelPath);
                    return { success: true, value };
                }
                // Handle runtime references
                if (expression.startsWith('runtime.')) {
                    const runtimePath = expression.substring(8); // Remove 'runtime.'
                    const value = this.getNestedValue(context.runtime, runtimePath);
                    return { success: true, value };
                }
                // Handle environment variables
                if (expression.startsWith('env.')) {
                    const envVar = expression.substring(4); // Remove 'env.'
                    const value = process.env[envVar];
                    return { success: true, value };
                }
                // Handle simple parameter names (fallback)
                if (context.parameters[expression] !== undefined) {
                    return { success: true, value: context.parameters[expression] };
                }
                // Handle conditional expressions like "params.apiKey ? 'bearer' : ''" or "params.method || 'GET'"
                if ((expression.includes('?') && expression.includes(':')) || expression.includes('||')) {
                    return this.evaluateConditionalExpression(expression, context);
                }
                // Handle JSON.stringify calls
                if (expression.startsWith('JSON.stringify(')) {
                    return this.evaluateJsonStringify(expression, context);
                }
                return {
                    success: false,
                    error: `Unsupported template expression: ${expression}`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Expression evaluation error: ${error.message}`
                };
            }
        }
        /**
         * Evaluate conditional expressions like "params.apiKey ? 'bearer' : ''" or "params.method || 'GET'"
         */
        evaluateConditionalExpression(expression, context) {
            try {
                // Handle logical OR expressions like "params.method || 'GET'"
                if (expression.includes('||')) {
                    // Use a more precise regex to split on || that's not inside quotes or function calls
                    const orMatch = expression.match(/^([^|]+)\|\|(.+)$/);
                    if (orMatch) {
                        const leftPart = orMatch[1].trim();
                        const rightPart = orMatch[2].trim();
                        const leftResult = this.evaluateTemplateExpression(leftPart, context);
                        if (leftResult.success && leftResult.value !== undefined && leftResult.value !== null && leftResult.value !== '') {
                            return { success: true, value: leftResult.value };
                        }
                        // If left side is falsy, evaluate right side
                        const rightValue = rightPart.replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
                        return { success: true, value: rightValue };
                    }
                }
                // Handle ternary expressions like "params.apiKey ? 'bearer' : ''"
                const parts = expression.split('?');
                if (parts.length !== 2) {
                    return { success: false, error: 'Invalid conditional expression format' };
                }
                const condition = parts[0].trim();
                const thenElse = parts[1].split(':');
                if (thenElse.length !== 2) {
                    return { success: false, error: 'Invalid conditional expression format' };
                }
                const thenValue = thenElse[0].trim().replace(/['"]/g, '');
                const elseValue = thenElse[1].trim().replace(/['"]/g, '');
                // Evaluate the condition
                const conditionResult = this.evaluateTemplateExpression(condition, context);
                if (!conditionResult.success) {
                    return conditionResult;
                }
                // Return appropriate value based on condition
                const result = conditionResult.value ? thenValue : elseValue;
                return { success: true, value: result };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Conditional expression error: ${error.message}`
                };
            }
        }
        /**
         * Evaluate JSON.stringify expressions
         */
        evaluateJsonStringify(expression, context) {
            try {
                // Extract the parameter from JSON.stringify(param)
                const match = expression.match(/JSON\.stringify\(([^)]+)\)/);
                if (!match) {
                    return { success: false, error: 'Invalid JSON.stringify expression' };
                }
                const param = match[1].trim();
                const paramResult = this.evaluateTemplateExpression(param, context);
                if (!paramResult.success) {
                    return paramResult;
                }
                return { success: true, value: JSON.stringify(paramResult.value) };
            }
            catch (error) {
                return {
                    success: false,
                    error: `JSON.stringify error: ${error.message}`
                };
            }
        }
        /**
         * Convert string values to appropriate types
         */
        convertStringValue(value) {
            // Handle boolean strings
            if (value === 'true')
                return true;
            if (value === 'false')
                return false;
            // Handle null/undefined strings
            if (value === 'null')
                return null;
            if (value === 'undefined')
                return undefined;
            // Handle numeric strings
            if (/^\d+$/.test(value)) {
                return parseInt(value, 10);
            }
            if (/^\d*\.\d+$/.test(value)) {
                return parseFloat(value);
            }
            // Return as string
            return value;
        }
    };
    return ParameterSubstitutionService = _classThis;
})();
export { ParameterSubstitutionService };
//# sourceMappingURL=parameter-substitution.service.js.map