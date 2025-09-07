import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ChannelIR } from '@gj/ir-schema';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Compiler API (e2e)', () => {
  let app: INestApplication;

  const validChannel: ChannelIR = {
    version: 1,
    channelId: 'e2e-test-channel',
    title: 'E2E Test Channel',
    runtime: { target: 'onprem' },
    security: {
      allowInternetHttpOut: false,
      allowInternetTcpOut: false,
      allowInternetUdpOut: false,
      allowHttpInPublic: false,
    },
    stages: [
      {
        id: 'test-stage',
        title: 'Test Stage',
        nexonId: 'function',
        params: {
          code: 'msg.processed = true; return msg;',
        },
        position: { x: 100, y: 100 },
      },
    ],
    edges: [],
    documentation: 'E2E test channel',
  };

  const channelWithSecrets: ChannelIR = {
    ...validChannel,
    channelId: 'e2e-secure-channel',
    title: 'E2E Secure Channel',
    stages: [
      {
        id: 'secure-stage',
        title: 'Secure Stage',
        nexonId: 'http.request',
        params: {
          url: 'https://api.secure.com/data',
          headers: {
            'Authorization': {
              secret: {
                type: 'secretRef',
                ref: 'gcp://projects/test/secrets/token',
              },
            },
          },
        },
        position: { x: 100, y: 100 },
      },
    ],
  };

  const channelWithPolicyViolations: ChannelIR = {
    ...validChannel,
    channelId: 'e2e-policy-violation-channel',
    title: 'E2E Policy Violation Channel',
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
          table: 'sensitive_data',
        },
      },
    ],
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health endpoints', () => {
    it('/health (GET) should return healthy status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('healthy');
          expect(res.body.service).toBe('gapjunction-compiler');
          expect(res.body.timestamp).toBeDefined();
        });
    });

    it('/health/ready (GET) should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.ready).toBe(true);
          expect(res.body.checks).toBeDefined();
        });
    });

    it('/health/live (GET) should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.alive).toBe(true);
        });
    });
  });

  describe('/compiler/compile endpoint', () => {
    it('should compile a valid channel successfully', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: validChannel,
          orgId: 'e2e-test-org',
          userId: 'e2e-test-user',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.buildId).toBeDefined();
          expect(res.body.validation.valid).toBe(true);
          expect(res.body.policyLint.passed).toBe(true);
          expect(res.body.bundle).toBeDefined();
          expect(res.body.bundleHash).toBeDefined();
          expect(res.body.merkleRoot).toBeDefined();
          expect(res.body.artifactHashes).toBeDefined();
          expect(res.body.metadata).toBeDefined();
          expect(res.body.metadata.orgId).toBe('e2e-test-org');
          expect(res.body.metadata.userId).toBe('e2e-test-user');
        });
    });

    it('should handle channels with secret references', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithSecrets,
          orgId: 'secure-org',
          userId: 'secure-user',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.compiledArtifacts.credentialsMap).toBeDefined();
          expect(res.body.compiledArtifacts.credentialsMap.credentials).toBeDefined();
          
          const credentials = res.body.compiledArtifacts.credentialsMap.credentials;
          expect(Object.keys(credentials).length).toBeGreaterThan(0);
          
          // Verify secret reference is properly mapped
          const authHeader = credentials['secure-stage.headers.Authorization'];
          expect(authHeader).toBeDefined();
          expect(authHeader.type).toBe('secretRef');
          expect(authHeader.ref).toBe('gcp://projects/test/secrets/token');
          expect(authHeader.envVar).toBeDefined();
        });
    });

    it('should fail compilation for channels with policy violations', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithPolicyViolations,
          orgId: 'strict-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.policyLint.passed).toBe(false);
          expect(res.body.policyLint.violations.length).toBeGreaterThan(0);
          expect(res.body.bundle).toBeUndefined();
          
          // Should have security violations
          const securityViolations = res.body.policyLint.violations.filter(
            (v: any) => v.category === 'security'
          );
          expect(securityViolations.length).toBeGreaterThan(0);
        });
    });

    it('should proceed with compilation when violations are acknowledged', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithPolicyViolations,
          orgId: 'strict-org',
          acknowledgedViolations: ['SEC001', 'SEC002', 'SEC003', 'SEC004', 'COMP001'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.bundle).toBeDefined();
          
          // Violations should be marked as acknowledged
          const acknowledgedViolations = res.body.policyLint.violations.filter(
            (v: any) => v.acknowledged
          );
          expect(acknowledgedViolations.length).toBeGreaterThan(0);
        });
    });

    it('should return validation errors for invalid channels', () => {
      const invalidChannel = {
        version: 'invalid',
        // Missing required fields
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: invalidChannel,
          orgId: 'test-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.validation.valid).toBe(false);
          expect(res.body.errors).toBeDefined();
          expect(res.body.errors.length).toBeGreaterThan(0);
          expect(res.body.bundle).toBeUndefined();
        });
    });

    it('should validate request body structure', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          // Missing channel field
          orgId: 'test-org',
        })
        .expect(400);
    });

    it('should handle empty request body', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({})
        .expect(400);
    });

    it('should handle malformed JSON', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should include warnings in successful compilation', () => {
      const channelWithWarnings: ChannelIR = {
        ...validChannel,
        security: {
          allowInternetHttpOut: true, // This will generate a warning
          allowInternetTcpOut: false,
          allowInternetUdpOut: false,
          allowHttpInPublic: false,
        },
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithWarnings,
          orgId: 'warning-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.warnings).toBeDefined();
          expect(res.body.warnings.length).toBeGreaterThan(0);
          expect(res.body.policyLint.violations.length).toBeGreaterThan(0);
          
          const httpViolation = res.body.policyLint.violations.find(
            (v: any) => v.ruleId === 'SEC001'
          );
          expect(httpViolation).toBeDefined();
          expect(httpViolation.severity).toBe('warning');
        });
    });

    it('should handle large channels', () => {
      const largeChannel: ChannelIR = {
        ...validChannel,
        channelId: 'large-e2e-channel',
        title: 'Large E2E Channel',
        stages: Array.from({ length: 50 }, (_, i) => ({
          id: `stage-${i + 1}`,
          title: `Stage ${i + 1}`,
          nexonId: 'function',
          params: {
            code: `msg.stage${i + 1} = true; return msg;`,
          },
          position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
        })),
        edges: Array.from({ length: 49 }, (_, i) => ({
          id: `edge-${i + 1}`,
          from: { stageId: `stage-${i + 1}` },
          to: { stageId: `stage-${i + 2}` },
        })),
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: largeChannel,
          orgId: 'large-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.bundle).toBeDefined();
          expect(res.body.compiledArtifacts.flowsJson).toBeDefined();
          
          const flows = res.body.compiledArtifacts.flowsJson;
          const nodes = flows.filter((item: any) => item.type !== 'tab');
          expect(nodes.length).toBeGreaterThanOrEqual(50);
        });
    }, 30000); // Increase timeout for large channel
  });

  describe('/compiler/verifySecurityAck endpoint', () => {
    it('should successfully acknowledge security violations', () => {
      return request(app.getHttpServer())
        .post('/compiler/verifySecurityAck')
        .send({
          channelId: 'test-channel',
          userId: 'security-user',
          violationIds: ['SEC001', 'SEC002'],
          reason: 'Approved by security team for testing',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.acknowledgedViolations).toEqual(['SEC001', 'SEC002']);
          expect(res.body.message).toContain('Successfully acknowledged 2 policy violations');
        });
    });

    it('should handle empty violation list', () => {
      return request(app.getHttpServer())
        .post('/compiler/verifySecurityAck')
        .send({
          channelId: 'test-channel',
          userId: 'security-user',
          violationIds: [],
          reason: 'No violations to acknowledge',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.acknowledgedViolations).toEqual([]);
          expect(res.body.message).toContain('Successfully acknowledged 0 policy violations');
        });
    });

    it('should validate request body for security acknowledgment', () => {
      return request(app.getHttpServer())
        .post('/compiler/verifySecurityAck')
        .send({
          // Missing required fields
          channelId: 'test-channel',
        })
        .expect(400);
    });

    it('should handle malformed security acknowledgment request', () => {
      return request(app.getHttpServer())
        .post('/compiler/verifySecurityAck')
        .send({})
        .expect(400);
    });
  });

  describe('Content-Type and Headers', () => {
    it('should accept application/json content type', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .set('Content-Type', 'application/json')
        .send({
          channel: validChannel,
          orgId: 'content-type-org',
        })
        .expect(200);
    });

    it('should return JSON response', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: validChannel,
          orgId: 'json-response-org',
        })
        .expect(200)
        .expect('Content-Type', /json/);
    });

    it('should handle CORS headers if configured', () => {
      return request(app.getHttpServer())
        .options('/compiler/compile')
        .expect((res) => {
          // CORS headers would be present if configured
          // This test verifies the endpoint responds to OPTIONS
          expect(res.status).toBeLessThan(500);
        });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle very large request payloads gracefully', () => {
      const veryLargeChannel: ChannelIR = {
        ...validChannel,
        channelId: 'very-large-channel',
        stages: Array.from({ length: 1000 }, (_, i) => ({
          id: `stage-${i + 1}`,
          title: `Stage ${i + 1}`,
          nexonId: 'function',
          params: {
            code: `msg.stage${i + 1} = true; return msg;`,
            largeData: 'x'.repeat(1000), // Add some bulk to each stage
          },
          position: { x: i % 100, y: Math.floor(i / 100) },
        })),
        edges: [],
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: veryLargeChannel,
          orgId: 'very-large-org',
        })
        .expect((res) => {
          // Should either succeed or fail gracefully with appropriate error
          expect([200, 413, 400]).toContain(res.status);
          if (res.status === 200) {
            expect(res.body.success).toBeDefined();
          }
        });
    }, 60000); // Long timeout for large payload

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(app.getHttpServer())
          .post('/compiler/compile')
          .send({
            channel: {
              ...validChannel,
              channelId: `concurrent-channel-${i}`,
              title: `Concurrent Channel ${i}`,
            },
            orgId: `concurrent-org-${i}`,
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.buildId).toBeDefined();
      });
    }, 30000);

    it('should handle requests with special characters in channel data', () => {
      const channelWithSpecialChars: ChannelIR = {
        ...validChannel,
        channelId: 'special-chars-channel',
        title: 'Channel with Special Characters: éñ中文🚀',
        documentation: 'Documentation with special chars: <>&"\'',
        stages: [
          {
            id: 'special-stage',
            title: 'Stage with émojis 🎉',
            nexonId: 'function',
            params: {
              code: 'msg.special = "Special chars: éñ中文🚀"; return msg;',
            },
            position: { x: 100, y: 100 },
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithSpecialChars,
          orgId: 'special-chars-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.compiledArtifacts.manifest.channelId).toBe('special-chars-channel');
        });
    });

    it('should handle requests with deeply nested parameter structures', () => {
      const channelWithDeepNesting: ChannelIR = {
        ...validChannel,
        channelId: 'deep-nesting-channel',
        stages: [
          {
            id: 'deep-stage',
            title: 'Deep Nesting Stage',
            nexonId: 'function',
            params: {
              level1: {
                level2: {
                  level3: {
                    level4: {
                      level5: {
                        deepValue: 'Found at level 5',
                        array: [
                          { nested: { value: 1 } },
                          { nested: { value: 2 } },
                        ],
                      },
                    },
                  },
                },
              },
            },
            position: { x: 100, y: 100 },
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: channelWithDeepNesting,
          orgId: 'deep-nesting-org',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.compiledArtifacts).toBeDefined();
        });
    });
  });

  describe('Response Format and Structure', () => {
    it('should return consistent response structure for successful compilation', () => {
      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: validChannel,
          orgId: 'structure-test-org',
        })
        .expect(200)
        .expect((res) => {
          // Verify required fields are present
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('buildId');
          expect(res.body).toHaveProperty('validation');
          expect(res.body).toHaveProperty('policyLint');
          expect(res.body).toHaveProperty('bundle');
          expect(res.body).toHaveProperty('bundleHash');
          expect(res.body).toHaveProperty('merkleRoot');
          expect(res.body).toHaveProperty('artifactHashes');
          expect(res.body).toHaveProperty('metadata');
          expect(res.body).toHaveProperty('compiledArtifacts');

          // Verify nested structure
          expect(res.body.validation).toHaveProperty('valid');
          expect(res.body.policyLint).toHaveProperty('passed');
          expect(res.body.policyLint).toHaveProperty('violations');
          expect(res.body.policyLint).toHaveProperty('summary');
          expect(res.body.artifactHashes).toHaveProperty('flowsJson');
          expect(res.body.artifactHashes).toHaveProperty('settings');
          expect(res.body.artifactHashes).toHaveProperty('manifest');
          expect(res.body.artifactHashes).toHaveProperty('credentialsMap');
        });
    });

    it('should return consistent response structure for failed compilation', () => {
      const invalidChannel = {
        version: 'invalid',
      };

      return request(app.getHttpServer())
        .post('/compiler/compile')
        .send({
          channel: invalidChannel,
          orgId: 'failure-structure-org',
        })
        .expect(200)
        .expect((res) => {
          // Verify required fields for failure response
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('buildId');
          expect(res.body).toHaveProperty('validation');
          expect(res.body).toHaveProperty('policyLint');
          expect(res.body).toHaveProperty('errors');

          // Verify failure-specific structure
          expect(res.body.success).toBe(false);
          expect(res.body.validation.valid).toBe(false);
          expect(Array.isArray(res.body.errors)).toBe(true);
          expect(res.body.errors.length).toBeGreaterThan(0);

          // Bundle should not be present in failed compilation
          expect(res.body.bundle).toBeUndefined();
        });
    });
  });
});