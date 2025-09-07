import { Transform } from 'stream';
/**
 * Performance optimizations for large bundle operations
 */
export declare class BundlingPerformanceOptimizer {
    private readonly logger;
    /**
     * Create a streaming transform for large artifact processing
     */
    createArtifactStreamTransform(): Transform;
    /**
     * Process artifacts in parallel using worker threads for CPU-intensive operations
     */
    processArtifactsInParallel<T>(artifacts: T[], processorFunction: (artifact: T) => Promise<any>, maxConcurrency?: number): Promise<any[]>;
    /**
     * Create a memory-efficient streaming hash calculator
     */
    createStreamingHashCalculator(algorithm?: string): {
        transform: Transform;
        getHash: () => string;
    };
    /**
     * Optimize bundle creation for large files using streaming
     */
    createOptimizedBundle(artifactPaths: string[], outputPath: string, options?: {
        compression?: boolean;
        chunkSize?: number;
        maxMemoryUsage?: number;
    }): Promise<{
        bundleSize: number;
        processingTime: number;
        memoryUsage: number;
    }>;
    /**
     * Implement incremental hashing for large artifacts
     */
    computeIncrementalHash(filePath: string, algorithm?: string, chunkSize?: number): Promise<{
        hash: string;
        size: number;
        chunks: number;
        processingTime: number;
    }>;
    /**
     * Optimize memory usage during bundle operations
     */
    withMemoryOptimization<T>(operation: () => Promise<T>, options?: {
        maxMemoryMB?: number;
        gcInterval?: number;
    }): Promise<T>;
    /**
     * Create a worker thread for CPU-intensive operations
     */
    runInWorkerThread<T>(workerScript: string, data: any, options?: {
        timeout?: number;
        transferList?: any[];
    }): Promise<T>;
    /**
     * Implement caching for frequently accessed artifacts
     */
    private artifactCache;
    getCachedArtifact<T>(key: string, generator: () => Promise<T>, ttlMs?: number): Promise<T>;
    private cleanupCache;
    /**
     * Process chunk with minimal memory allocation
     */
    private processChunk;
    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics(): {
        cacheSize: number;
        memoryUsage: NodeJS.MemoryUsage;
        uptime: number;
    };
}
/**
 * Worker thread script for CPU-intensive hashing operations
 */
export declare const hashingWorkerScript = "\nconst { parentPort, workerData } = require('worker_threads');\nconst crypto = require('crypto');\n\nasync function computeHash(data, algorithm) {\n  const hash = crypto.createHash(algorithm);\n  hash.update(data);\n  return hash.digest('hex');\n}\n\nasync function main() {\n  try {\n    const { data, algorithm } = workerData;\n    const result = await computeHash(data, algorithm);\n    parentPort.postMessage({ success: true, result });\n  } catch (error) {\n    parentPort.postMessage({ success: false, error: error.message });\n  }\n}\n\nmain();\n";
/**
 * Bundle size thresholds for different optimization strategies
 */
export declare const BUNDLE_SIZE_THRESHOLDS: {
    SMALL: number;
    MEDIUM: number;
    LARGE: number;
    XLARGE: number;
};
/**
 * Performance optimization strategies based on bundle size
 */
export declare const OPTIMIZATION_STRATEGIES: {
    [BUNDLE_SIZE_THRESHOLDS.SMALL]: {
        useStreaming: boolean;
        useWorkerThreads: boolean;
        chunkSize: number;
        maxConcurrency: number;
    };
    [BUNDLE_SIZE_THRESHOLDS.MEDIUM]: {
        useStreaming: boolean;
        useWorkerThreads: boolean;
        chunkSize: number;
        maxConcurrency: number;
    };
    [BUNDLE_SIZE_THRESHOLDS.LARGE]: {
        useStreaming: boolean;
        useWorkerThreads: boolean;
        chunkSize: number;
        maxConcurrency: number;
    };
    [BUNDLE_SIZE_THRESHOLDS.XLARGE]: {
        useStreaming: boolean;
        useWorkerThreads: boolean;
        chunkSize: number;
        maxConcurrency: number;
    };
};
//# sourceMappingURL=performance-optimizations.d.ts.map