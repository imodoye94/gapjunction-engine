export interface SubstitutionContext {
    parameters: Record<string, any>;
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
    value?: any;
    errors?: string[];
}
export declare class ParameterSubstitutionService {
    /**
     * Substitute parameters in a template
     */
    substituteParameters(template: any, context: SubstitutionContext, paramDefinitions?: Record<string, any>): Promise<SubstitutionResult>;
    /**
     * Substitute a single parameter
     */
    substituteParameter(name: string, value: any, context: SubstitutionContext, definition?: any): Promise<SubstitutionResult>;
    /**
     * Deep substitute parameters in nested objects/arrays
     */
    private _deepSubstitute;
    /**
     * Resolve template placeholder
     */
    private _resolvePlaceholder;
    /**
     * Evaluate expression token (basic implementation)
     */
    private _evaluateExpression;
}
//# sourceMappingURL=parameter-substitution.service.d.ts.map