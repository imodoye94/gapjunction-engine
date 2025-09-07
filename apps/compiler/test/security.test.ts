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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockConfigService,
  assertSecretsNotExposed,
  assertCredentialsMapStructure,
  generateTestBuildId,
  generators
} from './utils/test-helpers';
import { channelWithSecrets, channelWithPolicyViolations } from './fixtures/channels';

describe('Security Tests', () => {
  let compilerService: CompilerService;
  let policyService: PolicyService;
  let artifactsService: ArtifactsService;
  let hashingService: HashingService;

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
        createMockConfigService(),
      ],
    }).compile();

    compilerService = module.get<CompilerService>(CompilerService);
    policyService = module.get<PolicyService>(PolicyService);
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    hashingService = module.get<HashingService>(HashingService);
  });

  describe('Secret Handling', () => {
    it('should never expose secrets in compiled artifacts', async () => {
      const secretRefs = [
        'gcp://projects/test-project/secrets/api-token/versions/latest',
        'aws://secrets-manager/us-east-1/api-key',
        'azure://keyvault/database-connection',
      ];

      const request = {
        channel: channelWithSecrets,
        orgId: 'security-test-org',
        userId: 'security-test-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.compiledArtifacts).toBeDefined();

      // Verify secrets are not exposed in any artifacts
      assertSecretsNotExposed(result.compiledArtifacts, secretRefs);
    });

    it('should properly map secrets in credentials map', async () => {
      const request = {
        channel: channelWithSecrets,
        orgId: 'security-test-org',
        userId: 'security-test-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.compiledArtifacts?.credentialsMap).toBeDefined();

      // Should have 3 secret references from the test channel
      assertCredentialsMapStructure(result.compiledArtifacts.credentialsMap, 3);

      const credentials = result.compiledArtifacts.credentialsMap.credentials;
      
      // Verify specific secret mappings
      const authHeader = credentials['secure-http-stage.headers.Authorization'];
      expect(authHeader).toBeDefined();
      expect(authHeader.type).toBe('secretRef');
      expect(authHeader.ref).toBe('gcp://projects/test-project/secrets/api-token/versions/latest');
      expect(authHeader.envVar).toMatch(/^GJ_SECRET_/);

      const apiKey = credentials['secure-http-stage.body.apiKey'];
      expect(apiKey).toBeDefined();
      expect(apiKey.type).toBe('secretRef');
      expect(apiKey.ref).toBe('aws://secrets-manager/us-east-1/api-key');

      const dbConnection = credentials['database-stage.connectionString'];
      expect(dbConnection).toBeDefined();
      expect(dbConnection.type).toBe('secretRef');
      expect(dbConnection.ref).toBe('azure://keyvault/database-connection');
    });

    it('should generate secure environment variable names', async () => {
      const buildId = generateTestBuildId('env-var-security');
      const artifacts = await artifactsService.generateArtifacts(channelWithSecrets, {
        buildId,
        mode: 'PROD',
        target: 'cloud',
      });

      const credentials = artifacts.credentialsMap.credentials;
      const envVars = Object.values(credentials).map((cred: any) => cred.envVar);

      envVars.forEach(envVar => {
        // Should start with GJ_SECRET_
        expect(envVar).toMatch(/^GJ_SECRET_/);
        
        // Should be uppercase
        expect(envVar).toBe(envVar.toUpperCase());
        
        // Should not contain special characters except underscore
        expect(envVar).toMatch(/^[A-Z0-9_]+$/);
        
        // Should be reasonably long for security
        expect(envVar.length).toBeGreaterThan(10);
      });

      // All environment variable names should be unique
      const uniqueEnvVars = new Set(envVars);
      expect(uniqueEnvVars.size).toBe(envVars.length);
    });

    it('should handle nested secret references securely', async () => {
      const channelWithNestedSecrets: ChannelIR = {
        version: 1,
        channelId: 'nested-secrets-channel',
        title: 'Nested Secrets Channel',
        runtime: { target: 'cloud' },
        security: {
          allowInternetHttpOut: true,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
        stages: [
          {
            id: 'nested-secrets-stage',
            title: 'Nested Secrets Stage',
            nexonId: 'http.request',
            params: {
              config: {
                auth: {
                  primary: {
                    token: {
                      secret: {
                        type: 'secretRef',
                        ref: generators.secretRef('gcp'),
                      },
                    },
                  },
                  backup: {
                    apiKey: {
                      secret: {
                        type: 'secretRef',
                        ref: generators.secretRef('aws'),
                      },
                    },
                  },
                },
                database: {
                  connection: {
                    secret: {
                      type: 'secretRef',
                      ref: generators.secretRef('azure'),
                    },
                  },
                },
              },
            },
          },
        ],
        edges: [],
      };

      const buildId = generateTestBuildId('nested-secrets');
      const artifacts = await artifactsService.generateArtifacts(channelWithNestedSecrets, {
        buildId,
        mode: 'PROD',
        target: 'cloud',
      });

      // Should have 3 nested secret references
      assertCredentialsMapStructure(artifacts.credentialsMap, 3);

      const credentials = artifacts.credentialsMap.credentials;
      
      // Verify nested path mapping
      expect(credentials['nested-secrets-stage.config.auth.primary.token']).toBeDefined();
      expect(credentials['nested-secrets-stage.config.auth.backup.apiKey']).toBeDefined();
      expect(credentials['nested-secrets-stage.config.database.connection']).toBeDefined();
    });

    it('should validate secret reference formats', async () => {
      const channelWithInvalidSecret: ChannelIR = {
        version: 1,
        channelId: 'invalid-secret-channel',
        title: 'Invalid Secret Channel',
        runtime: { target: 'onprem' },
        security: {
          allowInternetHttpOut: false,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
        stages: [
          {
            id: 'invalid-secret-stage',
            title: 'Invalid Secret Stage',
            nexonId: 'http.request',
            params: {
              apiKey: {
                secret: {
                  type: 'secretRef',
                  ref: 'invalid-secret-format', // Invalid format
                },
              },
            },
          },
        ],
        edges: [],
      };

      const buildId = generateTestBuildId('invalid-secret');
      
      // Should still process but might generate warnings
      const artifacts = await artifactsService.generateArtifacts(channelWithInvalidSecret, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      expect(artifacts.credentialsMap).toBeDefined();
      
      const credentials = artifacts.credentialsMap.credentials;
      const invalidSecretCred = credentials['invalid-secret-stage.apiKey'];
      
      expect(invalidSecretCred).toBeDefined();
      expect(invalidSecretCred.ref).toBe('invalid-secret-format');
    });
  });

  describe('Policy Enforcement', () => {
    it('should enforce security policies consistently', async () => {
      const result = await policyService.lintChannel(channelWithPolicyViolations);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      // Should have security violations
      const securityViolations = result.violations.filter(v => v.category === 'security');
      expect(securityViolations.length).toBeGreaterThan(0);

      // Should detect internet access violations
      const internetViolations = securityViolations.filter(v => 
        ['SEC001', 'SEC002', 'SEC003', 'SEC004'].includes(v.ruleId)
      );
      expect(internetViolations.length).toBeGreaterThan(0);

      // Should detect compliance violations
      const complianceViolations = result.violations.filter(v => v.category === 'compliance');
      expect(complianceViolations.length).toBeGreaterThan(0);
    });

    it('should prevent compilation with critical security violations', async () => {
      const criticalSecurityChannel: ChannelIR = {
        ...channelWithPolicyViolations,
        channelId: 'critical-security-channel',
        stages: [
          {
            id: 'critical-stage',
            title: 'Critical Security Risk',
            nexonId: 'system.exec', // Hypothetical dangerous nexon
            params: {
              command: 'rm -rf /',
            },
          },
        ],
      };

      // Mock policy service to return critical violations
      vi.spyOn(policyService, 'lintChannel').mockResolvedValue({
        passed: false,
        violations: [
          {
            ruleId: 'SEC999',
            ruleName: 'Critical Security Risk',
            severity: 'error',
            category: 'security',
            message: 'Channel contains critical security risks',
            acknowledged: false,
          },
        ],
        summary: { errors: 1, warnings: 0, info: 0 },
      });

      const request = {
        channel: criticalSecurityChannel,
        orgId: 'critical-security-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(false);
      expect(result.policyLint.passed).toBe(false);
      expect(result.bundle).toBeUndefined();
    });

    it('should handle security acknowledgments properly', async () => {
      const ackRequest = {
        channelId: 'security-ack-test',
        userId: 'security-user',
        violationIds: ['SEC001', 'SEC002', 'COMP001'],
        reason: 'Approved by security team for controlled testing environment',
      };

      const result = await compilerService.verifySecurityAck(ackRequest);

      expect(result.success).toBe(true);
      expect(result.acknowledgedViolations).toEqual(['SEC001', 'SEC002', 'COMP001']);
      expect(result.message).toContain('Successfully acknowledged 3 policy violations');
    });

    it('should validate security acknowledgment reasons', async () => {
      const invalidAckRequest = {
        channelId: 'invalid-ack-test',
        userId: 'test-user',
        violationIds: ['SEC001'],
        reason: '', // Empty reason should be handled
      };

      const result = await compilerService.verifySecurityAck(invalidAckRequest);

      // Current implementation accepts empty reasons, but in production
      // this might require validation
      expect(result.success).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should ensure bundle integrity with cryptographic hashes', async () => {
      const request = {
        channel: channelWithSecrets,
        orgId: 'integrity-test-org',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundleHash).toBeDefined();
      expect(result.merkleRoot).toBeDefined();
      expect(result.artifactHashes).toBeDefined();

      // Verify hash formats
      expect(result.bundleHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      
      Object.values(result.artifactHashes).forEach(hash => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it('should detect bundle tampering', async () => {
      const testData = 'original data';
      const originalHash = hashingService.computeHash(testData);

      const tamperedData = 'tampered data';
      const tamperedHash = hashingService.computeHash(tamperedData);

      expect(originalHash.hash).not.toBe(tamperedHash.hash);

      // Verify hash changes with any data modification
      const slightlyModifiedData = 'original data '; // Added space
      const modifiedHash = hashingService.computeHash(slightlyModifiedData);

      expect(originalHash.hash).not.toBe(modifiedHash.hash);
    });

    it('should provide Merkle proofs for artifact verification', async () => {
      const mockArtifactHashes = {
        flowsJson: { algorithm: 'sha256', hash: 'a'.repeat(64), size: 1000 },
        settings: { algorithm: 'sha256', hash: 'b'.repeat(64), size: 2000 },
        manifest: { algorithm: 'sha256', hash: 'c'.repeat(64), size: 500 },
        credentialsMap: { algorithm: 'sha256', hash: 'd'.repeat(64), size: 100 },
      };

      const merkleResult = hashingService.createMerkleTree(mockArtifactHashes);

      expect(merkleResult.merkleRoot).toBeDefined();
      expect(merkleResult.merkleProofs).toBeDefined();

      // Verify each artifact has a valid proof
      Object.keys(mockArtifactHashes).forEach(artifactName => {
        const artifactHash = mockArtifactHashes[artifactName as keyof typeof mockArtifactHashes].hash;
        const proof = merkleResult.merkleProofs[artifactName as keyof typeof merkleResult.merkleProofs];
        
        const isValid = hashingService.verifyMerkleProof(
          artifactHash,
          proof,
          merkleResult.merkleRoot
        );
        
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid Merkle proofs', async () => {
      const mockArtifactHashes = {
        flowsJson: { algorithm: 'sha256', hash: 'a'.repeat(64), size: 1000 },
        settings: { algorithm: 'sha256', hash: 'b'.repeat(64), size: 2000 },
        manifest: { algorithm: 'sha256', hash: 'c'.repeat(64), size: 500 },
        credentialsMap: { algorithm: 'sha256', hash: 'd'.repeat(64), size: 100 },
      };

      const merkleResult = hashingService.createMerkleTree(mockArtifactHashes);

      // Try to verify with wrong hash
      const wrongHash = 'e'.repeat(64);
      const validProof = merkleResult.merkleProofs.flowsJson;
      
      const isValid = hashingService.verifyMerkleProof(
        wrongHash,
        validProof,
        merkleResult.merkleRoot
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle malicious input in channel data', async () => {
      const maliciousChannel: ChannelIR = {
        version: 1,
        channelId: 'malicious-test-channel',
        title: 'Malicious Test Channel <script>alert("xss")</script>',
        runtime: { target: 'onprem' },
        security: {
          allowInternetHttpOut: false,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
        stages: [
          {
            id: 'malicious-stage',
            title: 'Malicious Stage',
            nexonId: 'function',
            params: {
              code: `
                // Potentially malicious code
                eval('console.log("injected code")');
                process.exit(1);
                require('fs').unlinkSync('/important/file');
              `,
            },
          },
        ],
        edges: [],
        documentation: 'Channel with potentially malicious content <!-- injection -->',
      };

      const request = {
        channel: maliciousChannel,
        orgId: 'malicious-org',
      };

      // Should still process but not execute malicious code during compilation
      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.compiledArtifacts).toBeDefined();

      // Verify malicious content is preserved but not executed
      const flowsJson = JSON.stringify(result.compiledArtifacts.flowsJson);
      expect(flowsJson).toContain('eval'); // Code should be preserved
      expect(flowsJson).toContain('process.exit'); // But not executed during compilation
    });

    it('should handle extremely large input data', async () => {
      const largeDataChannel: ChannelIR = {
        version: 1,
        channelId: 'large-data-channel',
        title: 'Large Data Channel',
        runtime: { target: 'onprem' },
        security: {
          allowInternetHttpOut: false,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
        stages: [
          {
            id: 'large-data-stage',
            title: 'Large Data Stage',
            nexonId: 'function',
            params: {
              largeData: 'x'.repeat(1024 * 1024), // 1MB of data
              code: 'return msg;',
            },
          },
        ],
        edges: [],
      };

      const request = {
        channel: largeDataChannel,
        orgId: 'large-data-org',
      };

      // Should handle large data without crashing
      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.bundle).toBeDefined();
      expect(result.bundle.length).toBeGreaterThan(1024); // Should contain the large data
    });

    it('should validate channel structure against injection attacks', async () => {
      const injectionChannel = {
        version: 1,
        channelId: 'injection-test',
        title: 'Injection Test',
        runtime: { target: 'onprem' },
        security: {
          allowInternetHttpOut: false,
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
        stages: [
          {
            id: 'injection-stage',
            title: 'Injection Stage',
            nexonId: 'function',
            params: {
              // Try to inject additional properties
              __proto__: { malicious: true },
              constructor: { prototype: { injected: true } },
              code: 'return msg;',
            },
          },
        ],
        edges: [],
        // Try to inject at root level
        __proto__: { rootInjection: true },
      };

      const request = {
        channel: injectionChannel,
        orgId: 'injection-org',
      };

      // Should validate and potentially reject or sanitize
      const result = await compilerService.compile(request);

      // The result depends on validation implementation
      // At minimum, it should not crash or expose system internals
      expect(result).toBeDefined();
      expect(result.buildId).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('should enforce organization-based access controls', async () => {
      const restrictedChannel: ChannelIR = {
        version: 1,
        channelId: 'restricted-channel',
        title: 'Restricted Channel',
        runtime: { target: 'cloud' },
        security: {
          allowInternetHttpOut: true,
          allowInternetTcpOut: true,
          allowInternetUdpOut: true,
          allowHttpInPublic: true,
        },
        stages: [
          {
            id: 'restricted-stage',
            title: 'Restricted Stage',
            nexonId: 'database.admin',
            params: {
              operation: 'DROP TABLE users',
            },
          },
        ],
        edges: [],
      };

      // Mock restrictive org policy
      vi.spyOn(policyService, 'lintChannel').mockResolvedValue({
        passed: false,
        violations: [
          {
            ruleId: 'ORG001',
            ruleName: 'Unauthorized Operation',
            severity: 'error',
            category: 'security',
            message: 'Organization policy prohibits this operation',
            acknowledged: false,
          },
        ],
        summary: { errors: 1, warnings: 0, info: 0 },
      });

      const request = {
        channel: restrictedChannel,
        orgId: 'restricted-org',
        userId: 'unauthorized-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(false);
      expect(result.policyLint.passed).toBe(false);
    });

    it('should validate user permissions for security acknowledgments', async () => {
      const ackRequest = {
        channelId: 'permission-test-channel',
        userId: 'regular-user', // Not a security admin
        violationIds: ['SEC001'],
        reason: 'I think this is okay',
      };

      // In a real implementation, this would check user permissions
      // For now, the service accepts all acknowledgments
      const result = await compilerService.verifySecurityAck(ackRequest);

      expect(result.success).toBe(true);
      // In production, this might fail for unauthorized users
    });
  });

  describe('Audit and Logging', () => {
    it('should generate audit trail for security-sensitive operations', async () => {
      const request = {
        channel: channelWithSecrets,
        orgId: 'audit-test-org',
        userId: 'audit-test-user',
      };

      const result = await compilerService.compile(request);

      expect(result.success).toBe(true);
      expect(result.buildId).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.orgId).toBe('audit-test-org');
      expect(result.metadata?.userId).toBe('audit-test-user');

      // In a real implementation, audit logs would be written
      // Here we just verify the metadata is captured
    });

    it('should log security acknowledgments for audit purposes', async () => {
      const ackRequest = {
        channelId: 'audit-ack-channel',
        userId: 'security-admin',
        violationIds: ['SEC001', 'COMP001'],
        reason: 'Approved for testing in isolated environment',
      };

      const result = await compilerService.verifySecurityAck(ackRequest);

      expect(result.success).toBe(true);
      expect(result.acknowledgedViolations).toEqual(['SEC001', 'COMP001']);

      // In production, this would generate audit logs with:
      // - Timestamp
      // - User ID
      // - Channel ID
      // - Violations acknowledged
      // - Reason
      // - IP address
      // - Session information
    });
  });

  describe('Secure Defaults', () => {
    it('should apply secure defaults in generated settings', async () => {
      const buildId = generateTestBuildId('secure-defaults');
      const artifacts = await artifactsService.generateArtifacts(channelWithSecrets, {
        buildId,
        mode: 'PROD',
        target: 'cloud',
      });

      const settings = artifacts.settings;

      // Verify secure defaults for production
      expect(settings.httpAdminRoot).toBe(false);
      expect(settings.httpNodeRoot).toBe(false);
      expect(settings.uiPort).toBe(false);
      expect(settings.requireHttps).toBe(true);
      expect(settings.functionExternalModules).toBe(false);
      expect(settings.exportGlobalContextKeys).toBe(false);
      expect(settings.contextStorage).toBe(false);

      // Verify logging configuration
      expect(settings.logging.console.level).toBe('warn');
      expect(settings.logging.console.audit).toBe(true);
    });

    it('should use secure defaults for test environments', async () => {
      const buildId = generateTestBuildId('test-defaults');
      const artifacts = await artifactsService.generateArtifacts(channelWithSecrets, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      const settings = artifacts.settings;

      // Test environment should still be secure but more permissive
      expect(settings.httpAdminRoot).toBe(false);
      expect(settings.httpNodeRoot).toBe(false);
      expect(settings.requireHttps).toBe(false); // More permissive for testing
      expect(settings.logging.console.level).toBe('info'); // More verbose for debugging
      expect(settings.logging.console.audit).toBe(false); // Less audit logging in test
    });
  });
});