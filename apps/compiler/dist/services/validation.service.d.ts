import { type ChannelIR, type Stage, type Edge } from '@gapjunction/ir-schema';
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}
export interface ChannelValidationResult extends ValidationResult {
    channel?: ChannelIR;
}
export interface StageValidationResult extends ValidationResult {
    stage?: Stage;
}
export interface EdgeValidationResult extends ValidationResult {
    edge?: Edge;
}
export declare class ValidationService {
    /**
     * Validates a complete Channel IR document
     */
    validateChannel(input: unknown): Promise<ChannelValidationResult>;
    /**
     * Validates a single stage definition
     */
    validateStage(input: unknown): Promise<StageValidationResult>;
    /**
     * Validates a single edge definition
     */
    validateEdge(input: unknown): Promise<EdgeValidationResult>;
    /**
     * Validates parameter values
     */
    validateParameters(input: unknown): Promise<ValidationResult>;
    /**
     * Performs comprehensive validation of a channel including semantic checks
     */
    validateChannelComprehensive(input: unknown): Promise<ChannelValidationResult>;
    /**
     * Basic circular dependency detection
     */
    private _detectCircularDependencies;
}
//# sourceMappingURL=validation.service.d.ts.map