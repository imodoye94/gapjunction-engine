import { MerkleTree } from 'merkletreejs';
export interface FileHash {
    filename: string;
    hash: string;
    size: number;
}
export interface BundleHashes {
    artifactHashes: {
        flowsJson: FileHash;
        settings: FileHash;
        manifest: FileHash;
        credentialsMap: FileHash;
    };
    bundleHash: FileHash;
    merkleRoot: string;
}
export declare class HashingService {
    private readonly _hashAlgorithm;
    private readonly _nodeRedIdLength;
    /**
     * Compute SHA-256 hash of a string or buffer
     */
    computeHash(data: string | Buffer): string;
    /**
     * Compute hash with file metadata
     */
    computeFileHash(filename: string, data: string | Buffer): FileHash;
    /**
     * Create Merkle tree from file hashes for integrity verification
     */
    createMerkleTree(fileHashes: FileHash[]): {
        tree: MerkleTree;
        root: string;
    };
    /**
     * Compute comprehensive bundle hashes including Merkle root
     */
    computeBundleHashes(artifacts: {
        flowsJson: unknown;
        settings: unknown;
        manifest: unknown;
        credentialsMap: unknown;
    }, bundleBuffer: Buffer): BundleHashes;
    /**
     * Verify bundle integrity using Merkle proof
     */
    verifyBundleIntegrity(fileHash: string, merkleRoot: string, proof: string[], allFileHashes: FileHash[]): boolean;
    /**
     * Generate deterministic Node-RED compatible ID
     */
    generateNodeRedId(input: string): string;
}
//# sourceMappingURL=hashing.service.d.ts.map