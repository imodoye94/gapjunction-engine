import { MerkleTree } from 'merkletreejs';
export interface HashResult {
    algorithm: string;
    hash: string;
    size: number;
}
export interface ArtifactHashes {
    flowsJson: HashResult;
    settings: HashResult;
    manifest: HashResult;
    credentialsMap: HashResult;
}
export interface BundleHashes {
    artifactHashes: ArtifactHashes;
    bundleHash: HashResult;
    merkleRoot: string;
    merkleProofs?: Record<string, string[]>;
}
export declare class HashingService {
    private readonly logger;
    private readonly defaultAlgorithm;
    /**
     * Compute SHA-256 hash of a string or buffer
     */
    computeHash(data: string | Buffer, algorithm?: string): HashResult;
    /**
     * Compute hash of a file using streaming for memory efficiency
     */
    computeFileHash(filePath: string, algorithm?: string): Promise<HashResult>;
    /**
     * Compute hashes for all artifacts
     */
    computeArtifactHashes(artifacts: {
        flowsJson: any;
        settings: any;
        manifest: any;
        credentialsMap: any;
    }): ArtifactHashes;
    /**
     * Create Merkle tree from artifact hashes for blockchain anchoring
     */
    createMerkleTree(artifactHashes: ArtifactHashes): {
        merkleRoot: string;
        merkleProofs: Record<string, string[]>;
        tree: MerkleTree;
    };
    /**
     * Verify Merkle proof for an artifact hash
     */
    verifyMerkleProof(artifactHash: string, merkleProof: string[], merkleRoot: string): boolean;
    /**
     * Create complete bundle hashes including Merkle root
     */
    createBundleHashes(artifacts: {
        flowsJson: any;
        settings: any;
        manifest: any;
        credentialsMap: any;
    }, bundleBuffer?: Buffer, bundleFilePath?: string): Promise<BundleHashes>;
    /**
     * Verify bundle integrity by checking all hashes
     */
    verifyBundleIntegrity(artifacts: {
        flowsJson: any;
        settings: any;
        manifest: any;
        credentialsMap: any;
    }, expectedHashes: BundleHashes, bundleBuffer?: Buffer, bundleFilePath?: string): Promise<{
        valid: boolean;
        errors: string[];
        details: {
            artifactsValid: boolean;
            bundleValid: boolean;
            merkleValid: boolean;
        };
    }>;
    /**
     * Generate deterministic hash for reproducible builds
     * Ensures same input always produces same hash regardless of system
     */
    computeDeterministicHash(data: any, algorithm?: string): HashResult;
}
//# sourceMappingURL=hashing.service.d.ts.map