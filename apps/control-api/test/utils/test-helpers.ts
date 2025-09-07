import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import fastify from 'fastify';
import { ulid } from 'ulid';
import { vi, expect } from 'vitest';

import type { FastifyInstance } from 'fastify';
import type * as winston from 'winston';

/**
 * Test utilities and helpers for the Gap Junction Control API Service
 */

/**
 * Creates a temporary directory for test operations
 */
export async function createTempDir(prefix = 'gj-control-api-test'): Promise<string> {
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
export function createMockConfigService(overrides: Record<string, unknown> = {}): {
  get: <T>(key: string, defaultValue?: T) => T;
} {
  const defaultConfig: Record<string, unknown> = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-service-key',
    supabaseProjectRef: 'test-project',
    compilerUrl: 'http://localhost:3001',
    agentJwtSecret: 'test-agent-jwt-secret',
    enrollmentJwtSecret: 'test-enrollment-jwt-secret',
    capabilityJwtSecret: 'test-capability-jwt-secret',
    nodeEnv: 'test',
    logLevel: 'error',
    port: '3002',
    host: '0.0.0.0',
    ...overrides,
  };

  return {
    get: vi.fn().mockImplementation(<T>(key: string, defaultValue?: T): T => {
      const value = defaultConfig[key];
      return (value ?? defaultValue) as T;
    }),
  };
}

/**
 * Creates a mock Winston logger for testing
 */
export function createMockLogger(): winston.Logger {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    silly: vi.fn(),
    log: vi.fn(),
  } as any;
}

/**
 * Creates a test Fastify server instance
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: false, // Disable logging in tests
  });

  return await Promise.resolve(server);
}

/**
 * Waits for a specified amount of time (useful for async operations)
 */
export async function sleep(ms: number): Promise<void> {
  await new Promise<void>(resolve => {
    globalThis.setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * Generates a unique build ID for testing
 */
export function generateTestBuildId(prefix = 'test'): string {
  return `${prefix}-${ulid()}`;
}

/**
 * Generates a unique channel ID for testing
 */
export function generateTestChannelId(prefix = 'test'): string {
  return `${prefix}-channel-${ulid()}`;
}

/**
 * Generates a unique org ID for testing
 */
export function generateTestOrgId(prefix = 'test'): string {
  return `${prefix}-org-${ulid()}`;
}

/**
 * Generates a unique user ID for testing
 */
export function generateTestUserId(prefix = 'test'): string {
  return `${prefix}-user-${ulid()}`;
}

/**
 * Generates a unique runtime ID for testing
 */
export function generateTestRuntimeId(prefix = 'test'): string {
  return `${prefix}-runtime-${ulid()}`;
}

/**
 * Generates a unique agent ID for testing
 */
export function generateTestAgentId(prefix = 'test'): string {
  return `${prefix}-agent-${ulid()}`;
}

/**
 * Creates mock Supabase client for testing
 */
export function createMockSupabaseClient(): {
  from: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
  mocks: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
} {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockUpload = vi.fn();
  const mockDownload = vi.fn();

  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        download: mockDownload,
      }),
    },
    // Expose mocks for assertions
    mocks: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
      upload: mockUpload,
      download: mockDownload,
    },
  };
}

/**
 * Creates mock axios instance for testing
 */
export function createMockAxios(): {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
  isAxiosError: ReturnType<typeof vi.fn>;
  mocks: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
} {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();

  return {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    create: vi.fn().mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    isAxiosError: vi.fn(),
    // Expose mocks for assertions
    mocks: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    },
  };
}

/**
 * Creates mock Socket.IO server for testing
 */
export function createMockSocketIOServer(): {
  server: {
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  socket: {
    id: string;
    emit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
} {
  const mockSocket = {
    id: 'test-socket-id',
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockServer = {
    on: vi.fn().mockImplementation((event: string, callback: (socket: typeof mockSocket) => void) => {
      if (event === 'connection') {
        // Simulate connection
        globalThis.setTimeout(() => {
          callback(mockSocket);
        }, 0);
      }
    }),
    emit: vi.fn(),
    close: vi.fn(),
  };

  return {
    server: mockServer,
    socket: mockSocket,
  };
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
  return async (): Promise<void> => {
    const { duration } = await measureExecutionTime(fn);
    
    if (duration > maxDuration) {
      console.warn(`Performance test "${name}" took ${duration}ms (max: ${maxDuration}ms)`);
    }
    
    expect(duration).toBeLessThan(maxDuration);
  };
}

/**
 * Retry utility for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
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
  
  throw lastError ?? new Error('Unknown error occurred');
}

/**
 * Creates a test timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      globalThis.setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Asserts that a compilation result has the expected structure
 */
export function assertCompilationResult(result: unknown, shouldSucceed = true): void {
  expect(result).toBeDefined();
  const typedResult = result as { buildId?: string; status?: string; error?: string };
  expect(typedResult.buildId).toBeDefined();
  expect(typeof typedResult.buildId).toBe('string');

  if (shouldSucceed) {
    expect(typedResult.status).toBe('QUEUED');
  } else {
    expect(typedResult.error).toBeDefined();
  }
}

/**
 * Asserts that a deployment result has the expected structure
 */
export function assertDeploymentResult(result: unknown): void {
  expect(result).toBeDefined();
  const typedResult = result as { deployId?: string; status?: string };
  expect(typedResult.deployId).toBeDefined();
  expect(typedResult.status).toBeDefined();
  expect(typeof typedResult.deployId).toBe('string');
}

/**
 * Asserts that an agent enrollment result has the expected structure
 */
export function assertAgentEnrollmentResult(result: unknown): void {
  expect(result).toBeDefined();
  const typedResult = result as { agentId?: string; agentJwt?: string; overlay?: unknown };
  expect(typedResult.agentId).toBeDefined();
  expect(typedResult.agentJwt).toBeDefined();
  expect(typedResult.overlay).toBeDefined();
  expect(typeof typedResult.agentId).toBe('string');
  expect(typeof typedResult.agentJwt).toBe('string');
}

/**
 * Asserts that a health check result has the expected structure
 */
export function assertHealthCheckResult(result: unknown): void {
  expect(result).toBeDefined();
  const typedResult = result as {
    status?: string;
    timestamp?: string;
    service?: string;
    version?: string;
    uptime?: number;
    dependencies?: { supabase?: boolean; compiler?: boolean };
  };
  expect(typedResult.status).toBe('healthy');
  expect(typedResult.timestamp).toBeDefined();
  expect(typedResult.service).toBe('gapjunction-control-api');
  expect(typedResult.version).toBeDefined();
  expect(typedResult.uptime).toBeDefined();
  expect(typedResult.dependencies).toBeDefined();
  expect(typeof typedResult.dependencies?.supabase).toBe('boolean');
  expect(typeof typedResult.dependencies?.compiler).toBe('boolean');
}

/**
 * Test data generators
 */
export const generators = {
  /**
   * Generates a random channel ID
   */
  channelId: (prefix = 'test'): string => generateTestChannelId(prefix),
  
  /**
   * Generates a random org ID
   */
  orgId: (prefix = 'test'): string => generateTestOrgId(prefix),
  
  /**
   * Generates a random user ID
   */
  userId: (prefix = 'test'): string => generateTestUserId(prefix),
  
  /**
   * Generates a random runtime ID
   */
  runtimeId: (prefix = 'test'): string => generateTestRuntimeId(prefix),
  
  /**
   * Generates a random agent ID
   */
  agentId: (prefix = 'test'): string => generateTestAgentId(prefix),
  
  /**
   * Generates a random build ID
   */
  buildId: (prefix = 'test'): string => generateTestBuildId(prefix),
};