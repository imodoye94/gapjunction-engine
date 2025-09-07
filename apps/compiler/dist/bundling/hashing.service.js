import { __esDecorate, __runInitializers } from "tslib";
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { MerkleTree } from 'merkletreejs';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
let HashingService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HashingService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            HashingService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new Logger(HashingService.name);
        defaultAlgorithm = 'sha256';
        /**
         * Compute SHA-256 hash of a string or buffer
         */
        computeHash(data, algorithm = this.defaultAlgorithm) {
            const hash = createHash(algorithm);
            hash.update(data);
            return {
                algorithm,
                hash: hash.digest('hex'),
                size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8'),
            };
        }
        /**
         * Compute hash of a file using streaming for memory efficiency
         */
        async computeFileHash(filePath, algorithm = this.defaultAlgorithm) {
            this.logger.debug('Computing file hash', { filePath, algorithm });
            const hash = createHash(algorithm);
            let size = 0;
            try {
                const stream = createReadStream(filePath);
                await pipeline(stream, async function* (source) {
                    for await (const chunk of source) {
                        size += chunk.length;
                        hash.update(chunk);
                        yield chunk;
                    }
                }, async function (source) {
                    // Consume the stream to complete hashing
                    for await (const chunk of source) {
                        // Stream consumed for hashing
                    }
                });
                const result = {
                    algorithm,
                    hash: hash.digest('hex'),
                    size,
                };
                this.logger.debug('File hash computed', { filePath, hash: result.hash, size });
                return result;
            }
            catch (error) {
                this.logger.error('Failed to compute file hash', error, { filePath });
                throw new Error(`Failed to compute hash for file ${filePath}: ${error.message}`);
            }
        }
        /**
         * Compute hashes for all artifacts
         */
        computeArtifactHashes(artifacts) {
            this.logger.debug('Computing artifact hashes');
            try {
                const flowsJsonData = JSON.stringify(artifacts.flowsJson, null, 2);
                const settingsData = typeof artifacts.settings === 'string'
                    ? artifacts.settings
                    : JSON.stringify(artifacts.settings, null, 2);
                const manifestData = JSON.stringify(artifacts.manifest, null, 2);
                const credentialsMapData = JSON.stringify(artifacts.credentialsMap, null, 2);
                const hashes = {
                    flowsJson: this.computeHash(flowsJsonData),
                    settings: this.computeHash(settingsData),
                    manifest: this.computeHash(manifestData),
                    credentialsMap: this.computeHash(credentialsMapData),
                };
                this.logger.debug('Artifact hashes computed', {
                    flowsJsonHash: hashes.flowsJson.hash,
                    settingsHash: hashes.settings.hash,
                    manifestHash: hashes.manifest.hash,
                    credentialsMapHash: hashes.credentialsMap.hash,
                });
                return hashes;
            }
            catch (error) {
                this.logger.error('Failed to compute artifact hashes', error);
                throw new Error(`Failed to compute artifact hashes: ${error.message}`);
            }
        }
        /**
         * Create Merkle tree from artifact hashes for blockchain anchoring
         */
        createMerkleTree(artifactHashes) {
            this.logger.debug('Creating Merkle tree from artifact hashes');
            try {
                // Extract hash values in deterministic order
                const hashValues = [
                    Buffer.from(artifactHashes.flowsJson.hash, 'hex'),
                    Buffer.from(artifactHashes.settings.hash, 'hex'),
                    Buffer.from(artifactHashes.manifest.hash, 'hex'),
                    Buffer.from(artifactHashes.credentialsMap.hash, 'hex'),
                ];
                // Create Merkle tree with SHA-256
                const tree = new MerkleTree(hashValues, (data) => createHash('sha256').update(data).digest(), {
                    sortPairs: true, // Ensure deterministic tree structure
                    duplicateOdd: true, // Handle odd number of leaves
                });
                const merkleRoot = tree.getRoot().toString('hex');
                // Generate proofs for each artifact
                const merkleProofs = {
                    flowsJson: tree.getProof(hashValues[0]).map(proof => proof.data.toString('hex')),
                    settings: tree.getProof(hashValues[1]).map(proof => proof.data.toString('hex')),
                    manifest: tree.getProof(hashValues[2]).map(proof => proof.data.toString('hex')),
                    credentialsMap: tree.getProof(hashValues[3]).map(proof => proof.data.toString('hex')),
                };
                this.logger.debug('Merkle tree created', {
                    merkleRoot,
                    leafCount: hashValues.length,
                });
                return {
                    merkleRoot,
                    merkleProofs,
                    tree,
                };
            }
            catch (error) {
                this.logger.error('Failed to create Merkle tree', error);
                throw new Error(`Failed to create Merkle tree: ${error.message}`);
            }
        }
        /**
         * Verify Merkle proof for an artifact hash
         */
        verifyMerkleProof(artifactHash, merkleProof, merkleRoot) {
            try {
                const leaf = Buffer.from(artifactHash, 'hex');
                const proof = merkleProof.map(p => ({ data: Buffer.from(p, 'hex'), position: 'left' }));
                const root = Buffer.from(merkleRoot, 'hex');
                // Create a temporary tree to verify the proof
                const verified = MerkleTree.verify(proof, leaf, root, (data) => createHash('sha256').update(data).digest(), {
                    sortPairs: true,
                });
                this.logger.debug('Merkle proof verification', {
                    artifactHash,
                    merkleRoot,
                    verified,
                });
                return verified;
            }
            catch (error) {
                this.logger.error('Failed to verify Merkle proof', error, {
                    artifactHash,
                    merkleRoot,
                });
                return false;
            }
        }
        /**
         * Create complete bundle hashes including Merkle root
         */
        async createBundleHashes(artifacts, bundleBuffer, bundleFilePath) {
            this.logger.debug('Creating complete bundle hashes');
            try {
                // Compute individual artifact hashes
                const artifactHashes = this.computeArtifactHashes(artifacts);
                // Create Merkle tree
                const { merkleRoot, merkleProofs } = this.createMerkleTree(artifactHashes);
                // Compute bundle hash
                let bundleHash;
                if (bundleBuffer) {
                    bundleHash = this.computeHash(bundleBuffer);
                }
                else if (bundleFilePath) {
                    bundleHash = await this.computeFileHash(bundleFilePath);
                }
                else {
                    throw new Error('Either bundleBuffer or bundleFilePath must be provided');
                }
                const result = {
                    artifactHashes,
                    bundleHash,
                    merkleRoot,
                    merkleProofs,
                };
                this.logger.log('Bundle hashes created successfully', {
                    bundleHash: bundleHash.hash,
                    merkleRoot,
                    bundleSize: bundleHash.size,
                });
                return result;
            }
            catch (error) {
                this.logger.error('Failed to create bundle hashes', error);
                throw new Error(`Failed to create bundle hashes: ${error.message}`);
            }
        }
        /**
         * Verify bundle integrity by checking all hashes
         */
        async verifyBundleIntegrity(artifacts, expectedHashes, bundleBuffer, bundleFilePath) {
            this.logger.debug('Verifying bundle integrity');
            const errors = [];
            let artifactsValid = true;
            let bundleValid = true;
            let merkleValid = true;
            try {
                // Verify artifact hashes
                const actualArtifactHashes = this.computeArtifactHashes(artifacts);
                const artifactKeys = ['flowsJson', 'settings', 'manifest', 'credentialsMap'];
                for (const key of artifactKeys) {
                    if (actualArtifactHashes[key].hash !== expectedHashes.artifactHashes[key].hash) {
                        errors.push(`${key} hash mismatch: expected ${expectedHashes.artifactHashes[key].hash}, got ${actualArtifactHashes[key].hash}`);
                        artifactsValid = false;
                    }
                }
                // Verify bundle hash
                let actualBundleHash;
                if (bundleBuffer) {
                    actualBundleHash = this.computeHash(bundleBuffer);
                }
                else if (bundleFilePath) {
                    actualBundleHash = await this.computeFileHash(bundleFilePath);
                }
                else {
                    errors.push('Either bundleBuffer or bundleFilePath must be provided for verification');
                    bundleValid = false;
                }
                if (bundleValid && actualBundleHash.hash !== expectedHashes.bundleHash.hash) {
                    errors.push(`Bundle hash mismatch: expected ${expectedHashes.bundleHash.hash}, got ${actualBundleHash.hash}`);
                    bundleValid = false;
                }
                // Verify Merkle root
                const { merkleRoot: actualMerkleRoot } = this.createMerkleTree(actualArtifactHashes);
                if (actualMerkleRoot !== expectedHashes.merkleRoot) {
                    errors.push(`Merkle root mismatch: expected ${expectedHashes.merkleRoot}, got ${actualMerkleRoot}`);
                    merkleValid = false;
                }
                const valid = artifactsValid && bundleValid && merkleValid;
                this.logger.debug('Bundle integrity verification completed', {
                    valid,
                    artifactsValid,
                    bundleValid,
                    merkleValid,
                    errorCount: errors.length,
                });
                return {
                    valid,
                    errors,
                    details: {
                        artifactsValid,
                        bundleValid,
                        merkleValid,
                    },
                };
            }
            catch (error) {
                this.logger.error('Failed to verify bundle integrity', error);
                return {
                    valid: false,
                    errors: [`Verification failed: ${error.message}`],
                    details: {
                        artifactsValid: false,
                        bundleValid: false,
                        merkleValid: false,
                    },
                };
            }
        }
        /**
         * Generate deterministic hash for reproducible builds
         * Ensures same input always produces same hash regardless of system
         */
        computeDeterministicHash(data, algorithm = this.defaultAlgorithm) {
            // Normalize data for deterministic hashing
            let normalizedData;
            if (typeof data === 'string') {
                normalizedData = data;
            }
            else if (Buffer.isBuffer(data)) {
                normalizedData = data.toString('hex');
            }
            else {
                // For objects, use deterministic JSON serialization
                normalizedData = JSON.stringify(data, Object.keys(data).sort());
            }
            return this.computeHash(normalizedData, algorithm);
        }
    };
    return HashingService = _classThis;
})();
export { HashingService };
//# sourceMappingURL=hashing.service.js.map