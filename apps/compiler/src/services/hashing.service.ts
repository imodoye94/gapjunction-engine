import { createHash } from 'crypto';

import { MerkleTree } from 'merkletreejs';

interface FileHash {
  filename: string;
  hash: string;
  size: number;
}

interface BundleHashes {
  artifactHashes: {
    flowsJson: FileHash;
    settings: FileHash;
    manifest: FileHash;
    credentialsMap: FileHash;
  };
  bundleHash: FileHash;
  merkleRoot: string;
}

const HASH_ALGORITHM = 'sha256';
const NODE_RED_ID_LENGTH = 15;

class HashingService {
  private readonly _hashAlgorithm = HASH_ALGORITHM;
  private readonly _nodeRedIdLength = NODE_RED_ID_LENGTH;

  /**
   * Compute SHA-256 hash of a string or buffer
   */
  computeHash(data: string | Buffer): string {
    return createHash(this._hashAlgorithm)
      .update(data)
      .digest('hex');
  }

  /**
   * Compute hash with file metadata
   */
  computeFileHash(filename: string, data: string | Buffer): FileHash {
    const hash = this.computeHash(data);
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    
    return {
      filename,
      hash,
      size
    };
  }

  /**
   * Create Merkle tree from file hashes for integrity verification
   */
  createMerkleTree(fileHashes: FileHash[]): { tree: MerkleTree; root: string } {
    const leaves = fileHashes.map(fh => Buffer.from(fh.hash, 'hex'));
    const hashFunction = (data: Buffer): Buffer => createHash(this._hashAlgorithm).update(data).digest();
    const tree = new MerkleTree(leaves, hashFunction);
    const root = tree.getRoot().toString('hex');
    
    return { tree, root };
  }

  /**
   * Compute comprehensive bundle hashes including Merkle root
   */
  computeBundleHashes(artifacts: {
    flowsJson: unknown;
    settings: unknown;
    manifest: unknown;
    credentialsMap: unknown;
  }, bundleBuffer: Buffer): BundleHashes {
    // Compute individual artifact hashes
    const artifactHashes = {
      flowsJson: this.computeFileHash('flows.json', JSON.stringify(artifacts.flowsJson)),
      settings: this.computeFileHash('settings.js', JSON.stringify(artifacts.settings)),
      manifest: this.computeFileHash('manifest.json', JSON.stringify(artifacts.manifest)),
      credentialsMap: this.computeFileHash('credentials.map.json', JSON.stringify(artifacts.credentialsMap))
    };

    // Compute bundle hash
    const bundleHash = this.computeFileHash('bundle.tgz', bundleBuffer);

    // Create Merkle tree for integrity verification
    const fileHashes = Object.values(artifactHashes);
    const { root: merkleRoot } = this.createMerkleTree(fileHashes);

    return {
      artifactHashes,
      bundleHash,
      merkleRoot
    };
  }

  /**
   * Verify bundle integrity using Merkle proof
   */
  verifyBundleIntegrity(
    fileHash: string,
    merkleRoot: string,
    proof: string[],
    allFileHashes: FileHash[]
  ): boolean {
    try {
      const leaves = allFileHashes.map(fh => Buffer.from(fh.hash, 'hex'));
      const hashFunction = (data: Buffer): Buffer => createHash(this._hashAlgorithm).update(data).digest();
      const tree = new MerkleTree(leaves, hashFunction);
      const leaf = Buffer.from(fileHash, 'hex');
      const proofBuffers = proof.map(p => Buffer.from(p, 'hex'));
      
      return tree.verify(proofBuffers, leaf, Buffer.from(merkleRoot, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Generate deterministic Node-RED compatible ID
   */
  generateNodeRedId(input: string): string {
    const hash = this.computeHash(input);
    return `n${hash.substring(0, this._nodeRedIdLength)}`;
  }
}

export type { FileHash, BundleHashes };
export { HashingService };