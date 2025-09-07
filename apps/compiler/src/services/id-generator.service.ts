import { createHash } from 'crypto';

export class IdGeneratorService {
  /**
   * Generate deterministic flow ID for a channel
   */
  generateFlowId(channelId: string): string {
    return this._generateDeterministicId('flow', channelId);
  }

  /**
   * Generate deterministic node ID for a stage
   */
  generateNodeId(stageId: string, templateNodeId?: string): string {
    const suffix = templateNodeId ? `-${templateNodeId}` : '';
    return this._generateDeterministicId('node', `${stageId}${suffix}`);
  }

  /**
   * Generate fallback node ID when template processing fails
   */
  generateFallbackNodeId(stageId: string): string {
    return this._generateDeterministicId('fallback', stageId);
  }

  /**
   * Generate deterministic ID using SHA-256 hash
   */
  // Node-RED node IDs must be 15 characters for compatibility
  // eslint-disable-next-line @typescript-eslint/naming-convention, no-magic-numbers
  private static readonly NODE_RED_ID_LENGTH = 15 as const;

  private _generateDeterministicId(prefix: string, input: string): string {
    const hash = createHash('sha256')
      .update(`${prefix}:${input}`)
      .digest('hex');
    
    // Take first 15 characters for Node-RED compatibility
    return `n${hash.substring(0, IdGeneratorService.NODE_RED_ID_LENGTH)}`;
  }
}