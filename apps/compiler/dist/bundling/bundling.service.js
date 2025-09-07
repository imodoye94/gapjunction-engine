import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { ulid } from 'ulid';
import * as tar from 'tar';
let BundlingService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BundlingService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            BundlingService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        hashingService;
        logger = new Logger(BundlingService.name);
        defaultTempDir = join(tmpdir(), 'gj-compiler');
        constructor(hashingService) {
            this.hashingService = hashingService;
        }
        /**
         * Create a .tgz bundle from generated artifacts
         */
        async createBundle(artifacts, options) {
            this.logger.log('Creating bundle', {
                buildId: options.buildId,
                compression: options.compression || 'gzip',
            });
            const tempManager = await this.createTempFileManager(options.tempDir);
            try {
                // Write artifacts to temporary files
                const artifactFiles = await this.writeArtifactsToFiles(artifacts, tempManager.tempDir);
                // Create bundle metadata
                const metadata = await this.createBundleMetadata(artifactFiles, options);
                // Write metadata file if requested
                if (options.includeMetadata !== false) {
                    const metadataPath = join(tempManager.tempDir, 'bundle.metadata.json');
                    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                    artifactFiles.push({
                        name: 'bundle.metadata.json',
                        path: metadataPath,
                        size: (await fs.stat(metadataPath)).size,
                    });
                    tempManager.files.push(metadataPath);
                }
                // Create .tgz bundle
                const bundlePath = join(tempManager.tempDir, `${options.buildId}.tgz`);
                await this.createTarGzBundle(artifactFiles, bundlePath, options);
                tempManager.files.push(bundlePath);
                // Read bundle into buffer
                const bundleBuffer = await fs.readFile(bundlePath);
                const bundleSize = bundleBuffer.length;
                // Compute all hashes
                const hashes = await this.hashingService.createBundleHashes(artifacts, bundleBuffer);
                this.logger.log('Bundle created successfully', {
                    buildId: options.buildId,
                    bundleSize,
                    artifactCount: artifactFiles.length,
                    bundleHash: hashes.bundleHash.hash,
                });
                return {
                    bundleBuffer,
                    bundleSize,
                    bundlePath,
                    hashes,
                    metadata,
                };
            }
            catch (error) {
                this.logger.error('Failed to create bundle', error, {
                    buildId: options.buildId,
                });
                throw new Error(`Failed to create bundle: ${error.message}`);
            }
            finally {
                // Clean up temporary files
                await tempManager.cleanup();
            }
        }
        /**
         * Create a streaming bundle for large artifacts
         */
        async createStreamingBundle(artifacts, outputPath, options) {
            this.logger.log('Creating streaming bundle', {
                buildId: options.buildId,
                outputPath,
            });
            const tempManager = await this.createTempFileManager(options.tempDir);
            try {
                // Write artifacts to temporary files
                const artifactFiles = await this.writeArtifactsToFiles(artifacts, tempManager.tempDir);
                // Create bundle metadata
                const metadata = await this.createBundleMetadata(artifactFiles, options);
                // Write metadata file
                if (options.includeMetadata !== false) {
                    const metadataPath = join(tempManager.tempDir, 'bundle.metadata.json');
                    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                    artifactFiles.push({
                        name: 'bundle.metadata.json',
                        path: metadataPath,
                        size: (await fs.stat(metadataPath)).size,
                    });
                    tempManager.files.push(metadataPath);
                }
                // Create streaming .tgz bundle
                await this.createTarGzBundle(artifactFiles, outputPath, options);
                // Get bundle size
                const bundleStats = await fs.stat(outputPath);
                const bundleSize = bundleStats.size;
                // Compute hashes using file path for memory efficiency
                const hashes = await this.hashingService.createBundleHashes(artifacts, undefined, outputPath);
                this.logger.log('Streaming bundle created successfully', {
                    buildId: options.buildId,
                    bundleSize,
                    outputPath,
                    bundleHash: hashes.bundleHash.hash,
                });
                return {
                    bundlePath: outputPath,
                    bundleSize,
                    hashes,
                    metadata,
                };
            }
            catch (error) {
                this.logger.error('Failed to create streaming bundle', error, {
                    buildId: options.buildId,
                    outputPath,
                });
                throw new Error(`Failed to create streaming bundle: ${error.message}`);
            }
            finally {
                // Clean up temporary files (but not the output bundle)
                await tempManager.cleanup();
            }
        }
        /**
         * Extract and verify a bundle
         */
        async extractBundle(bundlePath, extractPath, expectedHashes) {
            this.logger.log('Extracting bundle', { bundlePath, extractPath });
            try {
                // Ensure extract directory exists
                await fs.mkdir(extractPath, { recursive: true });
                // Extract .tgz bundle
                await tar.extract({
                    file: bundlePath,
                    cwd: extractPath,
                    gzip: true,
                });
                // Read extracted artifacts
                const artifacts = await this.readExtractedArtifacts(extractPath);
                // Read metadata if present
                let metadata;
                const metadataPath = join(extractPath, 'bundle.metadata.json');
                try {
                    const metadataContent = await fs.readFile(metadataPath, 'utf8');
                    metadata = JSON.parse(metadataContent);
                }
                catch (error) {
                    this.logger.debug('No metadata file found or failed to read', { metadataPath });
                }
                // Verify bundle if expected hashes provided
                let verified = true;
                let verificationErrors;
                if (expectedHashes) {
                    const verification = await this.hashingService.verifyBundleIntegrity(artifacts, expectedHashes, undefined, bundlePath);
                    verified = verification.valid;
                    verificationErrors = verification.errors;
                }
                this.logger.log('Bundle extracted successfully', {
                    bundlePath,
                    extractPath,
                    verified,
                    hasMetadata: !!metadata,
                });
                return {
                    artifacts,
                    metadata,
                    verified,
                    verificationErrors,
                };
            }
            catch (error) {
                this.logger.error('Failed to extract bundle', error, { bundlePath, extractPath });
                throw new Error(`Failed to extract bundle: ${error.message}`);
            }
        }
        /**
         * Create temporary file manager for bundle operations
         */
        async createTempFileManager(customTempDir) {
            const tempDir = customTempDir || join(this.defaultTempDir, ulid());
            await fs.mkdir(tempDir, { recursive: true });
            const files = [];
            const cleanup = async () => {
                this.logger.debug('Cleaning up temporary files', { tempDir, fileCount: files.length });
                try {
                    // Remove individual files first
                    for (const file of files) {
                        try {
                            await fs.unlink(file);
                        }
                        catch (error) {
                            this.logger.debug('Failed to remove temp file', { file, error: error.message });
                        }
                    }
                    // Remove temp directory if it's our created one
                    if (!customTempDir) {
                        try {
                            await fs.rm(tempDir, { recursive: true, force: true });
                        }
                        catch (error) {
                            this.logger.debug('Failed to remove temp directory', { tempDir, error: error.message });
                        }
                    }
                }
                catch (error) {
                    this.logger.warn('Cleanup failed', error, { tempDir });
                }
            };
            return { tempDir, files, cleanup };
        }
        /**
         * Write artifacts to temporary files
         */
        async writeArtifactsToFiles(artifacts, tempDir) {
            const files = [];
            // Write flows.json
            const flowsPath = join(tempDir, 'flows.json');
            const flowsContent = JSON.stringify(artifacts.flowsJson, null, 2);
            await fs.writeFile(flowsPath, flowsContent);
            files.push({
                name: 'flows.json',
                path: flowsPath,
                size: Buffer.byteLength(flowsContent, 'utf8'),
            });
            // Write settings.js
            const settingsPath = join(tempDir, 'settings.js');
            const settingsContent = typeof artifacts.settings === 'string'
                ? artifacts.settings
                : `module.exports = ${JSON.stringify(artifacts.settings, null, 2)};`;
            await fs.writeFile(settingsPath, settingsContent);
            files.push({
                name: 'settings.js',
                path: settingsPath,
                size: Buffer.byteLength(settingsContent, 'utf8'),
            });
            // Write manifest.json
            const manifestPath = join(tempDir, 'manifest.json');
            const manifestContent = JSON.stringify(artifacts.manifest, null, 2);
            await fs.writeFile(manifestPath, manifestContent);
            files.push({
                name: 'manifest.json',
                path: manifestPath,
                size: Buffer.byteLength(manifestContent, 'utf8'),
            });
            // Write credentials.map.json
            const credentialsPath = join(tempDir, 'credentials.map.json');
            const credentialsContent = JSON.stringify(artifacts.credentialsMap, null, 2);
            await fs.writeFile(credentialsPath, credentialsContent);
            files.push({
                name: 'credentials.map.json',
                path: credentialsPath,
                size: Buffer.byteLength(credentialsContent, 'utf8'),
            });
            return files;
        }
        /**
         * Create bundle metadata
         */
        async createBundleMetadata(artifactFiles, options) {
            const totalSize = artifactFiles.reduce((sum, file) => sum + file.size, 0);
            // Compute hashes for metadata
            const filesWithHashes = await Promise.all(artifactFiles.map(async (file) => ({
                name: file.name,
                size: file.size,
                hash: (await this.hashingService.computeFileHash(file.path)).hash,
            })));
            return {
                buildId: options.buildId,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                artifacts: {
                    count: artifactFiles.length,
                    totalSize,
                    files: filesWithHashes,
                },
                compression: options.compression || 'gzip',
            };
        }
        /**
         * Create .tgz bundle using tar
         */
        async createTarGzBundle(files, outputPath, options) {
            this.logger.debug('Creating tar.gz bundle', {
                outputPath,
                fileCount: files.length,
                compression: options.compression,
            });
            try {
                // Ensure output directory exists
                await fs.mkdir(dirname(outputPath), { recursive: true });
                const tarOptions = {
                    file: outputPath,
                    gzip: options.compression !== 'none',
                    portable: true, // For reproducible builds
                    noMtime: true, // For reproducible builds
                    prefix: '', // No prefix for clean structure
                    cwd: dirname(files[0].path), // Use the temp directory as base
                };
                // Create tar archive
                await tar.create(tarOptions, files.map(f => f.name));
                this.logger.debug('Tar.gz bundle created successfully', { outputPath });
            }
            catch (error) {
                this.logger.error('Failed to create tar.gz bundle', error, { outputPath });
                throw new Error(`Failed to create tar.gz bundle: ${error.message}`);
            }
        }
        /**
         * Read extracted artifacts from directory
         */
        async readExtractedArtifacts(extractPath) {
            try {
                // Read flows.json
                const flowsContent = await fs.readFile(join(extractPath, 'flows.json'), 'utf8');
                const flowsJson = JSON.parse(flowsContent);
                // Read settings.js (handle both JS module and JSON formats)
                const settingsPath = join(extractPath, 'settings.js');
                let settings;
                try {
                    const settingsContent = await fs.readFile(settingsPath, 'utf8');
                    if (settingsContent.startsWith('module.exports')) {
                        // Extract JSON from module.exports
                        const jsonMatch = settingsContent.match(/module\.exports\s*=\s*({[\s\S]*});?$/);
                        if (jsonMatch) {
                            settings = JSON.parse(jsonMatch[1]);
                        }
                        else {
                            throw new Error('Could not parse settings.js module.exports');
                        }
                    }
                    else {
                        settings = JSON.parse(settingsContent);
                    }
                }
                catch (error) {
                    this.logger.warn('Failed to parse settings.js, using raw content', { error: error.message });
                    settings = await fs.readFile(settingsPath, 'utf8');
                }
                // Read manifest.json
                const manifestContent = await fs.readFile(join(extractPath, 'manifest.json'), 'utf8');
                const manifest = JSON.parse(manifestContent);
                // Read credentials.map.json
                const credentialsContent = await fs.readFile(join(extractPath, 'credentials.map.json'), 'utf8');
                const credentialsMap = JSON.parse(credentialsContent);
                return {
                    flowsJson,
                    settings,
                    manifest,
                    credentialsMap,
                };
            }
            catch (error) {
                this.logger.error('Failed to read extracted artifacts', error, { extractPath });
                throw new Error(`Failed to read extracted artifacts: ${error.message}`);
            }
        }
        /**
         * Get bundle information without extracting
         */
        async getBundleInfo(bundlePath) {
            this.logger.debug('Getting bundle info', { bundlePath });
            try {
                // Get bundle size and hash
                const stats = await fs.stat(bundlePath);
                const hash = (await this.hashingService.computeFileHash(bundlePath)).hash;
                // List files in bundle
                const files = [];
                await tar.list({
                    file: bundlePath,
                    onentry: (entry) => {
                        files.push(entry.path);
                    },
                });
                // Try to extract and read metadata
                let metadata;
                if (files.includes('bundle.metadata.json')) {
                    const tempDir = join(this.defaultTempDir, `info-${ulid()}`);
                    try {
                        await fs.mkdir(tempDir, { recursive: true });
                        // Extract only metadata file
                        await tar.extract({
                            file: bundlePath,
                            cwd: tempDir,
                            filter: (path) => path === 'bundle.metadata.json',
                        });
                        const metadataContent = await fs.readFile(join(tempDir, 'bundle.metadata.json'), 'utf8');
                        metadata = JSON.parse(metadataContent);
                        // Cleanup
                        await fs.rm(tempDir, { recursive: true, force: true });
                    }
                    catch (error) {
                        this.logger.debug('Failed to read metadata from bundle', { error: error.message });
                    }
                }
                return {
                    size: stats.size,
                    hash,
                    files,
                    metadata,
                };
            }
            catch (error) {
                this.logger.error('Failed to get bundle info', error, { bundlePath });
                throw new Error(`Failed to get bundle info: ${error.message}`);
            }
        }
    };
    return BundlingService = _classThis;
})();
export { BundlingService };
//# sourceMappingURL=bundling.service.js.map