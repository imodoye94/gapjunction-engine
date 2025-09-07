import { createHash } from 'crypto';
import { MerkleTree } from 'merkletreejs';
const HASH_ALGORITHM = 'sha256';
const NODE_RED_ID_LENGTH = 15;
export class HashingService {
    _hashAlgorithm = HASH_ALGORITHM;
    _nodeRedIdLength = NODE_RED_ID_LENGTH;
    /**
     * Compute SHA-256 hash of a string or buffer
     */
    computeHash(data) {
        return createHash(this._hashAlgorithm)
            .update(data)
            .digest('hex');
    }
    /**
     * Compute hash with file metadata
     */
    computeFileHash(filename, data) {
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
    createMerkleTree(fileHashes) {
        const leaves = fileHashes.map(fh => Buffer.from(fh.hash, 'hex'));
        const tree = new MerkleTree(leaves, createHash(this._hashAlgorithm));
        const root = tree.getRoot().toString('hex');
        return { tree, root };
    }
    /**
     * Compute comprehensive bundle hashes including Merkle root
     */
    computeBundleHashes(artifacts, bundleBuffer) {
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
    verifyBundleIntegrity(fileHash, merkleRoot, proof, allFileHashes) {
        try {
            const leaves = allFileHashes.map(fh => Buffer.from(fh.hash, 'hex'));
            const tree = new MerkleTree(leaves, createHash(this._hashAlgorithm));
            const leaf = Buffer.from(fileHash, 'hex');
            const proofBuffers = proof.map(p => Buffer.from(p, 'hex'));
            return tree.verify(proofBuffers, leaf, Buffer.from(merkleRoot, 'hex'));
        }
        catch {
            return false;
        }
    }
    /**
     * Generate deterministic Node-RED compatible ID
     */
    generateNodeRedId(input) {
        const hash = this.computeHash(input);
        return `n${hash.substring(0, this._nodeRedIdLength)}`;
    }
}
//# sourceMappingURL=hashing.service.js.map