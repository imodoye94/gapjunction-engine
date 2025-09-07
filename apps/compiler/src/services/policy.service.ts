import type { ChannelIR, RuntimeTarget } from '@gapjunction/ir-schema';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'security' | 'compliance' | 'performance' | 'best-practice';
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: string;
  stageId?: string;
  suggestion?: string;
  acknowledged?: boolean;
}

export interface PolicyLintResult {
  passed: boolean;
  violations: PolicyViolation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface OrgSecurityPolicy {
  orgId: string;
  policies: {
    allowInternetAccess: 'deny' | 'warn' | 'allow';
    allowPublicEndpoints: 'deny' | 'warn' | 'allow';
    requireEncryption: boolean;
    allowedNexonIds: string[] | null; // null means all allowed
    blockedNexonIds: string[];
    maxStagesPerChannel: number;
    requireDocumentation: boolean;
    allowedRuntimeTargets: RuntimeTarget[];
  };
}

export class PolicyService {
  private readonly _defaultOrgPolicy: OrgSecurityPolicy;

  constructor() {
    // Default security policy - can be overridden by org-specific policies
   this._defaultOrgPolicy = {
      orgId: 'default',
      policies: {
        allowInternetAccess: 'warn',
        allowPublicEndpoints: 'warn',
        requireEncryption: true,
        allowedNexonIds: null,
        blockedNexonIds: [],
        maxStagesPerChannel: 50,
        requireDocumentation: false,
        allowedRuntimeTargets: ['onprem', 'cloud'],
      },
    };
  }

  /**
   * Performs comprehensive policy linting on a channel
   */
  async lintChannel(
    channel: ChannelIR,
    orgId?: string,
    acknowledgedViolations: string[] = []
  ): Promise<PolicyLintResult> {
   // logger.info('Starting policy lint', { channelId: channel.channelId, orgId, acknowledgedCount: acknowledgedViolations.length });

    const orgPolicy = await this._getOrgPolicy(orgId);
    const violations: PolicyViolation[] = [];

    // Security policy checks
    violations.push(...this._checkSecurityPolicies(channel, orgPolicy));
    
    // Nexon capability checks
    violations.push(...this._checkNexonCapabilities(channel, orgPolicy));
    
    // Runtime target checks
    violations.push(...this._checkRuntimeTarget(channel, orgPolicy));
    
    // Best practice checks
    violations.push(...this._checkBestPractices(channel, orgPolicy));
    
    // Compliance checks
    violations.push(...this._checkCompliance(channel, orgPolicy));

    // Mark acknowledged violations
    violations.forEach(violation => {
      violation.acknowledged = acknowledgedViolations.includes(violation.ruleId);
    });

    const summary = this._calculateSummary(violations);
    const passed = summary.errors === 0;

   // logger.info('Policy lint completed', { channelId: channel.channelId, passed, summary });

    return {
      passed,
      violations,
      summary,
    };
  }

  /**
   * Check security-related policies
   */
  private _checkSecurityPolicies(channel: ChannelIR, orgPolicy: OrgSecurityPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];
    const security = channel.security ?? {};

    // Internet HTTP access check
    if (security.allowInternetHttpOut) {
      const severity = this._getSeverityFromPolicy(orgPolicy.policies.allowInternetAccess);
      if (severity) {
        violations.push({
          ruleId: 'SEC001',
          ruleName: 'Internet HTTP Access',
          severity,
          category: 'security',
          message: 'Channel requests internet HTTP access',
          suggestion: 'Consider using internal services or VPN connections instead',
        });
      }
    }

    // Internet TCP access check
    if (security.allowInternetTcpOut) {
      const severity = this._getSeverityFromPolicy(orgPolicy.policies.allowInternetAccess);
      if (severity) {
        violations.push({
          ruleId: 'SEC002',
          ruleName: 'Internet TCP Access',
          severity,
          category: 'security',
          message: 'Channel requests internet TCP access',
          suggestion: 'Ensure connections are encrypted and to trusted endpoints',
        });
      }
    }

    // Internet UDP access check
    if (security.allowInternetUdpOut) {
      const severity = this._getSeverityFromPolicy(orgPolicy.policies.allowInternetAccess);
      if (severity) {
        violations.push({
          ruleId: 'SEC003',
          ruleName: 'Internet UDP Access',
          severity,
          category: 'security',
          message: 'Channel requests internet UDP access',
          suggestion: 'UDP connections are inherently less secure than TCP',
        });
      }
    }

    // Public HTTP endpoints check
    if (security.allowHttpInPublic) {
      const severity = this._getSeverityFromPolicy(orgPolicy.policies.allowPublicEndpoints);
      if (severity) {
        violations.push({
          ruleId: 'SEC004',
          ruleName: 'Public HTTP Endpoints',
          severity,
          category: 'security',
          message: 'Channel exposes public HTTP endpoints',
          suggestion: 'Consider using authentication and rate limiting',
        });
      }
    }

    return violations;
  }

  /**
   * Check nexon capabilities against org policies
   */
  private _checkNexonCapabilities(channel: ChannelIR, orgPolicy: OrgSecurityPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    channel.stages.forEach(stage => {
      // Check blocked nexons
      if (orgPolicy.policies.blockedNexonIds.includes(stage.nexonId)) {
        violations.push({
          ruleId: 'NEX001',
          ruleName: 'Blocked Nexon',
          severity: 'error',
          category: 'security',
          message: `Nexon "${stage.nexonId}" is blocked by organization policy`,
          stageId: stage.id,
          suggestion: 'Use an alternative nexon or request policy exception',
        });
      }

      // Check allowed nexons (if allowlist is defined)
      if (orgPolicy.policies.allowedNexonIds && 
          !orgPolicy.policies.allowedNexonIds.includes(stage.nexonId)) {
        violations.push({
          ruleId: 'NEX002',
          ruleName: 'Unauthorized Nexon',
          severity: 'error',
          category: 'security',
          message: `Nexon "${stage.nexonId}" is not in the organization's allowed list`,
          stageId: stage.id,
          suggestion: 'Request approval for this nexon or use an approved alternative',
        });
      }

      // Check for missing nexon version
      if (!stage.nexonVersion) {
        violations.push({
          ruleId: 'NEX003',
          ruleName: 'Missing Nexon Version',
          severity: 'warning',
          category: 'best-practice',
          message: `Stage "${stage.id}" does not specify a nexon version`,
          stageId: stage.id,
          suggestion: 'Specify a version for reproducible builds',
        });
      }
    });

    return violations;
  }

  /**
   * Check runtime target policies
   */
  private _checkRuntimeTarget(channel: ChannelIR, orgPolicy: OrgSecurityPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    if (!orgPolicy.policies.allowedRuntimeTargets.includes(channel.runtime.target)) {
      violations.push({
        ruleId: 'RT001',
        ruleName: 'Unauthorized Runtime Target',
        severity: 'error',
        category: 'security',
        message: `Runtime target "${channel.runtime.target}" is not allowed by organization policy`,
        suggestion: `Use one of: ${orgPolicy.policies.allowedRuntimeTargets.join(', ')}`,
      });
    }

    return violations;
  }

  /**
   * Check best practices
   */
  private _checkBestPractices(channel: ChannelIR, orgPolicy: OrgSecurityPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check channel size
    if (channel.stages.length > orgPolicy.policies.maxStagesPerChannel) {
      violations.push({
        ruleId: 'BP001',
        ruleName: 'Channel Too Complex',
        severity: 'warning',
        category: 'best-practice',
        message: `Channel has ${channel.stages.length} stages, exceeding limit of ${orgPolicy.policies.maxStagesPerChannel}`,
        suggestion: 'Consider breaking this into smaller, more focused channels',
      });
    }

    // Check documentation requirement
    if (orgPolicy.policies.requireDocumentation && !channel.documentation) {
      violations.push({
        ruleId: 'BP002',
        ruleName: 'Missing Documentation',
        severity: 'warning',
        category: 'best-practice',
        message: 'Channel lacks documentation',
        suggestion: 'Add documentation to help other developers understand this channel',
      });
    }

    // Check for stages without descriptions
    const undocumentedStages = channel.stages.filter(stage => !stage.description);
    if (undocumentedStages.length > 0) {
      violations.push({
        ruleId: 'BP003',
        ruleName: 'Undocumented Stages',
        severity: 'info',
        category: 'best-practice',
        message: `${undocumentedStages.length} stages lack descriptions`,
        suggestion: 'Add descriptions to improve channel maintainability',
      });
    }

    return violations;
  }

  /**
   * Check compliance requirements
   */
  private _checkCompliance(channel: ChannelIR, _orgPolicy: OrgSecurityPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check for potential PHI handling stages
    const phiRiskyNexons = ['http.request', 'file.write', 'database.insert', 'email.send'];
    const phiRiskyStages = channel.stages.filter(stage =>
      phiRiskyNexons.some(risky => stage.nexonId.includes(risky))
    );

    if (phiRiskyStages.length > 0) {
      violations.push({
        ruleId: 'COMP001',
        ruleName: 'Potential PHI Handling',
        severity: 'warning',
        category: 'compliance',
        message: 'Channel contains stages that may handle PHI data',
        suggestion: 'Ensure proper encryption, access controls, and audit logging are in place',
      });
    }

    return violations;
  }

  /**
   * Get organization-specific policy (placeholder for future implementation)
   */
    private async _getOrgPolicy(_orgId?: string): Promise<OrgSecurityPolicy> {
      // In a real implementation, this would fetch from a database or config service
      // For now, return the default policy
      // logger.info('Using default org policy', { orgId });
      await Promise.resolve(); // Satisfy require-await rule
      return this._defaultOrgPolicy;
    }

  /**
   * Convert policy setting to severity level
   */
  private _getSeverityFromPolicy(policy: 'deny' | 'warn' | 'allow'): 'error' | 'warning' | null {
    switch (policy) {
      case 'deny': return 'error';
      case 'warn': return 'warning';
      case 'allow': return null;
    }
  }

  /**
   * Calculate violation summary
   */
  private _calculateSummary(violations: PolicyViolation[]): { errors: number; warnings: number; info: number } {
    return violations.reduce(
      (summary, violation) => {
        if (!violation.acknowledged) {
          const key = violation.severity === 'error'
            ? 'errors'
            : violation.severity === 'warning'
            ? 'warnings'
            : 'info';
          summary[key]++;
        }
        return summary;
      },
      { errors: 0, warnings: 0, info: 0 }
    );
  }

  /**
   * Get available policy rules for documentation
   */
  getPolicyRules(): PolicyRule[] {
    return [
      {
        id: 'SEC001',
        name: 'Internet HTTP Access',
        description: 'Checks if channel requests internet HTTP access',
        severity: 'warning',
        category: 'security',
      },
      {
        id: 'SEC002',
        name: 'Internet TCP Access',
        description: 'Checks if channel requests internet TCP access',
        severity: 'warning',
        category: 'security',
      },
      {
        id: 'SEC003',
        name: 'Internet UDP Access',
        description: 'Checks if channel requests internet UDP access',
        severity: 'warning',
        category: 'security',
      },
      {
        id: 'SEC004',
        name: 'Public HTTP Endpoints',
        description: 'Checks if channel exposes public HTTP endpoints',
        severity: 'warning',
        category: 'security',
      },
      {
        id: 'NEX001',
        name: 'Blocked Nexon',
        description: 'Checks for usage of blocked nexons',
        severity: 'error',
        category: 'security',
      },
      {
        id: 'NEX002',
        name: 'Unauthorized Nexon',
        description: 'Checks for usage of unauthorized nexons',
        severity: 'error',
        category: 'security',
      },
      {
        id: 'NEX003',
        name: 'Missing Nexon Version',
        description: 'Checks for stages without specified nexon versions',
        severity: 'warning',
        category: 'best-practice',
      },
      {
        id: 'RT001',
        name: 'Unauthorized Runtime Target',
        description: 'Checks for unauthorized runtime targets',
        severity: 'error',
        category: 'security',
      },
      {
        id: 'BP001',
        name: 'Channel Too Complex',
        description: 'Checks if channel exceeds maximum stage count',
        severity: 'warning',
        category: 'best-practice',
      },
      {
        id: 'BP002',
        name: 'Missing Documentation',
        description: 'Checks if channel lacks documentation',
        severity: 'warning',
        category: 'best-practice',
      },
      {
        id: 'BP003',
        name: 'Undocumented Stages',
        description: 'Checks for stages without descriptions',
        severity: 'info',
        category: 'best-practice',
      },
      {
        id: 'COMP001',
        name: 'Potential PHI Handling',
        description: 'Checks for stages that may handle PHI data',
        severity: 'warning',
        category: 'compliance',
      },
    ];
  }
}