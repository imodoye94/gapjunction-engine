import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ulid } from 'ulid';
import { vi, expect } from 'vitest';

/**
 * Test utilities and helpers for the Gap Junction Compiler Service
 */

/**
 * Creates a temporary directory for test operations
 */
export async function createTempDir(prefix = 'gj-compiler-test'): Promise<string> {
  const tempDir = join(tmpdir(), `${prefix}-${ulid()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Cleans up a temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rmdir(tempDir, { recursive: true });
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
  }
}

/**
 * Creates a mock ConfigService for testing
 */
export function createMockConfigService(overrides: Record<string, any> = {}) {
  const defaultConfig = {
    'NEXON_LOCAL_PATH': join(process.cwd(), 'packages', 'nexon-catalog'),
    'NEXON_REMOTE_URL': null,
    'NODE_ENV': 'test',
    'LOG_LEVEL': 'error',
    ...overrides,
  };

  return {
    provide: ConfigService,
    useValue: {
      get: vi.fn().mockImplementation((key: string) => defaultConfig[key]),
    },
  };
}

/**
 * Creates a test module with common providers
 */
export async function createTestModule(providers: any[] = []): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      createMockConfigService(),
      ...providers,
    ],
  }).compile();
}

/**
 * Creates a test application with the full AppModule
 */
export async function createTestApp(): Promise<INestApplication> {
  const { AppModule } = await import('../../src/app.module');
  
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
  .overrideProvider(ConfigService)
  .useValue(createMockConfigService().useValue)
  .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * Waits for a specified amount of time (useful for async operations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a unique build ID for testing
 */
export function generateTestBuildId(prefix = 'test'): string {
  return `${prefix}-${ulid()}`;
}

/**
 * Creates mock nexon templates for testing
 */
export function createMockNexonTemplate(nexonId: string, version = '1.0.0') {
  return {
    manifest: {
      id: nexonId,
      version,
      title: `Mock ${nexonId}`,
      description: `Mock template for ${nexonId}`,
      capabilities: {
        network: {
          httpOut: nexonId.includes('http'),
          tcpOut: nexonId.includes('tcp'),
        },
      },
      parameters: {
        url: {
          type: 'string' as const,
          required: true,
          description: 'URL parameter',
        },
        method: {
          type: 'string' as const,
          default: 'GET',
          validation: {
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
          },
        },
      },
    },
    template: {
      nodes: [
        {
          id: `${nexonId}-node`,
          type: nexonId.replace('.', ' '),
          name: `{{stage.title || "${nexonId}"}}`,
          url: '{{params.url}}',
          method: '{{params.method || "GET"}}',
          x: 200,
          y: 200,
          wires: [[]],
        },
      ],
    },
    source: {
      type: 'local' as const,
      path: `/mock/path/${nexonId}`,
      checksum: `mock-checksum-${nexonId}`,
    },
  };
}

/**
 * Creates mock artifacts for testing
 */
export function createMockArtifacts(channelId: string, buildId: string) {
  return {
    flowsJson: [
      { id: 'flow-tab', type: 'tab', label: 'Test Flow' },
      { id: 'test-node', type: 'inject', z: 'flow-tab', name: 'Test Node' },
    ],
    settings: {
      httpAdminRoot: false,
      httpNodeRoot: false,
      functionGlobalContext: {
        channelId,
        buildId,
        test: true,
      },
    },
    manifest: {
      version: 1 as const,
      channelId,
      buildId,
      mode: 'TEST' as const,
      target: 'onprem' as const,
      artifacts: {
        flowsJsonPath: './flows.json',
        settingsPath: './settings.js',
        credentialsMapPath: './credentials.map.json',
      },
    },
    credentialsMap: {
      version: 1,
      channelId,
      buildId,
      credentials: {},
    },
  };
}

/**
 * Creates mock bundle result for testing
 */
export function createMockBundleResult(buildId: string) {
  return {
    bundleBuffer: Buffer.from('mock bundle data'),
    bundleSize: 1024,
    hashes: {
      artifactHashes: {
        flowsJson: { algorithm: 'sha256', hash: 'flows-hash', size: 100 },
        settings: { algorithm: 'sha256', hash: 'settings-hash', size: 200 },
        manifest: { algorithm: 'sha256', hash: 'manifest-hash', size: 300 },
        credentialsMap: { algorithm: 'sha256', hash: 'creds-hash', size: 50 },
      },
      bundleHash: { algorithm: 'sha256', hash: 'bundle-hash', size: 1024 },
      merkleRoot: 'merkle-root-hash',
      merkleProofs: {
        flowsJson: ['proof1'],
        settings: ['proof2'],
        manifest: ['proof3'],
        credentialsMap: ['proof4'],
      },
    },
    metadata: {
      version: '1.0.0',
      buildId,
      timestamp: new Date().toISOString(),
      artifacts: {
        count: 4,
        totalSize: 650,
        files: [
          { name: 'flows.json', size: 100, hash: 'flows-hash' },
          { name: 'settings.js', size: 200, hash: 'settings-hash' },
          { name: 'manifest.json', size: 300, hash: 'manifest-hash' },
          { name: 'credentials.map.json', size: 50, hash: 'creds-hash' },
        ],
      },
      compression: 'gzip' as const,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Creates mock policy violations for testing
 */
export function createMockPolicyViolations() {
  return [
    {
      ruleId: 'SEC001',
      ruleName: 'Internet HTTP Access',
      severity: 'warning' as const,
      category: 'security',
      message: 'Channel requests internet HTTP access',
      suggestion: 'Consider using internal services',
      acknowledged: false,
    },
    {
      ruleId: 'BP001',
      ruleName: 'Channel Complexity',
      severity: 'warning' as const,
      category: 'best-practice',
      message: 'Channel has many stages',
      suggestion: 'Consider breaking into smaller channels',
      acknowledged: false,
    },
    {
      ruleId: 'COMP001',
      ruleName: 'Potential PHI Handling',
      severity: 'warning' as const,
      category: 'compliance',
      message: 'Channel may handle PHI data',
      suggestion: 'Ensure proper encryption and access controls',
      acknowledged: false,
    },
  ];
}

/**
 * Asserts that a compilation result has the expected structure
 */
export function assertCompilationResult(result: any, shouldSucceed = true) {
  expect(result).toBeDefined();
  expect(result.success).toBe(shouldSucceed);
  expect(result.buildId).toBeDefined();
  expect(result.validation).toBeDefined();
  expect(result.policyLint).toBeDefined();

  if (shouldSucceed) {
    expect(result.bundle).toBeDefined();
    expect(result.bundleHash).toBeDefined();
    expect(result.merkleRoot).toBeDefined();
    expect(result.artifactHashes).toBeDefined();
    expect(result.compiledArtifacts).toBeDefined();
  } else {
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  }
}

/**
 * Asserts that artifacts have the expected structure
 */
export function assertArtifactsStructure(artifacts: any) {
  expect(artifacts).toBeDefined();
  expect(artifacts.flowsJson).toBeDefined();
  expect(artifacts.settings).toBeDefined();
  expect(artifacts.manifest).toBeDefined();
  expect(artifacts.credentialsMap).toBeDefined();

  // Verify flows.json structure
  expect(Array.isArray(artifacts.flowsJson)).toBe(true);
  
  // Verify manifest structure
  expect(artifacts.manifest.version).toBe(1);
  expect(artifacts.manifest.channelId).toBeDefined();
  expect(artifacts.manifest.buildId).toBeDefined();
  expect(artifacts.manifest.artifacts).toBeDefined();

  // Verify credentials map structure
  expect(artifacts.credentialsMap.version).toBe(1);
  expect(artifacts.credentialsMap.channelId).toBeDefined();
  expect(artifacts.credentialsMap.buildId).toBeDefined();
  expect(artifacts.credentialsMap.credentials).toBeDefined();
}

/**
 * Asserts that bundle hashes are valid
 */
export function assertBundleHashes(hashes: any) {
  expect(hashes).toBeDefined();
  expect(hashes.artifactHashes).toBeDefined();
  expect(hashes.bundleHash).toBeDefined();
  expect(hashes.merkleRoot).toBeDefined();

  // Verify artifact hashes
  expect(hashes.artifactHashes.flowsJson).toBeDefined();
  expect(hashes.artifactHashes.settings).toBeDefined();
  expect(hashes.artifactHashes.manifest).toBeDefined();
  expect(hashes.artifactHashes.credentialsMap).toBeDefined();

  // Verify hash format
  expect(hashes.artifactHashes.flowsJson.algorithm).toBe('sha256');
  expect(hashes.artifactHashes.flowsJson.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hashes.bundleHash.algorithm).toBe('sha256');
  expect(hashes.bundleHash.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hashes.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
}

/**
 * Measures execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  return { result, duration };
}

/**
 * Creates a performance test wrapper
 */
export function createPerformanceTest(
  name: string,
  fn: () => Promise<void>,
  maxDuration: number = 5000
) {
  return async () => {
    const { duration } = await measureExecutionTime(fn);
    
    if (duration > maxDuration) {
      console.warn(`Performance test "${name}" took ${duration}ms (max: ${maxDuration}ms)`);
    }
    
    expect(duration).toBeLessThan(maxDuration);
  };
}

/**
 * Creates a memory usage monitor
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  
  constructor() {
    this.initialMemory = process.memoryUsage();
  }
  
  getCurrentUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }
  
  getMemoryDelta(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const current = this.getCurrentUsage();
    return {
      heapUsed: current.heapUsed - this.initialMemory.heapUsed,
      heapTotal: current.heapTotal - this.initialMemory.heapTotal,
      external: current.external - this.initialMemory.external,
      rss: current.rss - this.initialMemory.rss,
    };
  }
  
  assertMemoryUsage(maxHeapIncrease: number = 100 * 1024 * 1024) { // 100MB default
    const delta = this.getMemoryDelta();
    
    if (delta.heapUsed > maxHeapIncrease) {
      console.warn(`Memory usage increased by ${Math.round(delta.heapUsed / 1024 / 1024)}MB`);
    }
    
    expect(delta.heapUsed).toBeLessThan(maxHeapIncrease);
  }
}

/**
 * Retry utility for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Creates a test timeout wrapper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

/**
 * Validates that secrets are not exposed in artifacts
 */
export function assertSecretsNotExposed(artifacts: any, secretRefs: string[]) {
  const artifactsStr = JSON.stringify(artifacts);
  
  secretRefs.forEach(secretRef => {
    expect(artifactsStr).not.toContain(secretRef);
  });
  
  // Verify flows.json doesn't contain secret values
  const flowsStr = JSON.stringify(artifacts.flowsJson);
  secretRefs.forEach(secretRef => {
    expect(flowsStr).not.toContain(secretRef);
  });
  
  // Verify settings doesn't contain secret values
  const settingsStr = JSON.stringify(artifacts.settings);
  secretRefs.forEach(secretRef => {
    expect(settingsStr).not.toContain(secretRef);
  });
}

/**
 * Validates that credentials map contains expected secret references
 */
export function assertCredentialsMapStructure(credentialsMap: any, expectedSecretCount: number) {
  expect(credentialsMap).toBeDefined();
  expect(credentialsMap.version).toBe(1);
  expect(credentialsMap.channelId).toBeDefined();
  expect(credentialsMap.buildId).toBeDefined();
  expect(credentialsMap.credentials).toBeDefined();
  
  const credentialKeys = Object.keys(credentialsMap.credentials);
  expect(credentialKeys.length).toBe(expectedSecretCount);
  
  credentialKeys.forEach(key => {
    const credential = credentialsMap.credentials[key];
    expect(credential.type).toBe('secretRef');
    expect(credential.ref).toBeDefined();
    expect(credential.envVar).toBeDefined();
    expect(credential.envVar).toMatch(/^GJ_SECRET_/);
  });
}

/**
 * Test data generators
 */
export const generators = {
  /**
   * Generates a random channel ID
   */
  channelId: (prefix = 'test'): string => `${prefix}-channel-${ulid()}`,
  
  /**
   * Generates a random org ID
   */
  orgId: (prefix = 'test'): string => `${prefix}-org-${ulid()}`,
  
  /**
   * Generates a random user ID
   */
  userId: (prefix = 'test'): string => `${prefix}-user-${ulid()}`,
  
  /**
   * Generates a random secret reference
   */
  secretRef: (provider = 'gcp'): string => {
    const providers = {
      gcp: () => `gcp://projects/test-${ulid()}/secrets/secret-${ulid()}/versions/latest`,
      aws: () => `aws://secrets-manager/us-east-1/secret-${ulid()}`,
      azure: () => `azure://keyvault/test-vault/secret-${ulid()}`,
    };
    
    return providers[provider as keyof typeof providers]?.() || providers.gcp();
  },
};