export declare class IdGeneratorService {
    /**
     * Generate a deterministic ID based on input components
     * Uses SHA-256 hash to ensure deterministic but unique IDs
     */
    generateDeterministicId(...components: string[]): string;
    /**
     * Generate a flow tab ID
     */
    generateFlowId(channelId: string): string;
    /**
     * Generate a node ID
     */
    generateNodeId(stageId: string, templateNodeId: string): string;
    /**
     * Generate a fallback node ID
     */
    generateFallbackNodeId(stageId: string): string;
    /**
     * Generate a build-specific ID that includes build context
     */
    generateBuildSpecificId(buildId: string, ...components: string[]): string;
    /**
     * Validate that an ID is Node-RED compatible
     */
    isValidNodeRedId(id: string): boolean;
    /**
     * Sanitize a string to be used in ID generation
     */
    sanitizeForId(input: string): string;
}
//# sourceMappingURL=id-generator.service.d.ts.map