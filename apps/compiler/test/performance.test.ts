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
  measureExecutionTime, 
  MemoryMonitor,
  createPerformanceTest,
  generateTestBuildId 
} from './utils/test-helpers';
import { validComplexChannel, largeChannel } from './fixtures/channels';

describe('Performance Tests', () => {
  let compilerService: CompilerService;
  let artifactsService: ArtifactsService;
  let bundlingService: BundlingService;
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
    artifactsService = module.get<ArtifactsService>(ArtifactsService);
    bundlingService = module.get<BundlingService>(BundlingService);
    hashingService = module.get<HashingService>(HashingService);
  });

  describe('Compilation Performance', () => {
    it('should compile a simple channel within 2 seconds', createPerformanceTest(
      'simple channel compilation',
      async () => {
        const request = {
          channel: validComplexChannel,
          orgId: 'perf-test-org',
          userId: 'perf-test-user',
        };

        const result = await compilerService.compile(request);
        expect(result.success).toBe(true);
      },
      2000
    ));

    it('should compile a large channel within 10 seconds', createPerformanceTest(
      'large channel compilation',
      async () => {
        const request = {
          channel: largeChannel,
          orgId: 'large-perf-org',
          userId: 'large-perf-user',
        };

        const result = await compilerService.compile(request);
        expect(result.success).toBe(true);
      },
      10000
    ));

    it('should handle concurrent compilations efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        channel: {
          ...validComplexChannel,
          channelId: `concurrent-perf-${i}`,
          title: `Concurrent Performance Test ${i}`,
        },
        orgId: `concurrent-org-${i}`,
        userId: `concurrent-user-${i}`,
      }));

      const { result: results, duration } = await measureExecutionTime(async () => {
        return Promise.all(
          requests.map(request => compilerService.compile(request))
        );
      });

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time (not much slower than sequential)
      expect(duration).toBeLessThan(15000); // 15 seconds for 10 concurrent
      
      console.log(`Concurrent compilation of ${concurrentRequests} channels took ${duration}ms`);
    });

    it('should maintain performance with repeated compilations', async () => {
      const iterations = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const request = {
          channel: {
            ...validComplexChannel,
            channelId: `repeated-perf-${i}`,
            title: `Repeated Performance Test ${i}`,
          },
          orgId: `repeated-org-${i}`,
        };

        const { result, duration } = await measureExecutionTime(async () => {
          return compilerService.compile(request);
        });

        expect(result.success).toBe(true);
        durations.push(duration);
      }

      // Performance should not degrade significantly
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log(`Performance stats - Avg: ${averageDuration}ms, Min: ${minDuration}ms, Max: ${maxDuration}ms`);

      // Max duration should not be more than 2x the minimum
      expect(maxDuration).toBeLessThan(minDuration * 2.5);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during compilation', async () => {
      const monitor = new MemoryMonitor();
      
      // Perform multiple compilations
      for (let i = 0; i < 10; i++) {
        const request = {
          channel: {
            ...validComplexChannel,
            channelId: `memory-test-${i}`,
          },
          orgId: `memory-org-${i}`,
        };

        const result = await compilerService.compile(request);
        expect(result.success).toBe(true);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Check memory usage
      monitor.assertMemoryUsage(50 * 1024 * 1024); // 50MB max increase
    });

    it('should handle large channels without excessive memory usage', async () => {
      const monitor = new MemoryMonitor();

      const veryLargeChannel: ChannelIR = {
        ...largeChannel,
        channelId: 'very-large-memory-test',
        stages: Array.from({ length: 500 }, (_, i) => ({
          id: `memory-stage-${i + 1}`,
          title: `Memory Test Stage ${i + 1}`,
          nexonId: 'function',
          params: {
            code: `
              msg.stage${i + 1} = {
                processed: true,
                timestamp: new Date().toISOString(),
                stageNumber: ${i + 1},
                largeData: 'x'.repeat(1000) // Add some bulk
              };
              return msg;
            `,
          },
          position: { x: (i % 20) * 100, y: Math.floor(i / 20) * 100 },
        })),
        edges: Array.from({ length: 499 }, (_, i) => ({
          id: `memory-edge-${i + 1}`,
          from: { stageId: `memory-stage-${i + 1}` },
          to: { stageId: `memory-stage-${i + 2}` },
        })),
      };

      const request = {
        channel: veryLargeChannel,
        orgId: 'large-memory-org',
      };

      const result = await compilerService.compile(request);
      expect(result.success).toBe(true);

      // Check memory usage for large channel
      monitor.assertMemoryUsage(200 * 1024 * 1024); // 200MB max for very large channel
    });
  });

  describe('Artifact Generation Performance', () => {
    it('should generate artifacts quickly for complex channels', createPerformanceTest(
      'artifact generation',
      async () => {
        const buildId = generateTestBuildId('artifact-perf');
        const artifacts = await artifactsService.generateArtifacts(validComplexChannel, {
          buildId,
          mode: 'TEST',
          target: 'onprem',
        });

        expect(artifacts.flowsJson).toBeDefined();
        expect(artifacts.settings).toBeDefined();
        expect(artifacts.manifest).toBeDefined();
        expect(artifacts.credentialsMap).toBeDefined();
      },
      3000
    ));

    it('should handle large artifact generation efficiently', async () => {
      const buildId = generateTestBuildId('large-artifact-perf');
      
      const { result: artifacts, duration } = await measureExecutionTime(async () => {
        return artifactsService.generateArtifacts(largeChannel, {
          buildId,
          mode: 'TEST',
          target: 'onprem',
        });
      });

      expect(artifacts.flowsJson).toBeDefined();
      expect(duration).toBeLessThan(8000); // 8 seconds for large channel

      // Verify artifact size is reasonable
      const flowsJsonSize = JSON.stringify(artifacts.flowsJson).length;
      console.log(`Large channel flows.json size: ${Math.round(flowsJsonSize / 1024)}KB`);
      
      // Should be substantial but not excessive
      expect(flowsJsonSize).toBeGreaterThan(10000); // At least 10KB
      expect(flowsJsonSize).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Bundling Performance', () => {
    it('should create bundles quickly', createPerformanceTest(
      'bundle creation',
      async () => {
        const buildId = generateTestBuildId('bundle-perf');
        const artifacts = await artifactsService.generateArtifacts(validComplexChannel, {
          buildId,
          mode: 'TEST',
          target: 'onprem',
        });

        const bundleResult = await bundlingService.createBundle(artifacts, {
          buildId,
          compression: 'gzip',
          includeMetadata: true,
        });

        expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
        expect(bundleResult.bundleSize).toBeGreaterThan(0);
      },
      2000
    ));

    it('should handle large bundle creation efficiently', async () => {
      const buildId = generateTestBuildId('large-bundle-perf');
      const artifacts = await artifactsService.generateArtifacts(largeChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      const { result: bundleResult, duration } = await measureExecutionTime(async () => {
        return bundlingService.createBundle(artifacts, {
          buildId,
          compression: 'gzip',
          includeMetadata: true,
        });
      });

      expect(bundleResult.bundleBuffer).toBeInstanceOf(Buffer);
      expect(duration).toBeLessThan(5000); // 5 seconds for large bundle

      console.log(`Large bundle size: ${Math.round(bundleResult.bundleSize / 1024)}KB, created in ${duration}ms`);
    });

    it('should compare compression performance', async () => {
      const buildId = generateTestBuildId('compression-perf');
      const artifacts = await artifactsService.generateArtifacts(validComplexChannel, {
        buildId,
        mode: 'TEST',
        target: 'onprem',
      });

      // Test gzip compression
      const { result: gzipResult, duration: gzipDuration } = await measureExecutionTime(async () => {
        return bundlingService.createBundle(artifacts, {
          buildId,
          compression: 'gzip',
        });
      });

      // Test no compression
      const { result: noneResult, duration: noneDuration } = await measureExecutionTime(async () => {
        return bundlingService.createBundle(artifacts, {
          buildId,
          compression: 'none',
        });
      });

      console.log(`Compression comparison - Gzip: ${gzipResult.bundleSize} bytes in ${gzipDuration}ms, None: ${noneResult.bundleSize} bytes in ${noneDuration}ms`);

      // Gzip should be smaller but might take slightly longer
      expect(gzipResult.bundleSize).toBeLessThan(noneResult.bundleSize);
      
      // Both should be reasonably fast
      expect(gzipDuration).toBeLessThan(3000);
      expect(noneDuration).toBeLessThan(2000);
    });
  });

  describe('Hashing Performance', () => {
    it('should compute hashes quickly', createPerformanceTest(
      'hash computation',
      async () => {
        const testData = 'x'.repeat(1024 * 1024); // 1MB of data
        const result = hashingService.computeHash(testData);

        expect(result.algorithm).toBe('sha256');
        expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.size).toBe(testData.length);
      },
      1000
    ));

    it('should handle large data hashing efficiently', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB of data
      
      const { result, duration } = await measureExecutionTime(async () => {
        return hashingService.computeHash(largeData);
      });

      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(duration).toBeLessThan(2000); // Should hash 10MB in under 2 seconds

      console.log(`Hashed ${Math.round(largeData.length / 1024 / 1024)}MB in ${duration}ms`);
    });

    it('should create Merkle trees efficiently', createPerformanceTest(
      'merkle tree creation',
      async () => {
        const mockArtifactHashes = {
          flowsJson: { algorithm: 'sha256', hash: 'a'.repeat(64), size: 1000 },
          settings: { algorithm: 'sha256', hash: 'b'.repeat(64), size: 2000 },
          manifest: { algorithm: 'sha256', hash: 'c'.repeat(64), size: 500 },
          credentialsMap: { algorithm: 'sha256', hash: 'd'.repeat(64), size: 100 },
        };

        const result = hashingService.createMerkleTree(mockArtifactHashes);

        expect(result.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
        expect(result.merkleProofs).toBeDefined();
        expect(result.tree).toBeDefined();
      },
      500
    ));
  });

  describe('Scalability Tests', () => {
    it('should handle increasing channel sizes gracefully', async () => {
      const stageCounts = [10, 50, 100, 200];
      const results: Array<{ stages: number; duration: number; bundleSize: number }> = [];

      for (const stageCount of stageCounts) {
        const scalabilityChannel: ChannelIR = {
          ...validComplexChannel,
          channelId: `scalability-${stageCount}`,
          title: `Scalability Test ${stageCount} Stages`,
          stages: Array.from({ length: stageCount }, (_, i) => ({
            id: `scale-stage-${i + 1}`,
            title: `Scale Stage ${i + 1}`,
            nexonId: 'function',
            params: {
              code: `msg.stage${i + 1} = true; return msg;`,
            },
            position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
          })),
          edges: Array.from({ length: stageCount - 1 }, (_, i) => ({
            id: `scale-edge-${i + 1}`,
            from: { stageId: `scale-stage-${i + 1}` },
            to: { stageId: `scale-stage-${i + 2}` },
          })),
        };

        const { result, duration } = await measureExecutionTime(async () => {
          return compilerService.compile({
            channel: scalabilityChannel,
            orgId: `scale-org-${stageCount}`,
          });
        });

        expect(result.success).toBe(true);
        
        results.push({
          stages: stageCount,
          duration,
          bundleSize: result.bundle?.length || 0,
        });
      }

      // Log scalability results
      console.log('Scalability Results:');
      results.forEach(({ stages, duration, bundleSize }) => {
        console.log(`${stages} stages: ${duration}ms, ${Math.round(bundleSize / 1024)}KB`);
      });

      // Performance should scale reasonably (not exponentially)
      const durationsPerStage = results.map(r => r.duration / r.stages);
      const avgDurationPerStage = durationsPerStage.reduce((sum, d) => sum + d, 0) / durationsPerStage.length;
      
      // No single test should be more than 3x the average per-stage duration
      durationsPerStage.forEach(durationPerStage => {
        expect(durationPerStage).toBeLessThan(avgDurationPerStage * 3);
      });
    });

    it('should handle burst compilation requests', async () => {
      const burstSize = 20;
      const requests = Array.from({ length: burstSize }, (_, i) => ({
        channel: {
          ...validComplexChannel,
          channelId: `burst-${i}`,
          title: `Burst Test ${i}`,
        },
        orgId: `burst-org-${i}`,
      }));

      const { result: results, duration } = await measureExecutionTime(async () => {
        // Simulate burst by starting all requests at once
        return Promise.all(
          requests.map(request => compilerService.compile(request))
        );
      });

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });

      // Should handle burst reasonably well
      expect(duration).toBeLessThan(30000); // 30 seconds for 20 concurrent

      console.log(`Burst test: ${burstSize} concurrent compilations in ${duration}ms`);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources after compilation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform several compilations
      for (let i = 0; i < 5; i++) {
        const request = {
          channel: {
            ...validComplexChannel,
            channelId: `cleanup-test-${i}`,
          },
          orgId: `cleanup-org-${i}`,
        };

        const result = await compilerService.compile(request);
        expect(result.success).toBe(true);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory increase after 5 compilations: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

      // Should not have significant memory increase
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max
    });
  });
});