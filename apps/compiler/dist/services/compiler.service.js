import { ulid } from 'ulid';
export class CompilerService {
    _validationService;
    _policyService;
    _artifactsService;
    _bundlingService;
    constructor(_validationService, _policyService, _artifactsService, _bundlingService) {
        this._validationService = _validationService;
        this._policyService = _policyService;
        this._artifactsService = _artifactsService;
        this._bundlingService = _bundlingService;
    }
    /**
     * Main compilation endpoint - validates and compiles a channel
     */
    async compile(request) {
        const buildId = ulid();
        try {
            const validation = await this._validateChannel(request.channel, buildId);
            if (!validation.valid) {
                return this._createValidationFailureResult(buildId, validation);
            }
            const policyLint = await this._performPolicyLinting(request, validation, buildId);
            const canProceed = validation.valid && (policyLint.passed || policyLint.summary.errors === 0);
            if (!canProceed) {
                return this._createPolicyFailureResult(buildId, validation, policyLint);
            }
            const artifacts = await this._generateArtifacts(validation.channel, buildId);
            const bundleResult = await this._createBundle(artifacts, {
                buildId,
                orgId: request.orgId,
                userId: request.userId,
                channel: validation.channel,
                policyLint,
            });
            return this._createSuccessResult(buildId, validation, policyLint, {
                artifacts,
                bundleResult,
                request,
            });
        }
        catch (error) {
            return this._createErrorResult(buildId, error);
        }
    }
    /**
     * Verify security acknowledgment for policy violations
     */
    verifySecurityAck(request) {
        try {
            // In a real implementation, this would:
            // 1. Validate the user has permission to acknowledge violations
            // 2. Store the acknowledgment in a database with audit trail
            // 3. Notify relevant stakeholders
            // 4. Return the list of successfully acknowledged violations
            // For now, we'll simulate successful acknowledgment
            const acknowledgedViolations = request.violationIds;
            return {
                success: true,
                acknowledgedViolations,
                message: `Successfully acknowledged ${acknowledgedViolations.length} policy violations`,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                acknowledgedViolations: [],
                message: `Failed to process acknowledgment: ${errorMessage}`,
            };
        }
    }
    /**
     * Get compilation status (for monitoring/debugging)
     */
    getCompilationStatus(buildId) {
        // In a real implementation, this would fetch status from a database
        // For now, return a placeholder
        return {
            buildId,
            status: 'completed',
            timestamp: new Date().toISOString(),
        };
    }
    async _validateChannel(channel, _buildId) {
        return await this._validationService.validateChannelComprehensive(channel);
    }
    async _performPolicyLinting(request, validation, _buildId) {
        return await this._policyService.lintChannel(validation.channel, request.orgId, request.acknowledgedViolations ?? []);
    }
    _createValidationFailureResult(buildId, validation) {
        return {
            success: false,
            buildId,
            validation,
            policyLint: { passed: false, violations: [], summary: { errors: 0, warnings: 0, info: 0 } },
            errors: validation.errors ?? [],
        };
    }
    _createPolicyFailureResult(buildId, validation, policyLint) {
        return {
            success: false,
            buildId,
            validation,
            policyLint,
            errors: policyLint.violations
                .filter(v => v.severity === 'error' && !v.acknowledged)
                .map(v => v.message),
        };
    }
    _createSuccessResult(buildId, validation, policyLint, context) {
        const { artifacts, bundleResult, request } = context;
        const channel = validation.channel;
        return {
            success: true,
            buildId,
            validation,
            policyLint,
            warnings: [
                ...(validation.warnings ?? []),
                ...policyLint.violations
                    .filter(v => v.severity === 'warning' && !v.acknowledged)
                    .map(v => v.message),
            ],
            bundle: bundleResult.bundleBuffer,
            artifactHashes: {
                flowsJson: bundleResult.hashes.artifactHashes.flowsJson.hash,
                settings: bundleResult.hashes.artifactHashes.settings.hash,
                manifest: bundleResult.hashes.artifactHashes.manifest.hash,
                credentialsMap: bundleResult.hashes.artifactHashes.credentialsMap.hash,
            },
            bundleHash: bundleResult.hashes.bundleHash.hash,
            merkleRoot: bundleResult.hashes.merkleRoot,
            metadata: {
                orgId: request.orgId,
                userId: request.userId,
                runtime: {
                    target: channel.runtime.target,
                    mode: 'TEST', // TODO: Make configurable
                },
                linting: {
                    errors: policyLint.summary.errors,
                    warnings: policyLint.summary.warnings,
                    info: policyLint.summary.info,
                },
            },
            compiledArtifacts: {
                flowsJson: artifacts.flowsJson,
                settings: artifacts.settings,
                credentialsMap: artifacts.credentialsMap,
                manifest: artifacts.manifest,
            },
        };
    }
    _createErrorResult(buildId, error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            buildId,
            validation: { valid: false, errors: [`Compilation error: ${errorMessage}`] },
            policyLint: { passed: false, violations: [], summary: { errors: 0, warnings: 0, info: 0 } },
            errors: [`Internal compilation error: ${errorMessage}`],
        };
    }
    /**
     * Generate compiled artifacts from validated channel
     */
    async _generateArtifacts(channel, buildId) {
        try {
            const artifacts = await this._artifactsService.generateArtifacts(channel, {
                buildId,
                mode: 'TEST', // TODO: Make this configurable
                target: channel.runtime.target,
            });
            return {
                flowsJson: artifacts.flowsJson,
                settings: artifacts.settings,
                credentialsMap: artifacts.credentialsMap,
                manifest: artifacts.manifest,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Artifact generation failed: ${errorMessage}`);
        }
    }
    /**
     * Create bundle with hashing from generated artifacts
     */
    async _createBundle(artifacts, context) {
        try {
            const bundleResult = await this._bundlingService.createBundle(artifacts, {
                buildId: context.buildId,
                compression: 'gzip',
                includeMetadata: true,
            });
            return bundleResult;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to create bundle: ${errorMessage}`);
        }
    }
}
//# sourceMappingURL=compiler.service.js.map