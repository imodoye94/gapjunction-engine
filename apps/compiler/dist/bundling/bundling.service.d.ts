import { HashingService, BundleHashes } from './hashing.service';
export interface BundleOptions {
    buildId: string;
    compression?: 'gzip' | 'none';
    includeMetadata?: boolean;
    tempDir?: string;
}
export interface BundleResult {
    bundleBuffer: Buffer;
    bundleSize: number;
    bundlePath?: string;
    hashes: BundleHashes;
    metadata: BundleMetadata;
}
export interface BundleMetadata {
    buildId: string;
    timestamp: string;
    version: string;
    artifacts: {
        count: number;
        totalSize: number;
        files: Array<{
            name: string;
            size: number;
            hash: string;
        }>;
    };
    compression: string;
}
export interface TempFileManager {
    tempDir: string;
    files: string[];
    cleanup: () => Promise<void>;
}
export declare class BundlingService {
    private readonly hashingService;
    private readonly logger;
    private readonly defaultTempDir;
    constructor(hashingService: HashingService);
    /**
     * Create a .tgz bundle from generated artifacts
     */
    createBundle(artifacts: {
        flowsJson: any;
        settings: any;
        manifest: any;
        credentialsMap: any;
    }, options: BundleOptions): Promise<BundleResult>;
    /**
     * Create a streaming bundle for large artifacts
     */
    createStreamingBundle(artifacts: {
        flowsJson: any;
        settings: any;
        manifest: any;
        credentialsMap: any;
    }, outputPath: string, options: BundleOptions): Promise<{
        bundlePath: string;
        bundleSize: number;
        hashes: BundleHashes;
        metadata: BundleMetadata;
    }>;
    /**
     * Extract and verify a bundle
     */
    extractBundle(bundlePath: string, extractPath: string, expectedHashes?: BundleHashes): Promise<{
        artifacts: {
            flowsJson: any;
            settings: any;
            manifest: any;
            credentialsMap: any;
        };
        metadata?: BundleMetadata;
        verified: boolean;
        verificationErrors?: string[];
    }>;
    /**
     * Create temporary file manager for bundle operations
     */
    private createTempFileManager;
    /**
     * Write artifacts to temporary files
     */
    private writeArtifactsToFiles;
    /**
     * Create bundle metadata
     */
    private createBundleMetadata;
    /**
     * Create .tgz bundle using tar
     */
    private createTarGzBundle;
    /**
     * Read extracted artifacts from directory
     */
    private readExtractedArtifacts;
    /**
     * Get bundle information without extracting
     */
    getBundleInfo(bundlePath: string): Promise<{
        size: number;
        hash: string;
        files: string[];
        metadata?: BundleMetadata;
    }>;
}
//# sourceMappingURL=bundling.service.d.ts.map