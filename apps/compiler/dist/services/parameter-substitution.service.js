export class ParameterSubstitutionService {
    /**
     * Substitute parameters in a template
     */
    async substituteParameters(template, context, paramDefinitions) {
        console.log('Substituting parameters in template', {
            stageId: context.stage.id,
            paramCount: Object.keys(context.parameters).length
        });
        try {
            const result = this._deepSubstitute(template, context);
            return {
                success: true,
                value: result
            };
        }
        catch (error) {
            console.error('Parameter substitution failed', error);
            return {
                success: false,
                errors: [`Parameter substitution error: ${error.message}`]
            };
        }
    }
    /**
     * Substitute a single parameter
     */
    async substituteParameter(name, value, context, definition) {
        try {
            // Handle different parameter types
            if (value && typeof value === 'object') {
                if ('secret' in value) {
                    // Secret reference - pass through without expansion
                    return {
                        success: true,
                        value: value
                    };
                }
                if ('expression' in value) {
                    // Expression token - evaluate at compile time
                    const evaluated = this._evaluateExpression(value.expression, context);
                    return {
                        success: true,
                        value: evaluated
                    };
                }
            }
            // Regular JSON value - pass through
            return {
                success: true,
                value: value
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [`Parameter ${name} substitution error: ${error.message}`]
            };
        }
    }
    /**
     * Deep substitute parameters in nested objects/arrays
     */
    _deepSubstitute(obj, context) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this._deepSubstitute(item, context));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                // Handle template placeholders
                if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                    const placeholder = value.slice(2, -2).trim();
                    result[key] = this._resolvePlaceholder(placeholder, context);
                }
                else {
                    result[key] = this._deepSubstitute(value, context);
                }
            }
            return result;
        }
        // Handle string placeholders
        if (typeof obj === 'string' && obj.startsWith('{{') && obj.endsWith('}}')) {
            const placeholder = obj.slice(2, -2).trim();
            return this._resolvePlaceholder(placeholder, context);
        }
        return obj;
    }
    /**
     * Resolve template placeholder
     */
    _resolvePlaceholder(placeholder, context) {
        // Handle dot notation (e.g., "stage.id", "channel.title", "parameters.url")
        const parts = placeholder.split('.');
        let current = context;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                throw new Error(`Placeholder not found: ${placeholder}`);
            }
        }
        return current;
    }
    /**
     * Evaluate expression token (basic implementation)
     */
    _evaluateExpression(expression, context) {
        // Basic expression evaluation - in a real implementation this would be more sophisticated
        console.log('Evaluating expression', { expression, context });
        // For now, just return the expression as-is
        // In a real implementation, this would parse and evaluate JSONPath expressions
        return expression;
    }
}
//# sourceMappingURL=parameter-substitution.service.js.map