import { Test, TestingModule } from '@nestjs/testing';
import { BundlingService } from '../src/bundling/bundling.service';
import { HashingService } from '../src/bundling/hashing.service';
import { ArtifactsService } from '../src/artifacts/artifacts.service';
import { CompilerService } from '../src/compiler/compiler.service';
import { ValidationService } from '../src/validation/validation.service';
import { PolicyService } from '../src/policy/policy.service';
import { NexonTemplateService } from '../src/nexon/nexon-template.service';
import { ParameterSubstitutionService } from '../src/nexon/parameter-substitution.service';
import { IdGeneratorService } from '../src/artifacts/id-generator.service';
import { ChannelIR } from '@gj/ir-schema';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ulid } from 'ulid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Bundling Integration Tests', () => {
  let bundlingService: BundlingService;
  let hashingService: HashingService;
  let artifactsService: ArtifactsService;
  let compilerService: CompilerService;
  let tempDir: string;

  const testChannel: ChannelIR = {
    channelId: 'integration-test-channel',
    title: 'Integration Test Channel',
    documentation: 'Test channel for bundling integration',
    version: 1,
    runtime: {
      target: 'onprem',
    },
    security: {
      allowInternetHttpOut: false,
      allowInternetTcpOut: false,
      allowInternetUdpOut: false,
      allowHttpInPublic: false,
    },
    stages: [
      {
        id: 'stage-1',
        title: 'HTTP Request Stage',
        nexonId: 'http.request',
        nexonVersion: '1.0.0',
        params: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        position: { x: 100, y: 100 },
      },
      {
        id: 'stage-2',
        title: 'Transform Stage',
        nexonId: 'transform.json',
        nexonVersion: '1.0.0',
        params: {
          expression: 'payload.data',
        },
        position: { x: 300, y: 100 },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        from: { stageId: 'stage-1', outlet: 'success' },
        to: { stageId: 'stage-2', inlet: 'input' },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BundlingService,
        HashingService,
        ArtifactsService,
        CompilerService,
        ValidationService,
        PolicyService,
        NexonTemplateService,
        ParameterSubstitutionService,
        IdGeneratorService,
      ],
    }).compile();

    bundlingService = module.get<BundlingService>(BundlingService);
    hashingService = module.get<HashingService>(HashingService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    compilerService = module.get<CompilerService>(CompilerService);
    
    tempDir = join(tmpdir(), `bundling-integration-${ulid()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Bundling Pipeline', () => {
    it('should generate artifacts and create bundle with hashes', async () => {
      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      expect(artifacts.flowsJson).toBeDefined();
      expect(artifacts.settings).toBeDefined();
      expect(artifacts.manifest).toBeDefined();
      expect(artifacts.credentialsMap).toBeDefined();

      // Create bundle
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
      expect(bundleResult.bundleSize).toBeGreaterThan(0);
      expect(bundleResult.hashes).toBeDefined();
      expect(bundleResult.hashes.artifactHashes).toBeDefined();
      expect(bundleResult.hashes.bundleHash).toBeDefined();
      expect(bundleResult.hashes.merkleRoot).toBeDefined();
      expect(bundleResult.metadata).toBeDefined();
      expect(bundleResult.metadata.buildId).toBe(buildId);
    });

    it('should create reproducible bundles', async () => {
      const buildId = ulid();
      
      // Generate artifacts twice
      const artifacts1 = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      const artifacts2 = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create bundles
      const bundle1 = await bundlingService.createBundle(artifacts1, {
        buildId,
        compression: 'gzip',
      });

      const bundle2 = await bundlingService.createBundle(artifacts2, {
        buildId,
        compression: 'gzip',
      });

      // Hashes should be identical for same input
      expect(bundle1.hashes.artifactHashes.flowsJson.hash).toBe(bundle2.hashes.artifactHashes.flowsJson.hash);
      expect(bundle1.hashes.artifactHashes.settings.hash).toBe(bundle2.hashes.artifactHashes.settings.hash);
      expect(bundle1.hashes.artifactHashes.manifest.hash).toBe(bundle2.hashes.artifactHashes.manifest.hash);
      expect(bundle1.hashes.artifactHashes.credentialsMap.hash).toBe(bundle2.hashes.artifactHashes.credentialsMap.hash);
      expect(bundle1.hashes.merkleRoot).toBe(bundle2.hashes.merkleRoot);
    });

    it('should verify bundle integrity after extraction', async () => {
      const buildId = ulid();
      
      // Generate artifacts and create bundle
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      // Write bundle to file
      const bundlePath = join(tempDir, 'test-bundle.tgz');
      await fs.writeFile(bundlePath, bundleResult.bundleBuffer);

      // Extract and verify
      const extractPath = join(tempDir, 'extracted');
      const extractResult = await bundlingService.extractBundle(
        bundlePath,
        extractPath,
        bundleResult.hashes
      );

      expect(extractResult.verified).toBe(true);
      expect(extractResult.verificationErrors).toBeUndefined();
      expect(extractResult.artifacts).toBeDefined();
      expect(extractResult.metadata).toBeDefined();

      // Verify extracted artifacts match original
      expect(extractResult.artifacts.flowsJson).toEqual(artifacts.flowsJson);
      expect(extractResult.artifacts.settings).toEqual(artifacts.settings);
      expect(extractResult.artifacts.manifest).toEqual(artifacts.manifest);
      expect(extractResult.artifacts.credentialsMap).toEqual(artifacts.credentialsMap);
    });

    it('should handle large channel with many stages', async () => {
      // Create a larger channel
      const largeChannel: ChannelIR = {
        ...testChannel,
        channelId: 'large-test-channel',
        stages: Array.from({ length: 50 }, (_, i) => ({
          id: `stage-${i + 1}`,
          title: `Stage ${i + 1}`,
          nexonId: 'http.request',
          nexonVersion: '1.0.0',
          params: {
            url: `https://api.example.com/endpoint-${i + 1}`,
            method: 'GET',
          },
          position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 150 },
        })),
        edges: Array.from({ length: 49 }, (_, i) => ({
          id: `edge-${i + 1}`,
          from: { stageId: `stage-${i + 1}`, outlet: 'success' },
          to: { stageId: `stage-${i + 2}`, inlet: 'input' },
        })),
      };

      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(largeChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create bundle
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
      expect(bundleResult.bundleSize).toBeGreaterThan(1000); // Should be substantial
      expect(bundleResult.hashes.merkleRoot).toBeTruthy();
      
      // Verify flows contain all stages
      expect(Array.isArray(artifacts.flowsJson)).toBe(true);
      const flows = artifacts.flowsJson as any[];
      const nodes = flows.filter(f => f.type !== 'tab');
      expect(nodes.length).toBeGreaterThan(50); // At least one node per stage
    });

    it('should create streaming bundle for large artifacts', async () => {
      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create streaming bundle
      const outputPath = join(tempDir, 'streaming-bundle.tgz');
      const streamingResult = await bundlingService.createStreamingBundle(
        artifacts,
        outputPath,
        {
          buildId,
          compression: 'gzip',
          includeMetadata: true,
        }
      );

      expect(streamingResult.bundlePath).toBe(outputPath);
      expect(streamingResult.bundleSize).toBeGreaterThan(0);
      expect(streamingResult.hashes).toBeDefined();

      // Verify file exists and has correct size
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBe(streamingResult.bundleSize);

      // Verify bundle can be extracted
      const extractPath = join(tempDir, 'streaming-extracted');
      const extractResult = await bundlingService.extractBundle(
        outputPath,
        extractPath,
        streamingResult.hashes
      );

      expect(extractResult.verified).toBe(true);
    });

    it('should handle bundle with secrets in credentials map', async () => {
      // Create channel with secrets
      const channelWithSecrets: ChannelIR = {
        ...testChannel,
        stages: [
          {
            id: 'stage-with-secret',
            title: 'Stage with Secret',
            nexonId: 'http.request',
            nexonVersion: '1.0.0',
            params: {
              url: 'https://api.example.com/secure',
              method: 'POST',
              headers: {
                'Authorization': {
                  secret: {
                    ref: 'api-token',
                  },
                },
              },
              body: {
                apiKey: {
                  secret: {
                    ref: 'api-key',
                  },
                },
              },
            },
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      };

      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(channelWithSecrets, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Verify credentials map contains secret references
      expect(artifacts.credentialsMap.credentials).toBeDefined();
      const credentials = artifacts.credentialsMap.credentials;
      expect(Object.keys(credentials).length).toBeGreaterThan(0);

      // Create bundle
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
      expect(bundleResult.hashes.artifactHashes.credentialsMap.hash).toBeTruthy();

      // Extract and verify credentials are preserved
      const bundlePath = join(tempDir, 'secrets-bundle.tgz');
      await fs.writeFile(bundlePath, bundleResult.bundleBuffer);

      const extractPath = join(tempDir, 'secrets-extracted');
      const extractResult = await bundlingService.extractBundle(bundlePath, extractPath);

      expect(extractResult.artifacts.credentialsMap.credentials).toEqual(credentials);
    });

    it('should generate valid Merkle proofs for blockchain anchoring', async () => {
      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create bundle
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
      });

      const { artifactHashes, merkleRoot, merkleProofs } = bundleResult.hashes;

      // Verify each artifact has a valid proof
      expect(
        hashingService.verifyMerkleProof(
          artifactHashes.flowsJson.hash,
          merkleProofs!.flowsJson,
          merkleRoot
        )
      ).toBe(true);

      expect(
        hashingService.verifyMerkleProof(
          artifactHashes.settings.hash,
          merkleProofs!.settings,
          merkleRoot
        )
      ).toBe(true);

      expect(
        hashingService.verifyMerkleProof(
          artifactHashes.manifest.hash,
          merkleProofs!.manifest,
          merkleRoot
        )
      ).toBe(true);

      expect(
        hashingService.verifyMerkleProof(
          artifactHashes.credentialsMap.hash,
          merkleProofs!.credentialsMap,
          merkleRoot
        )
      ).toBe(true);
    });

    it('should handle different compression options', async () => {
      const buildId = ulid();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create compressed bundle
      const compressedBundle = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
      });

      // Create uncompressed bundle
      const uncompressedBundle = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'none',
      });

      // Compressed should be smaller
      expect(compressedBundle.bundleSize).toBeLessThan(uncompressedBundle.bundleSize);

      // But artifact hashes should be the same
      expect(compressedBundle.hashes.artifactHashes.flowsJson.hash).toBe(
        uncompressedBundle.hashes.artifactHashes.flowsJson.hash
      );
      expect(compressedBundle.hashes.merkleRoot).toBe(uncompressedBundle.hashes.merkleRoot);

      // Bundle hashes should be different (different compression)
      expect(compressedBundle.hashes.bundleHash.hash).not.toBe(
        uncompressedBundle.hashes.bundleHash.hash
      );
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle bundle creation within reasonable time', async () => {
      const buildId = ulid();
      const startTime = Date.now();
      
      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create bundle
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        compression: 'gzip',
        includeMetadata: true,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should clean up temporary files after bundle creation', async () => {
      const buildId = ulid();
      const customTempDir = join(tempDir, 'cleanup-test');
      await fs.mkdir(customTempDir, { recursive: true });

      // Generate artifacts
      const artifacts = await artifactsService.generateArtifacts(testChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Create bundle with custom temp directory
      const bundleResult = await bundlingService.createBundle(artifacts, {
        buildId,
        tempDir: customTempDir,
      });

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);

      // Check that temp directory is empty (files cleaned up)
      const files = await fs.readdir(customTempDir);
      expect(files.length).toBe(0);
    });
  });
});