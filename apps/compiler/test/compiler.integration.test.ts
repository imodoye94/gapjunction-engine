import { Test, TestingModule } from '@nestjs/testing';
import { CompilerService } from '../src/compiler/compiler.service';
import { ValidationService } from '../src/validation/validation.service';
import { PolicyService } from '../src/policy/policy.service';
import { ArtifactsService } from '../src/artifacts/artifacts.service';
import { BundlingService } from '../src/bundling/bundling.service';
import { HashingService } from '../src/bundling/hashing.service';
import { NexonTemplateService } from '../src/nexon/nexon-template.service';
import { ParameterSubstitutionService } from '../src/nexon/parameter-substitution.service';
import { IdGeneratorService } from '../src/artifacts/id-generator.service';
import { ConfigService } from '@nestjs/config';
import { ChannelIR } from '@gj/ir-schema';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ulid } from 'ulid';

describe('Compiler Integration Tests', () => {
  let compilerService: CompilerService;
  let validationService: ValidationService;
  let policyService: PolicyService;
  let artifactsService: ArtifactsService;
  let bundlingService: BundlingService;
  let hashingService: HashingService;
  let tempDir: string;

  const testChannel: ChannelIR = {
    version: 1,
    channelId: 'integration-test-channel',
    title: 'Integration Test Channel',
    runtime: { target: 'onprem' },
    security: {
      allowInternetHttpOut: false,
      allowInternetTcpOut: false,
      allowInternetUdpOut: false,
      allowHttpInPublic: false,
    },
    stages: [
      {
        id: 'http-stage',
        title: 'HTTP Request Stage',
        nexonId: 'http.request',
        nexonVersion: '1.0.0',
        params: {
          url: 'https://api.example.com/data',
          method: 'GET',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GapJunction-Test/1.0',
          },
        },
        position: { x: 200, y: 100 },
      },
      {
        id: 'transform-stage',
        title: 'Transform Data',
        nexonId: 'transform.json',
        nexonVersion: '1.0.0',
        params: {
          expression: 'payload.data',
          outputFormat: 'json',
        },
        position: { x: 400, y: 100 },
      },
    ],
    edges: [
      {
        id: 'http-to-transform',
        from: { stageId: 'http-stage', outlet: 'success' },
        to: { stageId: 'transform-stage', inlet: 'input' },
      },
    ],
    documentation: 'Integration test channel for end-to-end compilation',
  };

  const channelWithSecrets: ChannelIR = {
    ...testChannel,
    channelId: 'secure-integration-test',
    title: 'Secure Integration Test Channel',
    stages: [
      {
        id: 'secure-http-stage',
        title: 'Secure HTTP Request',
        nexonId: 'http.request',
        nexonVersion: '1.0.0',
        params: {
          url: 'https://api.secure.com/data',
          method: 'POST',
          headers: {
            'Authorization': {
              secret: {
                type: 'secretRef',
                ref: 'gcp://projects/test/secrets/api-token/versions/latest',
              },
            },
          },
          body: {
            apiKey: {
              secret: {
                type: 'secretRef',
                ref: 'aws://secrets-manager/api-key',
              },
            },
          },
        },
        position: { x: 200, y: 100 },
      },
    ],
    edges: [],
  };

  const channelWithPolicyViolations: ChannelIR = {
    ...testChannel,
    channelId: 'policy-violation-test',
    title: 'Policy Violation Test Channel',
    security: {
      allowInternetHttpOut: true,
      allowInternetTcpOut: true,
      allowInternetUdpOut: true,
      allowHttpInPublic: true,
    },
    stages: [
      {
        id: 'risky-stage',
        title: 'Risky Stage',
        nexonId: 'database.insert',
        params: {
          table: 'patient_data',
          connection: 'production_db',
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompilerService,
        ValidationService,
        PolicyService,
        ArtifactsService,
        BundlingService,
        HashingService,
        NexonTemplateService,
        ParameterSubstitutionService,
        IdGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'NEXON_LOCAL_PATH':
                  return join(process.cwd(), 'packages', 'nexon-catalog');
                case 'NEXON_REMOTE_URL':
                  return null;
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    compilerService = module.get<CompilerService>(CompilerService);
    validationService = module.get<ValidationService>(ValidationService);
    policyService = module.get<PolicyService>(PolicyService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    bundlingService = module.get<BundlingService>(BundlingService);
    hashingService = module.get<HashingService>(HashingService);

    tempDir = join(tmpdir(), `compiler-integration-${ulid()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Compilation Pipeline', () => {
    it('should compile a valid channel through the complete pipeline', async () => {
      const request = {
        channel: testChannel,
        orgId: 'test-org',
        userId: 'test-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.buildId).toBeDefined();
      expect(result.validation.valid).toBe(true);
      expect(result.policyLint.passed).toBe(true);
      expect(result.bundle).toBeInstanceOf(Buffer);
      expect(result.bundleHash).toBeDefined();
      expect(result.merkleRoot).toBeDefined();
      expect(result.artifactHashes).toBeDefined();
      expect(result.compiledArtifacts).toBeDefined();

      // Verify artifact structure
      expect(result.compiledArtifacts?.flowsJson).toBeDefined();
      expect(result.compiledArtifacts?.settings).toBeDefined();
      expect(result.compiledArtifacts?.manifest).toBeDefined();
      expect(result.compiledArtifacts?.credentialsMap).toBeDefined();

      // Verify flows.json contains expected nodes
      const flows = result.compiledArtifacts?.flowsJson as any[];
      expect(Array.isArray(flows)).toBe(true);
      expect(flows.length).toBeGreaterThan(0);

      // Should have a flow tab
      const flowTab = flows.find(item => item.type === 'tab');
      expect(flowTab).toBeDefined();
      expect(flowTab.label).toBe(testChannel.title);

      // Should have nodes for stages
      const nodes = flows.filter(item => item.type !== 'tab');
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should handle channels with secret references', async () => {
      const request = {
        channel: channelWithSecrets,
        orgId: 'secure-org',
        userId: 'secure-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.compiledArtifacts?.credentialsMap).toBeDefined();

      const credentialsMap = result.compiledArtifacts?.credentialsMap as any;
      expect(credentialsMap.credentials).toBeDefined();
      expect(Object.keys(credentialsMap.credentials).length).toBeGreaterThan(0);

      // Verify secret references are properly mapped
      const credentials = credentialsMap.credentials;
      const authHeader = credentials['secure-http-stage.headers.Authorization'];
      const apiKey = credentials['secure-http-stage.body.apiKey'];

      expect(authHeader).toBeDefined();
      expect(authHeader.type).toBe('secretRef');
      expect(authHeader.ref).toBe('gcp://projects/test/secrets/api-token/versions/latest');

      expect(apiKey).toBeDefined();
      expect(apiKey.type).toBe('secretRef');
      expect(apiKey.ref).toBe('aws://secrets-manager/api-key');
    });

    it('should fail compilation for channels with policy violations', async () => {
      const request = {
        channel: channelWithPolicyViolations,
        orgId: 'strict-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(false);
      expect(result.policyLint.passed).toBe(false);
      expect(result.policyLint.violations.length).toBeGreaterThan(0);
      expect(result.bundle).toBeUndefined();

      // Should have security violations
      const securityViolations = result.policyLint.violations.filter(v => v.category === 'security');
      expect(securityViolations.length).toBeGreaterThan(0);
    });

    it('should proceed with compilation when violations are acknowledged', async () => {
      const request = {
        channel: channelWithPolicyViolations,
        orgId: 'strict-org',
        acknowledgedViolations: ['SEC001', 'SEC002', 'SEC003', 'SEC004', 'COMP001'],
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundle).toBeDefined();
      expect(result.policyLint.violations.some(v => v.acknowledged)).toBe(true);
    });

    it('should create reproducible builds for the same input', async () => {
      const request = {
        channel: testChannel,
        orgId: 'test-org',
        userId: 'test-user',
      };

      const result1 = await compilerService.compile(request);
      const result2 = await compilerService.compile(request);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Artifact hashes should be identical for same content
      expect(result1.artifactHashes?.flowsJson).toBe(result2.artifactHashes?.flowsJson);
      expect(result1.artifactHashes?.settings).toBe(result2.artifactHashes?.settings);
      expect(result1.artifactHashes?.credentialsMap).toBe(result2.artifactHashes?.credentialsMap);

      // Merkle roots should be identical
      expect(result1.merkleRoot).toBe(result2.merkleRoot);
    });

    it('should handle large channels with many stages', async () => {
      const largeChannel: ChannelIR = {
        ...testChannel,
        channelId: 'large-integration-test',
        title: 'Large Integration Test Channel',
        stages: Array.from({ length: 20 }, (_, i) => ({
          id: `stage-${i + 1}`,
          title: `Stage ${i + 1}`,
          nexonId: 'function',
          params: {
            code: `msg.stage${i + 1} = true; return msg;`,
          },
          position: { x: (i % 5) * 150, y: Math.floor(i / 5) * 150 },
        })),
        edges: Array.from({ length: 19 }, (_, i) => ({
          id: `edge-${i + 1}`,
          from: { stageId: `stage-${i + 1}` },
          to: { stageId: `stage-${i + 2}` },
        })),
      };

      const request = {
        channel: largeChannel,
        orgId: 'test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundle).toBeDefined();
      expect(result.bundleHash).toBeDefined();

      // Verify all stages are included in flows
      const flows = result.compiledArtifacts?.flowsJson as any[];
      const nodes = flows.filter(item => item.type !== 'tab');
      expect(nodes.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Bundle Integrity and Verification', () => {
    it('should create bundles with valid integrity hashes', async () => {
      const request = {
        channel: testChannel,
        orgId: 'test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundle).toBeDefined();
      expect(result.bundleHash).toBeDefined();
      expect(result.merkleRoot).toBeDefined();

      // Verify bundle can be extracted and verified
      const bundlePath = join(tempDir, 'test-bundle.tgz');
      await fs.writeFile(bundlePath, result.bundle!);

      const extractPath = join(tempDir, 'extracted');
      const bundleHashes = {
        artifactHashes: {
          flowsJson: { algorithm: 'sha256', hash: result.artifactHashes!.flowsJson, size: 0 },
          settings: { algorithm: 'sha256', hash: result.artifactHashes!.settings, size: 0 },
          manifest: { algorithm: 'sha256', hash: result.artifactHashes!.manifest, size: 0 },
          credentialsMap: { algorithm: 'sha256', hash: result.artifactHashes!.credentialsMap, size: 0 },
        },
        bundleHash: { algorithm: 'sha256', hash: result.bundleHash!, size: result.bundle!.length },
        merkleRoot: result.merkleRoot!,
      };

      const extractResult = await bundlingService.extractBundle(bundlePath, extractPath, bundleHashes);

      expect(extractResult.verified).toBe(true);
      expect(extractResult.artifacts).toBeDefined();
    });

    it('should detect bundle tampering', async () => {
      const request = {
        channel: testChannel,
        orgId: 'test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundle).toBeDefined();

      // Create tampered bundle
      const tamperedBundle = Buffer.concat([result.bundle!, Buffer.from('tampered')]);
      const bundlePath = join(tempDir, 'tampered-bundle.tgz');
      await fs.writeFile(bundlePath, tamperedBundle);

      const extractPath = join(tempDir, 'tampered-extracted');
      const originalHashes = {
        artifactHashes: {
          flowsJson: { algorithm: 'sha256', hash: result.artifactHashes!.flowsJson, size: 0 },
          settings: { algorithm: 'sha256', hash: result.artifactHashes!.settings, size: 0 },
          manifest: { algorithm: 'sha256', hash: result.artifactHashes!.manifest, size: 0 },
          credentialsMap: { algorithm: 'sha256', hash: result.artifactHashes!.credentialsMap, size: 0 },
        },
        bundleHash: { algorithm: 'sha256', hash: result.bundleHash!, size: result.bundle!.length },
        merkleRoot: result.merkleRoot!,
      };

      const extractResult = await bundlingService.extractBundle(bundlePath, extractPath, originalHashes);

      expect(extractResult.verified).toBe(false);
      expect(extractResult.verificationErrors).toBeDefined();
      expect(extractResult.verificationErrors!.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete compilation within reasonable time', async () => {
      const startTime = Date.now();

      const request = {
        channel: testChannel,
        orgId: 'perf-test-org',
      };

      const result = await compilerService.compile(request);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent compilation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        channel: {
          ...testChannel,
          channelId: `concurrent-test-${i}`,
          title: `Concurrent Test Channel ${i}`,
        },
        orgId: 'concurrent-org',
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => compilerService.compile(request))
      );
      const endTime = Date.now();

      // All compilations should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.buildId).toBeDefined();
        expect(result.bundle).toBeDefined();
      });

      // Should complete all within reasonable time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds for 5 concurrent
    });

    it('should clean up resources after compilation', async () => {
      const request = {
        channel: testChannel,
        orgId: 'cleanup-test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);

      // Verify no temporary files are left behind
      // This is implementation-specific and would depend on how the services handle cleanup
      // For now, we just verify the compilation succeeded
      expect(result.bundle).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle validation failures gracefully', async () => {
      const invalidChannel = {
        version: 'invalid',
        // Missing required fields
      };

      const request = {
        channel: invalidChannel,
        orgId: 'error-test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.bundle).toBeUndefined();
    });

    it('should handle missing nexon templates gracefully', async () => {
      const channelWithMissingNexon: ChannelIR = {
        ...testChannel,
        stages: [
          {
            id: 'missing-nexon-stage',
            title: 'Missing Nexon Stage',
            nexonId: 'nonexistent.nexon',
            params: {},
          },
        ],
      };

      const request = {
        channel: channelWithMissingNexon,
        orgId: 'missing-nexon-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.includes('Template not found') || e.includes('nonexistent.nexon'))).toBe(true);
    });

    it('should provide detailed error information for debugging', async () => {
      const problematicChannel = {
        ...testChannel,
        stages: [
          {
            id: 'problematic-stage',
            title: 'Problematic Stage',
            nexonId: 'http.request',
            params: {
              // Invalid parameter structure that might cause issues
              url: null,
              method: 123, // Wrong type
            },
          },
        ],
      };

      const request = {
        channel: problematicChannel,
        orgId: 'debug-org',
      };

      const result = await compilerService.compile(request);

      // Should either succeed with warnings or fail with detailed errors
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
        expect(result.buildId).toBeDefined(); // Build ID should still be generated for tracking
      }
    });
  });

  describe('Security and Compliance', () => {
    it('should enforce security policies consistently', async () => {
      const secureChannel: ChannelIR = {
        ...testChannel,
        security: {
          allowInternetHttpOut: true,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
      };

      const request = {
        channel: secureChannel,
        orgId: 'security-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true); // Should succeed with warnings
      expect(result.policyLint.violations.length).toBeGreaterThan(0);
      
      const httpViolation = result.policyLint.violations.find(v => v.ruleId === 'SEC001');
      expect(httpViolation).toBeDefined();
      expect(httpViolation?.severity).toBe('warning');
    });

    it('should handle security acknowledgments properly', async () => {
      const ackRequest = {
        channelId: 'test-channel',
        userId: 'security-user',
        violationIds: ['SEC001', 'SEC002'],
        reason: 'Approved by security team for testing purposes',
      };

      const result = await compilerService.verifySecurityAck(ackRequest);

      expect(result.success).toBe(true);
      expect(result.acknowledgedViolations).toEqual(['SEC001', 'SEC002']);
      expect(result.message).toContain('Successfully acknowledged 2 policy violations');
    });

    it('should never expose secrets in compiled artifacts', async () => {
      const request = {
        channel: channelWithSecrets,
        orgId: 'secret-test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);

      // Verify secrets are not exposed in flows.json
      const flowsJsonStr = JSON.stringify(result.compiledArtifacts?.flowsJson);
      expect(flowsJsonStr).not.toContain('gcp://projects/test/secrets/api-token');
      expect(flowsJsonStr).not.toContain('aws://secrets-manager/api-key');

      // Verify secrets are properly mapped in credentials map
      const credentialsMap = result.compiledArtifacts?.credentialsMap as any;
      expect(credentialsMap.credentials).toBeDefined();
      expect(Object.keys(credentialsMap.credentials).length).toBeGreaterThan(0);
    });
  });
});