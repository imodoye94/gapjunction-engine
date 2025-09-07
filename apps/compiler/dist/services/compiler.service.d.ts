import type { ArtifactsService } from './artifacts.service.js';
import type { BundlingService } from './bundling.service.js';
import type { PolicyService, PolicyLintResult } from './policy.service.js';
import type { ValidationService, ChannelValidationResult } from './validation.service.js';
export interface CompileRequest {
    channel: unknown;
    orgId: string;
    userId: string;
    acknowledgedViolations?: string[];
}
export interface CompileResult {
    success: boolean;
    buildId?: string;
    validation: ChannelValidationResult;
    policyLint: PolicyLintResult;
    errors?: string[];
    warnings?: string[];
    bundle?: Buffer;
    artifactHashes?: {
        flowsJson: string;
        settings: string;
        manifest: string;
        credentialsMap: string;
    };
    bundleHash?: string;
    merkleRoot?: string;
    metadata?: {
        orgId?: string;
        userId?: string;
        runtime: {
            target: string;
            mode: string;
        };
        linting: {
            errors: number;
            warnings: number;
            info: number;
        };
    };
    compiledArtifacts?: {
        flowsJson?: unknown;
        settings?: unknown;
        credentialsMap?: unknown;
        manifest?: unknown;
    };
}
export interface SecurityAckRequest {
    channelId: string;
    userId: string;
    violationIds: string[];
    reason: string;
}
export interface SecurityAckResult {
    success: boolean;
    acknowledgedViolations: string[];
    message: string;
}
export declare class CompilerService {
    private readonly _validationService;
    private readonly _policyService;
    private readonly _artifactsService;
    private readonly _bundlingService;
    constructor(_validationService: ValidationService, _policyService: PolicyService, _artifactsService: ArtifactsService, _bundlingService: BundlingService);
    /**
     * Main compilation endpoint - validates and compiles a channel
     */
    compile(request: CompileRequest): Promise<CompileResult>;
    /**
     * Verify security acknowledgment for policy violations
     */
    verifySecurityAck(request: SecurityAckRequest): SecurityAckResult;
    /**
     * Get compilation status (for monitoring/debugging)
     */
    getCompilationStatus(buildId: string): {
        buildId: string;
        status: string;
        timestamp: string;
    };
    private _validateChannel;
    private _performPolicyLinting;
    private _createValidationFailureResult;
    private _createPolicyFailureResult;
    private _createSuccessResult;
    private _createErrorResult;
    /**
     * Generate compiled artifacts from validated channel
     */
    private _generateArtifacts;
    /**
     * Create bundle with hashing from generated artifacts
     */
    private _createBundle;
}
//# sourceMappingURL=compiler.service.d.ts.map