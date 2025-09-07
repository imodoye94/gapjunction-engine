import type { BundleHashes, HashingService } from './hashing.service.js';
export interface BundleOptions {
    buildId: string;
    compression?: 'gzip' | 'none';
    includeMetadata?: boolean;
}
export interface BundleMetadata {
    buildId: string;
    timestamp: string;
    artifacts: {
        count: number;
        totalSize: number;
    };
}
export interface BundleResult {
    bundleBuffer: Buffer;
    bundleSize: number;
    hashes: BundleHashes;
    metadata: BundleMetadata;
}
export declare class BundlingService {
    private readonly _hashingService;
    constructor(_hashingService: HashingService);
    /**
     * Create a compressed bundle from artifacts
     */
    createBundle(artifacts: {
        flowsJson: unknown;
        settings: unknown;
        manifest: unknown;
        credentialsMap: unknown;
    }, options: BundleOptions): Promise<BundleResult>;
    /**
     * Extract and verify bundle contents
     */
    extractBundle(_bundleBuffer: Buffer): {
        artifacts: Record<string, string>;
        metadata: Record<string, unknown>;
    };
    /**
     * Create tar bundle from files
     */
    private _createTarBundle;
}
//# sourceMappingURL=bundling.service.d.ts.map