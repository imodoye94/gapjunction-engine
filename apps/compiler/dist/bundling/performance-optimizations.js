import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import { Transform, pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { Worker } from 'worker_threads';
/**
 * Performance optimizations for large bundle operations
 */
let BundlingPerformanceOptimizer = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BundlingPerformanceOptimizer = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BundlingPerformanceOptimizer = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new Logger(BundlingPerformanceOptimizer.name);
        /**
         * Create a streaming transform for large artifact processing
         */
        createArtifactStreamTransform() {
            const optimizer = this;
            return new Transform({
                objectMode: true,
                transform(chunk, encoding, callback) {
                    try {
                        // Process chunk with minimal memory footprint
                        const processed = optimizer.processChunk(chunk);
                        callback(null, processed);
                    }
                    catch (error) {
                        callback(error);
                    }
                },
            });
        }
        /**
         * Process artifacts in parallel using worker threads for CPU-intensive operations
         */
        async processArtifactsInParallel(artifacts, processorFunction, maxConcurrency = 4) {
            this.logger.debug('Processing artifacts in parallel', {
                artifactCount: artifacts.length,
                maxConcurrency,
            });
            const results = [];
            const workers = [];
            for (let i = 0; i < artifacts.length; i += maxConcurrency) {
                const batch = artifacts.slice(i, i + maxConcurrency);
                const batchPromises = batch.map(artifact => processorFunction(artifact));
                workers.push(...batchPromises);
                // Process in batches to avoid overwhelming the system
                if (workers.length >= maxConcurrency) {
                    const batchResults = await Promise.all(workers.splice(0, maxConcurrency));
                    results.push(...batchResults);
                }
            }
            // Process remaining workers
            if (workers.length > 0) {
                const remainingResults = await Promise.all(workers);
                results.push(...remainingResults);
            }
            this.logger.debug('Parallel processing completed', {
                resultCount: results.length,
            });
            return results;
        }
        /**
         * Create a memory-efficient streaming hash calculator
         */
        createStreamingHashCalculator(algorithm = 'sha256') {
            const crypto = require('crypto');
            const hash = crypto.createHash(algorithm);
            let totalSize = 0;
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    hash.update(chunk);
                    totalSize += chunk.length;
                    callback(null, chunk); // Pass through the chunk
                },
            });
            const getHash = () => hash.digest('hex');
            return { transform, getHash };
        }
        /**
         * Optimize bundle creation for large files using streaming
         */
        async createOptimizedBundle(artifactPaths, outputPath, options = {}) {
            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            this.logger.debug('Creating optimized bundle', {
                artifactCount: artifactPaths.length,
                outputPath,
                options,
            });
            try {
                const tar = require('tar');
                const { chunkSize = 64 * 1024, compression = true } = options;
                // Create streaming tar archive
                const tarStream = tar.create({
                    gzip: compression,
                    portable: true,
                    noMtime: true,
                    // Optimize for large files
                    maxReadSize: chunkSize,
                }, artifactPaths.map(path => path.split('/').pop()) // Just filenames
                );
                // Stream to output file
                const outputStream = createWriteStream(outputPath);
                await pipeline(tarStream, outputStream);
                // Get final stats
                const stats = await fs.stat(outputPath);
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const result = {
                    bundleSize: stats.size,
                    processingTime: endTime - startTime,
                    memoryUsage: endMemory - startMemory,
                };
                this.logger.debug('Optimized bundle created', result);
                return result;
            }
            catch (error) {
                this.logger.error('Failed to create optimized bundle', error);
                throw error;
            }
        }
        /**
         * Implement incremental hashing for large artifacts
         */
        async computeIncrementalHash(filePath, algorithm = 'sha256', chunkSize = 64 * 1024) {
            const startTime = Date.now();
            const crypto = require('crypto');
            const hash = crypto.createHash(algorithm);
            this.logger.debug('Computing incremental hash', {
                filePath,
                algorithm,
                chunkSize,
            });
            try {
                const stream = createReadStream(filePath, { highWaterMark: chunkSize });
                let size = 0;
                let chunks = 0;
                for await (const chunk of stream) {
                    hash.update(chunk);
                    size += chunk.length;
                    chunks++;
                    // Yield control periodically for large files
                    if (chunks % 1000 === 0) {
                        await new Promise(resolve => setImmediate(resolve));
                    }
                }
                const result = {
                    hash: hash.digest('hex'),
                    size,
                    chunks,
                    processingTime: Date.now() - startTime,
                };
                this.logger.debug('Incremental hash computed', result);
                return result;
            }
            catch (error) {
                this.logger.error('Failed to compute incremental hash', error);
                throw error;
            }
        }
        /**
         * Optimize memory usage during bundle operations
         */
        async withMemoryOptimization(operation, options = {}) {
            const { maxMemoryMB = 512, gcInterval = 1000 } = options;
            const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
            // Monitor memory usage
            const memoryMonitor = setInterval(() => {
                const memUsage = process.memoryUsage();
                if (memUsage.heapUsed > maxMemoryBytes) {
                    this.logger.warn('High memory usage detected', {
                        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                        maxMemoryMB,
                    });
                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                        this.logger.debug('Forced garbage collection');
                    }
                }
            }, gcInterval);
            try {
                const result = await operation();
                return result;
            }
            finally {
                clearInterval(memoryMonitor);
                // Final cleanup
                if (global.gc) {
                    global.gc();
                }
            }
        }
        /**
         * Create a worker thread for CPU-intensive operations
         */
        async runInWorkerThread(workerScript, data, options = {}) {
            const { timeout = 30000 } = options;
            return new Promise((resolve, reject) => {
                const worker = new Worker(workerScript, {
                    workerData: data,
                    transferList: options.transferList,
                });
                const timeoutId = setTimeout(() => {
                    worker.terminate();
                    reject(new Error(`Worker thread timed out after ${timeout}ms`));
                }, timeout);
                worker.on('message', (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                });
                worker.on('error', (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
                worker.on('exit', (code) => {
                    clearTimeout(timeoutId);
                    if (code !== 0) {
                        reject(new Error(`Worker thread exited with code ${code}`));
                    }
                });
            });
        }
        /**
         * Implement caching for frequently accessed artifacts
         */
        artifactCache = new Map();
        async getCachedArtifact(key, generator, ttlMs = 300000 // 5 minutes default
        ) {
            const cached = this.artifactCache.get(key);
            const now = Date.now();
            if (cached && (now - cached.timestamp) < cached.ttl) {
                this.logger.debug('Cache hit for artifact', { key });
                return cached.data;
            }
            this.logger.debug('Cache miss for artifact, generating', { key });
            const data = await generator();
            this.artifactCache.set(key, {
                data,
                timestamp: now,
                ttl: ttlMs,
            });
            // Clean up expired entries periodically
            this.cleanupCache();
            return data;
        }
        cleanupCache() {
            const now = Date.now();
            let cleaned = 0;
            for (const [key, entry] of this.artifactCache.entries()) {
                if ((now - entry.timestamp) > entry.ttl) {
                    this.artifactCache.delete(key);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                this.logger.debug('Cleaned up expired cache entries', { cleaned });
            }
        }
        /**
         * Process chunk with minimal memory allocation
         */
        processChunk(chunk) {
            // Implement efficient chunk processing
            // This is a placeholder for actual chunk processing logic
            return chunk;
        }
        /**
         * Get performance metrics for monitoring
         */
        getPerformanceMetrics() {
            return {
                cacheSize: this.artifactCache.size,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
            };
        }
    };
    return BundlingPerformanceOptimizer = _classThis;
})();
export { BundlingPerformanceOptimizer };
/**
 * Worker thread script for CPU-intensive hashing operations
 */
export const hashingWorkerScript = `
const { parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

async function computeHash(data, algorithm) {
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
}

async function main() {
  try {
    const { data, algorithm } = workerData;
    const result = await computeHash(data, algorithm);
    parentPort.postMessage({ success: true, result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
}

main();
`;
/**
 * Bundle size thresholds for different optimization strategies
 */
export const BUNDLE_SIZE_THRESHOLDS = {
    SMALL: 1024 * 1024, // 1MB
    MEDIUM: 10 * 1024 * 1024, // 10MB
    LARGE: 100 * 1024 * 1024, // 100MB
    XLARGE: 1024 * 1024 * 1024, // 1GB
};
/**
 * Performance optimization strategies based on bundle size
 */
export const OPTIMIZATION_STRATEGIES = {
    [BUNDLE_SIZE_THRESHOLDS.SMALL]: {
        useStreaming: false,
        useWorkerThreads: false,
        chunkSize: 16 * 1024,
        maxConcurrency: 2,
    },
    [BUNDLE_SIZE_THRESHOLDS.MEDIUM]: {
        useStreaming: true,
        useWorkerThreads: false,
        chunkSize: 64 * 1024,
        maxConcurrency: 4,
    },
    [BUNDLE_SIZE_THRESHOLDS.LARGE]: {
        useStreaming: true,
        useWorkerThreads: true,
        chunkSize: 256 * 1024,
        maxConcurrency: 6,
    },
    [BUNDLE_SIZE_THRESHOLDS.XLARGE]: {
        useStreaming: true,
        useWorkerThreads: true,
        chunkSize: 1024 * 1024,
        maxConcurrency: 8,
    },
};
//# sourceMappingURL=performance-optimizations.js.map