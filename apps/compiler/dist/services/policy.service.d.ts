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
        allowedNexonIds: string[] | null;
        blockedNexonIds: string[];
        maxStagesPerChannel: number;
        requireDocumentation: boolean;
        allowedRuntimeTargets: RuntimeTarget[];
    };
}
export declare class PolicyService {
    private readonly defaultOrgPolicy;
    constructor();
    /**
     * Performs comprehensive policy linting on a channel
     */
    lintChannel(channel: ChannelIR, orgId?: string, acknowledgedViolations?: string[]): Promise<PolicyLintResult>;
    /**
     * Check security-related policies
     */
    private _checkSecurityPolicies;
    /**
     * Check nexon capabilities against org policies
     */
    private _checkNexonCapabilities;
    /**
     * Check runtime target policies
     */
    private _checkRuntimeTarget;
    /**
     * Check best practices
     */
    private _checkBestPractices;
    /**
     * Check compliance requirements
     */
    private _checkCompliance;
    /**
     * Get organization-specific policy (placeholder for future implementation)
     */
    private _getOrgPolicy;
    /**
     * Convert policy setting to severity level
     */
    private _getSeverityFromPolicy;
    /**
     * Calculate violation summary
     */
    private _calculateSummary;
    /**
     * Get available policy rules for documentation
     */
    getPolicyRules(): PolicyRule[];
}
//# sourceMappingURL=policy.service.d.ts.map