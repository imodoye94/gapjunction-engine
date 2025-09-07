import { createHash } from 'crypto';
export class IdGeneratorService {
    /**
     * Generate deterministic flow ID for a channel
     */
    generateFlowId(channelId) {
        return this._generateDeterministicId('flow', channelId);
    }
    /**
     * Generate deterministic node ID for a stage
     */
    generateNodeId(stageId, templateNodeId) {
        const suffix = templateNodeId ? `-${templateNodeId}` : '';
        return this._generateDeterministicId('node', `${stageId}${suffix}`);
    }
    /**
     * Generate fallback node ID when template processing fails
     */
    generateFallbackNodeId(stageId) {
        return this._generateDeterministicId('fallback', stageId);
    }
    /**
     * Generate deterministic ID using SHA-256 hash
     */
    _generateDeterministicId(prefix, input) {
        const hash = createHash('sha256')
            .update(`${prefix}:${input}`)
            .digest('hex');
        // Take first 16 characters for Node-RED compatibility
        return `n${hash.substring(0, 15)}`;
    }
}
//# sourceMappingURL=id-generator.service.js.map