import { ValidationService, ChannelValidationResult } from '../validation/validation.service';
import { PolicyService, PolicyLintResult } from '../policy/policy.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { BundlingService } from '../bundling/bundling.service';
export interface CompileRequest {
    channel: unknown;
    orgId?: string;
    userId?: string;
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
        flowsJson?: any;
        settings?: any;
        credentialsMap?: any;
        manifest?: any;
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
    private readonly validationService;
    private readonly policyService;
    private readonly artifactsService;
    private readonly bundlingService;
    private readonly logger;
    constructor(validationService: ValidationService, policyService: PolicyService, artifactsService: ArtifactsService, bundlingService: BundlingService);
    /**
     * Main compilation endpoint - validates and compiles a channel
     */
    compile(request: CompileRequest): Promise<CompileResult>;
    /**
     * Verify security acknowledgment for policy violations
     */
    verifySecurityAck(request: SecurityAckRequest): Promise<SecurityAckResult>;
    /**
     * Generate compiled artifacts from validated channel
     */
    private generateArtifacts;
    /**
     * Create bundle with hashing from generated artifacts
     */
    private createBundle;
    /**
     * Get compilation status (for monitoring/debugging)
     */
    getCompilationStatus(buildId: string): Promise<any>;
}
//# sourceMappingURL=compiler.service.d.ts.map