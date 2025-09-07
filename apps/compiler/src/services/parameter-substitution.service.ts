export interface SubstitutionContext {
  parameters: Record<string, unknown>;
  stage: {
    id: string;
    title?: string;
  };
  channel: {
    channelId: string;
    title: string;
  };
  runtime?: {
    buildId: string;
    target: string;
  };
}

export interface SubstitutionResult {
  success: boolean;
  value?: unknown;
  errors?: string[];
}

export class ParameterSubstitutionService {
  /**
   * Substitute parameters in a template
   */
  substituteParameters(
    template: unknown,
    context: SubstitutionContext,
    _paramDefinitions?: Record<string, unknown>
  ): SubstitutionResult {
    // logger.info('Substituting parameters in template', { stageId: context.stage.id, paramCount: Object.keys(context.parameters).length });

    try {
      const result = this._deepSubstitute(template, context);

      return {
        success: true,
        value: result
      };
    } catch (error: unknown) {
      // logger.error('Parameter substitution failed', error);
      return {
        success: false,
        errors: [`Parameter substitution error: ${(error instanceof Error ? error.message : String(error))}`]
      };
    }
  }

  /**
   * Substitute a single parameter
   */
  substituteParameter(
    name: string,
    value: unknown,
    context: SubstitutionContext,
    _definition?: unknown
  ): SubstitutionResult {
    try {
      // Handle different parameter types
      if (value && typeof value === 'object') {
        if ('secret' in (value as Record<string, unknown>)) {
          // Secret reference - pass through without expansion
          return {
            success: true,
            value: value
          };
        }

        if ('expression' in (value as Record<string, unknown>)) {
          // Expression token - evaluate at compile time
          const evaluated = this._evaluateExpression((value as Record<string, unknown>)['expression'] as string, context);
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
    } catch (error: unknown) {
      return {
        success: false,
        errors: [`Parameter ${name} substitution error: ${(error instanceof Error ? error.message : String(error))}`]
      };
    }
  }

  /**
   * Deep substitute parameters in nested objects/arrays
   */
  private _deepSubstitute(obj: unknown, context: SubstitutionContext): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._deepSubstitute(item, context));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Handle template placeholders
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          const PLACEHOLDER_OFFSET = 2;
          const placeholder = value.slice(PLACEHOLDER_OFFSET, -PLACEHOLDER_OFFSET).trim();
          result[key] = this._resolvePlaceholder(placeholder, context);
        } else {
          result[key] = this._deepSubstitute(value, context);
        }
      }

      return result;
    }

    // Handle string placeholders
    if (typeof obj === 'string' && obj.startsWith('{{') && obj.endsWith('}}')) {
      const PLACEHOLDER_OFFSET = 2;
      const placeholder = obj.slice(PLACEHOLDER_OFFSET, -PLACEHOLDER_OFFSET).trim();
      return this._resolvePlaceholder(placeholder, context);
    }

    return obj;
  }

  /**
   * Resolve template placeholder
   */
  private _resolvePlaceholder(placeholder: string, context: SubstitutionContext): unknown {
    // Handle dot notation (e.g., "stage.id", "channel.title", "parameters.url")
    const parts = placeholder.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new Error(`Placeholder not found: ${placeholder}`);
      }
    }

    return current;
  }

  /**
   * Evaluate expression token (basic implementation)
   */
  private _evaluateExpression(expression: string, _context: SubstitutionContext): unknown {
    // logger.info('Evaluating expression', { expression, context });
  
    // For now, just return the expression as-is
    // In a real implementation, this would parse and evaluate JSONPath expressions
    return expression;
  }
}