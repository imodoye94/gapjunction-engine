import { ulid } from 'ulid';

import type { ChannelIR } from '@gapjunction/ir-schema';

import type { ArtifactsService } from './artifacts.service.js';
import type { BundlingService, BundleResult } from './bundling.service.js';
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
  bundle?: string;
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
    bundleSize?: number;
    artifactCount?: number;
    timestamp?: string;
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

export class CompilerService {
  constructor(
    private readonly _validationService: ValidationService,
    private readonly _policyService: PolicyService,
    private readonly _artifactsService: ArtifactsService,
    private readonly _bundlingService: BundlingService,
  ) {}

  /**
   * Main compilation endpoint - validates and compiles a channel
   */
  async compile(request: CompileRequest): Promise<CompileResult> {
    const buildId = ulid();
    
    try {
      const validation = await this._validateChannel(request.channel, buildId);
      if (!validation.valid) {
        return this._createValidationFailureResult(buildId, validation);
      }

      const policyLint = await this._performPolicyLinting(request, validation, buildId);
      // validation.valid is always true here due to the previous check, so we can simplify:
      const canProceed = policyLint.passed || policyLint.summary.errors === 0;

      if (!canProceed) {
        return this._createPolicyFailureResult(buildId, validation, policyLint);
      }

      const artifacts = await this._generateArtifacts(validation.channel as ChannelIR, buildId);
      const bundleResult = await this._createBundle(artifacts, {
        buildId,
        orgId: request.orgId,
        userId: request.userId,
        channel: validation.channel as ChannelIR,
        policyLint,
      });

      return this._createSuccessResult(buildId, validation, policyLint, {
        artifacts,
        bundleResult,
        request,
      });

    } catch (error: unknown) {
      return this._createErrorResult(buildId, error);
    }
  }

  /**
   * Verify security acknowledgment for policy violations
   */
  verifySecurityAck(request: SecurityAckRequest): SecurityAckResult {
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

    } catch (error: unknown) {
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
  getCompilationStatus(buildId: string): { buildId: string; status: string; timestamp: string } {
    // In a real implementation, this would fetch status from a database
    // For now, return a placeholder
    return {
      buildId,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
  }

  private async _validateChannel(channel: unknown, _buildId: string): Promise<ChannelValidationResult> {
    return await this._validationService.validateChannelComprehensive(channel);
  }

  private async _performPolicyLinting(
    request: CompileRequest,
    validation: ChannelValidationResult,
    _buildId: string
  ): Promise<PolicyLintResult> {
    return await this._policyService.lintChannel(
      validation.channel as ChannelIR,
      request.orgId,
      request.acknowledgedViolations ?? []
    );
  }

  private _createValidationFailureResult(buildId: string, validation: ChannelValidationResult): CompileResult {
    return {
      success: false,
      buildId,
      validation,
      policyLint: { passed: false, violations: [], summary: { errors: 0, warnings: 0, info: 0 } },
      errors: validation.errors ?? [],
    };
  }

  private _createPolicyFailureResult(
    buildId: string, 
    validation: ChannelValidationResult, 
    policyLint: PolicyLintResult
  ): CompileResult {
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

  private _createSuccessResult(
    buildId: string,
    validation: ChannelValidationResult,
    policyLint: PolicyLintResult,
    context: {
      artifacts: { flowsJson: unknown; settings: unknown; credentialsMap: unknown; manifest: unknown };
      bundleResult: BundleResult;
      request: CompileRequest;
    }
  ): CompileResult {
    const { artifacts, bundleResult, request } = context;
    const channel = validation.channel as ChannelIR;
    const response = {
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
      bundle: bundleResult.bundleBuffer.toString('base64'),
      artifactHashes: {
        flowsJson: bundleResult.hashes.artifactHashes.flowsJson.hash,
        settings: bundleResult.hashes.artifactHashes.settings.hash,
        manifest: bundleResult.hashes.artifactHashes.manifest.hash,
        credentialsMap: bundleResult.hashes.artifactHashes.credentialsMap.hash
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
        bundleSize: bundleResult.bundleSize,
        artifactCount: bundleResult.metadata.artifacts.count,
        timestamp: bundleResult.metadata.timestamp,
      },
      compiledArtifacts: {
        flowsJson: artifacts.flowsJson,
        settings: artifacts.settings,
        credentialsMap: artifacts.credentialsMap,
        manifest: artifacts.manifest,
      },
    };
    // Debug log for full response structure
    // eslint-disable-next-line no-console
    console.dir(response, { depth: 5 });
    return response;
  }

  private _createErrorResult(buildId: string, error: unknown): CompileResult {
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
  private async _generateArtifacts(channel: ChannelIR, buildId: string): Promise<{
    flowsJson: unknown;
    settings: unknown;
    credentialsMap: unknown;
    manifest: unknown;
  }> {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Artifact generation failed: ${errorMessage}`);
    }
  }

  /**
   * Create bundle with hashing from generated artifacts
   */
  private async _createBundle(
    artifacts: {
      flowsJson: unknown;
      settings: unknown;
      credentialsMap: unknown;
      manifest: unknown;
    },
    context: {
      buildId: string;
      orgId: string;
      userId: string;
      channel: ChannelIR;
      policyLint: PolicyLintResult;
    }
  ): Promise<BundleResult> {
    try {
      const bundleResult = await this._bundlingService.createBundle(artifacts, {
        buildId: context.buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      return bundleResult;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create bundle: ${errorMessage}`);
    }
  }
}