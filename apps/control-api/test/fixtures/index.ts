import { ulid } from 'ulid';

/**
 * Test fixtures for the Gap Junction Control API Service
 */

// Channel fixtures
export const validMinimalChannel = {
  version: 1,
  channelId: 'minimal-test-channel',
  title: 'Minimal Test Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'simple-stage',
      title: 'Simple Function Stage',
      nexonId: 'function',
      params: {
        code: 'return msg;',
      },
      position: { x: 100, y: 100 },
    },
  ],
  edges: [],
  documentation: 'Minimal test channel with single function stage',
};

export const validComplexChannel = {
  version: 1,
  channelId: 'complex-test-channel',
  title: 'Complex Test Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: true,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'http-input',
      title: 'HTTP Input Stage',
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
      position: { x: 100, y: 100 },
    },
    {
      id: 'transform-data',
      title: 'Transform Data',
      nexonId: 'transform.json',
      nexonVersion: '1.0.0',
      params: {
        expression: 'payload.data',
        outputFormat: 'json',
      },
      position: { x: 300, y: 100 },
    },
  ],
  edges: [
    {
      id: 'http-to-transform',
      from: { stageId: 'http-input', outlet: 'success' },
      to: { stageId: 'transform-data', inlet: 'input' },
    },
  ],
  documentation: 'Complex test channel with HTTP input and data transformation',
};

// Build fixtures
export function createMockBuild(overrides: Partial<any> = {}): any {
  const buildId = ulid();
  return {
    buildId,
    orgId: 'test-org-123',
    projectId: 'test-project-123',
    channelId: 'test-channel-123',
    userId: 'test-user-123',
    runtimeId: 'test-runtime-123',
    runtimeType: 'onprem',
    mode: 'TEST',
    irContent: validMinimalChannel,
    irVersion: 1,
    notes: 'Test build',
    bundleTarball: null,
    compilerBundleId: null,
    buildStatus: 'QUEUED',
    buildTime: null,
    deploymentStatus: null,
    deploymentId: null,
    deploymentTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Compile request fixtures
export function createMockCompileRequest(overrides: Partial<any> = {}): any {
  return {
    orgId: 'test-org-123',
    projectId: 'test-project-123',
    userId: 'test-user-123',
    runtimeId: 'test-runtime-123',
    runtimeType: 'onprem',
    mode: 'TEST',
    channelId: 'test-channel-123',
    irVersion: 1,
    irContent: validMinimalChannel,
    policyProfile: 'default',
    notes: 'Test compilation',
    ...overrides,
  };
}

// Deploy request fixtures
export function createMockDeployRequest(overrides: Partial<any> = {}): any {
  return {
    runtimeId: 'test-runtime-123',
    channelId: 'test-channel-123',
    mode: 'TEST',
    strategy: {
      type: 'recreate',
      healthTimeoutSec: 30,
      maxUnavailable: 1,
    },
    ...overrides,
  };
}

// Agent enrollment fixtures
export function createMockAgentEnrollRequest(overrides: Partial<any> = {}): any {
  return {
    runtimeId: 'test-runtime-123',
    bootstrapToken: 'test-bootstrap-token',
    version: '1.0.0',
    os: 'linux',
    ...overrides,
  };
}

// Route token request fixtures
export function createMockRouteTokenRequest(overrides: Partial<any> = {}): any {
  return {
    fromRuntime: 'test-runtime-from',
    toRuntime: 'test-runtime-to',
    channelId: 'test-channel-123',
    maxBytes: 1024 * 1024, // 1MB
    ttlSec: 3600, // 1 hour
    ...overrides,
  };
}

// Enrollment code request fixtures
export function createMockEnrollmentCodeRequest(overrides: Partial<any> = {}): any {
  return {
    runtimeId: 'test-runtime-123',
    organizationId: 'test-org-123',
    userId: 'test-user-123',
    agentId: 'test-agent-123',
    useP2p: true,
    ttlSec: 3600, // 1 hour
    ...overrides,
  };
}

// Compiler response fixtures
export function createMockCompilerResponse(success = true, overrides: Partial<any> = {}): any {
  const buildId = ulid();
  
  if (success) {
    return {
      success: true,
      buildId,
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
      policyLint: {
        violations: [],
        acknowledged: [],
      },
      bundle: Buffer.from('mock-bundle-data'),
      bundleHash: 'mock-bundle-hash',
      merkleRoot: 'mock-merkle-root',
      artifactHashes: {
        flowsJson: { algorithm: 'sha256', hash: 'flows-hash', size: 100 },
        settings: { algorithm: 'sha256', hash: 'settings-hash', size: 200 },
        manifest: { algorithm: 'sha256', hash: 'manifest-hash', size: 300 },
        credentialsMap: { algorithm: 'sha256', hash: 'creds-hash', size: 50 },
      },
      compiledArtifacts: {
        flowsJson: [{ id: 'test-flow', type: 'tab', label: 'Test Flow' }],
        settings: { httpAdminRoot: false },
        manifest: { version: 1, channelId: 'test-channel', buildId },
        credentialsMap: { version: 1, channelId: 'test-channel', buildId, credentials: {} },
      },
      ...overrides,
    };
  } else {
    return {
      success: false,
      buildId,
      validation: {
        valid: false,
        errors: ['Test validation error'],
        warnings: [],
      },
      policyLint: {
        violations: [],
        acknowledged: [],
      },
      errors: ['Compilation failed'],
      ...overrides,
    };
  }
}

// Agent enrollment response fixtures
export function createMockAgentEnrollmentResponse(overrides: Partial<any> = {}): any {
  return {
    agentId: ulid(),
    agentJwt: 'mock-agent-jwt-token',
    overlay: {
      enabled: true,
      enrollmentCode: 'mock-enrollment-code',
      lighthouses: ['lighthouse1.example.com', 'lighthouse2.example.com'],
    },
    ...overrides,
  };
}

// WebSocket message fixtures
export function createMockHeartbeatMessage(overrides: Partial<any> = {}): any {
  return {
    agentId: 'test-agent-123',
    runtimeId: 'test-runtime-123',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    metrics: {
      cpuUsage: 0.25,
      memoryUsage: 0.45,
      diskUsage: 0.60,
    },
    ...overrides,
  };
}

// Supabase response fixtures
export function createMockSupabaseResponse(data: unknown, error: any = null): any {
  return {
    data,
    error,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

// Error fixtures
export const mockErrors = {
  supabaseError: {
    message: 'Database connection failed',
    code: 'PGRST301',
    details: 'Connection timeout',
  },
  compilerError: {
    message: 'Compilation failed',
    code: 'COMP001',
    details: 'Invalid channel structure',
  },
  networkError: {
    message: 'Network request failed',
    code: 'ECONNREFUSED',
    details: 'Connection refused',
  },
  validationError: {
    message: 'Validation failed',
    code: 'VAL001',
    details: 'Required field missing',
  },
};

// JWT token fixtures
export const mockTokens = {
  validJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  expiredJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid',
  invalidJwt: 'invalid.jwt.token',
};

// HTTP headers fixtures
export const mockHeaders = {
  withAuth: {
    'authorization': `Bearer ${mockTokens.validJwt}`,
    'content-type': 'application/json',
  },
  withIdempotency: {
    'authorization': `Bearer ${mockTokens.validJwt}`,
    'content-type': 'application/json',
    'idempotency-key': 'test-idempotency-key',
    'x-org-id': 'test-org-123',
  },
  withoutAuth: {
    'content-type': 'application/json',
  },
};

// Test channels collection
export const testChannels = {
  validMinimalChannel,
  validComplexChannel,
};

// Export all fixtures
export const fixtures = {
  channels: testChannels,
  builds: { createMockBuild },
  requests: {
    compile: createMockCompileRequest,
    deploy: createMockDeployRequest,
    agentEnroll: createMockAgentEnrollRequest,
    routeToken: createMockRouteTokenRequest,
    enrollmentCode: createMockEnrollmentCodeRequest,
  },
  responses: {
    compiler: createMockCompilerResponse,
    agentEnrollment: createMockAgentEnrollmentResponse,
    supabase: createMockSupabaseResponse,
  },
  websocket: {
    heartbeat: createMockHeartbeatMessage,
  },
  errors: mockErrors,
  tokens: mockTokens,
  headers: mockHeaders,
};