import 'reflect-metadata';
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_SERVICE_KEY'] = 'test-service-key';
process.env['COMPILER_URL'] = 'http://localhost:3001';
process.env['AGENT_JWT_SECRET'] = 'test-agent-jwt-secret';
process.env['ENROLLMENT_JWT_SECRET'] = 'test-enrollment-jwt-secret';
process.env['CAPABILITY_JWT_SECRET'] = 'test-capability-jwt-secret';

// Global test setup
beforeAll(() => {
  // Setup any global test configuration
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Clear mocks before each test
  vi.clearAllMocks();
});

// Global test timeout
vi.setConfig({
  testTimeout: 10000,
});