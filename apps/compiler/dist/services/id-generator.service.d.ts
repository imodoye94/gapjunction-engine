export declare class IdGeneratorService {
    /**
     * Generate deterministic flow ID for a channel
     */
    generateFlowId(channelId: string): string;
    /**
     * Generate deterministic node ID for a stage
     */
    generateNodeId(stageId: string, templateNodeId?: string): string;
    /**
     * Generate fallback node ID when template processing fails
     */
    generateFallbackNodeId(stageId: string): string;
    /**
     * Generate deterministic ID using SHA-256 hash
     */
    private _generateDeterministicId;
}
//# sourceMappingURL=id-generator.service.d.ts.map