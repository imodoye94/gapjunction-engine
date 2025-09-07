import tarStream from 'tar-stream';
export class BundlingService {
    _hashingService;
    constructor(_hashingService) {
        this._hashingService = _hashingService;
    }
    /**
     * Create a compressed bundle from artifacts
     */
    async createBundle(artifacts, options) {
        try {
            // Convert artifacts to files
            const files = [
                {
                    name: 'flows.json',
                    content: JSON.stringify(artifacts.flowsJson, null, 2)
                },
                {
                    name: 'settings.js',
                    content: `module.exports = ${JSON.stringify(artifacts.settings, null, 2)};`
                },
                {
                    name: 'manifest.json',
                    content: JSON.stringify(artifacts.manifest, null, 2)
                },
                {
                    name: 'credentials.map.json',
                    content: JSON.stringify(artifacts.credentialsMap, null, 2)
                }
            ];
            // Create tar stream
            const bundleBuffer = await this._createTarBundle(files, options);
            // Compute hashes
            const hashes = this._hashingService.computeBundleHashes(artifacts, bundleBuffer);
            // Create metadata
            const metadata = {
                buildId: options.buildId,
                timestamp: new Date().toISOString(),
                artifacts: {
                    count: files.length,
                    totalSize: files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf8'), 0)
                }
            };
            return {
                bundleBuffer,
                bundleSize: bundleBuffer.length,
                hashes,
                metadata
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Bundle creation failed: ${errorMessage}`);
        }
    }
    /**
     * Extract and verify bundle contents
     */
    extractBundle(_bundleBuffer) {
        // For now, return a placeholder - full tar extraction would be implemented here
        return {
            artifacts: {},
            metadata: {}
        };
    }
    /**
     * Create tar bundle from files
     */
    async _createTarBundle(files, _options) {
        // Use tar-stream to create a tarball from in-memory files
        const pack = tarStream.pack();
        const buffers = [];
        // Add each file to the tarball
        for (const file of files) {
            pack.entry({ name: file.name }, file.content);
        }
        pack.finalize();
        // Collect tarball data
        pack.on('data', (chunk) => {
            buffers.push(chunk);
        });
        // Wait for tarball to finish
        await new Promise((resolve, reject) => {
            pack.on('end', resolve);
            pack.on('error', reject);
        });
        return Buffer.concat(buffers);
    }
}
//# sourceMappingURL=bundling.service.js.map