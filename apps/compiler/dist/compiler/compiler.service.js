import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import { ulid } from 'ulid';
function safeStringify(obj) {
    try {
        return JSON.stringify(obj, Object.getOwnPropertyNames(obj));
    }
    catch (e) {
        return String(obj);
    }
}
let CompilerService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CompilerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CompilerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        validationService;
        policyService;
        artifactsService;
        bundlingService;
        logger = new Logger(CompilerService.name);
        constructor(validationService, policyService, artifactsService, bundlingService) {
            this.validationService = validationService;
            this.policyService = policyService;
            this.artifactsService = artifactsService;
            this.bundlingService = bundlingService;
        }
        /**
         * Main compilation endpoint - validates and compiles a channel
         */
        async compile(request) {
            const buildId = ulid();
            this.logger.log('Starting compilation', {
                buildId,
                orgId: request.orgId,
                userId: request.userId
            });
            try {
                // Step 1: Validate the channel IR
                this.logger.debug('[DEBUG] Before validation', { buildId });
                const validation = await this.validationService.validateChannelComprehensive(request.channel);
                this.logger.debug('[DEBUG] After validation', { buildId, validationResult: validation });
                if (!validation.valid) {
                    this.logger.warn('Compilation failed - validation errors', {
                        buildId,
                        errors: validation.errors
                    });
                    return {
                        success: false,
                        buildId,
                        validation,
                        policyLint: { passed: false, violations: [], summary: { errors: 0, warnings: 0, info: 0 } },
                        errors: validation.errors,
                    };
                }
                // Step 2: Policy linting
                this.logger.debug('[DEBUG] Before policy linting', { buildId });
                const policyLint = await this.policyService.lintChannel(validation.channel, request.orgId, request.acknowledgedViolations || []);
                this.logger.debug('[DEBUG] After policy linting', { buildId, policyLintResult: policyLint });
                // Step 3: Check if compilation can proceed
                const canProceed = validation.valid && (policyLint.passed || policyLint.summary.errors === 0);
                if (!canProceed) {
                    this.logger.warn('Compilation blocked by policy violations', {
                        buildId,
                        errorCount: policyLint.summary.errors
                    });
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
                // Step 4: Generate compiled artifacts
                this.logger.debug('[DEBUG] Before artifact generation', { buildId, channel: validation.channel });
                let artifacts;
                try {
                    artifacts = await this.generateArtifacts(validation.channel, buildId);
                    this.logger.debug('[DEBUG] After artifact generation', { buildId, artifactsKeys: Object.keys(artifacts), artifacts });
                }
                catch (artifactError) {
                    this.logger.error('[DEBUG] Artifact generation failed', {
                        buildId,
                        error: artifactError,
                        errorString: safeStringify(artifactError),
                    });
                    throw artifactError;
                }
                // Step 5: Create bundle with hashing
                this.logger.debug('[DEBUG] Before bundle creation', { buildId, artifacts });
                let bundleResult;
                try {
                    bundleResult = await this.createBundle(artifacts, {
                        buildId,
                        orgId: request.orgId,
                        userId: request.userId,
                        channel: validation.channel,
                        policyLint,
                    });
                    this.logger.debug('[DEBUG] After bundle creation', { buildId, bundleKeys: Object.keys(bundleResult), bundleResult });
                }
                catch (bundleError) {
                    this.logger.error('[DEBUG] Bundle creation failed', {
                        buildId,
                        error: bundleError,
                        errorString: safeStringify(bundleError),
                    });
                    throw bundleError;
                }
                this.logger.log('Compilation successful', {
                    buildId,
                    channelId: validation.channel.channelId,
                    bundleSize: bundleResult.bundleSize,
                    bundleHash: bundleResult.hashes.bundleHash.hash,
                });
                return {
                    success: true,
                    buildId,
                    validation,
                    policyLint,
                    warnings: [
                        ...(validation.warnings || []),
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
                            target: validation.channel.runtime.target,
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
            catch (error) {
                this.logger.error('[DEBUG] Compilation failed with exception', {
                    buildId,
                    error,
                    errorString: safeStringify(error),
                    errorStack: error?.stack,
                    errorMessage: error?.message,
                });
                return {
                    success: false,
                    buildId,
                    validation: { valid: false, errors: [`Compilation error: ${error?.message}`] },
                    policyLint: { passed: false, violations: [], summary: { errors: 0, warnings: 0, info: 0 } },
                    errors: [`Internal compilation error: ${error?.message}`],
                };
            }
        }
        /**
         * Verify security acknowledgment for policy violations
         */
        async verifySecurityAck(request) {
            this.logger.log('Processing security acknowledgment', {
                channelId: request.channelId,
                userId: request.userId,
                violationCount: request.violationIds.length,
            });
            try {
                // In a real implementation, this would:
                // 1. Validate the user has permission to acknowledge violations
                // 2. Store the acknowledgment in a database with audit trail
                // 3. Notify relevant stakeholders
                // 4. Return the list of successfully acknowledged violations
                // For now, we'll simulate successful acknowledgment
                const acknowledgedViolations = request.violationIds;
                this.logger.log('Security acknowledgment processed', {
                    channelId: request.channelId,
                    userId: request.userId,
                    acknowledgedCount: acknowledgedViolations.length,
                });
                return {
                    success: true,
                    acknowledgedViolations,
                    message: `Successfully acknowledged ${acknowledgedViolations.length} policy violations`,
                };
            }
            catch (error) {
                this.logger.error('Failed to process security acknowledgment', error, {
                    channelId: request.channelId,
                    userId: request.userId,
                });
                return {
                    success: false,
                    acknowledgedViolations: [],
                    message: `Failed to process acknowledgment: ${error.message}`,
                };
            }
        }
        /**
         * Generate compiled artifacts from validated channel
         */
        async generateArtifacts(channel, buildId) {
            this.logger.debug('Generating compiled artifacts', {
                channelId: channel.channelId,
                buildId,
                channel,
            });
            let artifacts;
            try {
                this.logger.debug('Calling artifactsService.generateArtifacts', {
                    channel,
                    buildId,
                    mode: 'TEST',
                    target: channel.runtime.target,
                });
                artifacts = await this.artifactsService.generateArtifacts(channel, {
                    buildId,
                    mode: 'TEST', // TODO: Make this configurable
                    target: channel.runtime.target,
                });
                this.logger.debug('artifactsService.generateArtifacts result', { artifacts });
            }
            catch (err) {
                this.logger.error('Error in artifactsService.generateArtifacts', {
                    buildId,
                    error: err,
                    errorString: safeStringify(err),
                });
                throw err;
            }
            return {
                flowsJson: artifacts.flowsJson,
                settings: artifacts.settings,
                credentialsMap: artifacts.credentialsMap,
                manifest: artifacts.manifest,
            };
        }
        /**
         * Create bundle with hashing from generated artifacts
         */
        async createBundle(artifacts, context) {
            this.logger.debug('Creating bundle with hashing', {
                buildId: context.buildId,
                channelId: context.channel.channelId,
                artifacts,
                context,
            });
            let bundleResult;
            try {
                this.logger.debug('Calling bundlingService.createBundle', {
                    artifacts,
                    context,
                });
                bundleResult = await this.bundlingService.createBundle(artifacts, {
                    buildId: context.buildId,
                    compression: 'gzip',
                    includeMetadata: true,
                });
                this.logger.debug('bundlingService.createBundle result', { bundleResult });
                this.logger.debug('Bundle created successfully', {
                    buildId: context.buildId,
                    bundleSize: bundleResult.bundleSize,
                    artifactCount: bundleResult.metadata.artifacts.count,
                    bundleHash: bundleResult.hashes.bundleHash.hash,
                    merkleRoot: bundleResult.hashes.merkleRoot,
                });
                return bundleResult;
            }
            catch (error) {
                this.logger.error('Failed to create bundle', {
                    buildId: context.buildId,
                    channelId: context.channel.channelId,
                    error,
                    errorString: safeStringify(error),
                });
                throw new Error(`Failed to create bundle: ${error?.message}`);
            }
        }
        /**
         * Get compilation status (for monitoring/debugging)
         */
        async getCompilationStatus(buildId) {
            // In a real implementation, this would fetch status from a database
            // For now, return a placeholder
            return {
                buildId,
                status: 'completed',
                timestamp: new Date().toISOString(),
            };
        }
    };
    return CompilerService = _classThis;
})();
export { CompilerService };
//# sourceMappingURL=compiler.service.js.map