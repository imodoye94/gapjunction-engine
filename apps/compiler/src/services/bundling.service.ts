import tarStream from 'tar-stream';

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

export class BundlingService {
  constructor(private readonly _hashingService: HashingService) {}

  /**
   * Create a compressed bundle from artifacts
   */
  async createBundle(
    artifacts: {
      flowsJson: unknown;
      settings: unknown;
      manifest: unknown;
      credentialsMap: unknown;
    },
    options: BundleOptions
  ): Promise<BundleResult> {
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
      const metadata: BundleMetadata = {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Bundle creation failed: ${errorMessage}`);
    }
  }

  /**
   * Extract and verify bundle contents
   */
  extractBundle(_bundleBuffer: Buffer): {
    artifacts: Record<string, string>;
    metadata: Record<string, unknown>;
  } {
    // For now, return a placeholder - full tar extraction would be implemented here
    return {
      artifacts: {},
      metadata: {}
    };
  }

  /**
   * Create tar bundle from files
   */
  private async _createTarBundle(
    files: Array<{ name: string; content: string }>,
    _options: BundleOptions
  ): Promise<Buffer> {
    // Use tar-stream to create a tarball from in-memory files
    const pack = tarStream.pack();
    const buffers: Buffer[] = [];

    // Add each file to the tarball
    for (const file of files) {
      pack.entry({ name: file.name }, file.content);
    }
    pack.finalize();

    // Collect tarball data
    pack.on('data', (chunk: Buffer) => {
      buffers.push(chunk);
    });

    // Wait for tarball to finish
    await new Promise<void>((resolve, reject) => {
      pack.on('end', resolve);
      pack.on('error', reject);
    });

    return Buffer.concat(buffers);
  }
}