import { ChannelIR } from '@gj/ir-schema';

/**
 * Test fixture channels for comprehensive testing
 */

export const validMinimalChannel: ChannelIR = {
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

export const validComplexChannel: ChannelIR = {
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
    {
      id: 'filter-data',
      title: 'Filter Data',
      nexonId: 'function',
      params: {
        code: `
          if (msg.payload && msg.payload.length > 0) {
            msg.payload = msg.payload.filter(item => item.active === true);
          }
          return msg;
        `,
      },
      position: { x: 500, y: 100 },
    },
    {
      id: 'tcp-output',
      title: 'TCP Output',
      nexonId: 'tcp.listener',
      nexonVersion: '1.0.0',
      params: {
        port: 8080,
        host: '0.0.0.0',
        datamode: 'stream',
      },
      position: { x: 700, y: 100 },
    },
  ],
  edges: [
    {
      id: 'http-to-transform',
      from: { stageId: 'http-input', outlet: 'success' },
      to: { stageId: 'transform-data', inlet: 'input' },
    },
    {
      id: 'transform-to-filter',
      from: { stageId: 'transform-data', outlet: 'output' },
      to: { stageId: 'filter-data', inlet: 'input' },
    },
    {
      id: 'filter-to-tcp',
      from: { stageId: 'filter-data', outlet: 'output' },
      to: { stageId: 'tcp-output', inlet: 'input' },
    },
  ],
  documentation: 'Complex test channel with HTTP input, data transformation, filtering, and TCP output',
};

export const channelWithSecrets: ChannelIR = {
  version: 1,
  channelId: 'secure-test-channel',
  title: 'Secure Test Channel',
  runtime: { target: 'cloud' },
  security: {
    allowInternetHttpOut: true,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
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
              ref: 'gcp://projects/test-project/secrets/api-token/versions/latest',
            },
          },
          'Content-Type': 'application/json',
        },
        body: {
          apiKey: {
            secret: {
              type: 'secretRef',
              ref: 'aws://secrets-manager/us-east-1/api-key',
            },
          },
          data: 'test-data',
        },
      },
      position: { x: 200, y: 100 },
    },
    {
      id: 'database-stage',
      title: 'Database Insert',
      nexonId: 'database.insert',
      params: {
        connectionString: {
          secret: {
            type: 'secretRef',
            ref: 'azure://keyvault/database-connection',
          },
        },
        table: 'processed_data',
        data: '{{payload}}',
      },
      position: { x: 400, y: 100 },
    },
  ],
  edges: [
    {
      id: 'http-to-db',
      from: { stageId: 'secure-http-stage' },
      to: { stageId: 'database-stage' },
    },
  ],
  documentation: 'Secure channel with multiple secret references from different providers',
};

export const channelWithPolicyViolations: ChannelIR = {
  version: 1,
  channelId: 'policy-violation-channel',
  title: 'Policy Violation Channel',
  runtime: { target: 'cloud' },
  security: {
    allowInternetHttpOut: true,
    allowInternetTcpOut: true,
    allowInternetUdpOut: true,
    allowHttpInPublic: true,
  },
  stages: [
    {
      id: 'risky-http-stage',
      title: 'Risky HTTP Stage',
      nexonId: 'http.request',
      params: {
        url: 'https://untrusted-api.com/data',
        method: 'POST',
      },
    },
    {
      id: 'phi-database-stage',
      title: 'PHI Database Stage',
      nexonId: 'database.insert',
      params: {
        table: 'patient_health_records',
        connection: 'production_database',
      },
    },
    {
      id: 'file-write-stage',
      title: 'File Write Stage',
      nexonId: 'file.write',
      params: {
        path: '/tmp/sensitive-data.txt',
        data: '{{payload}}',
      },
    },
    {
      id: 'email-stage',
      title: 'Email Stage',
      nexonId: 'email.send',
      params: {
        to: 'external@example.com',
        subject: 'Sensitive Data Export',
        body: '{{payload}}',
      },
    },
  ],
  edges: [
    {
      id: 'http-to-db',
      from: { stageId: 'risky-http-stage' },
      to: { stageId: 'phi-database-stage' },
    },
    {
      id: 'db-to-file',
      from: { stageId: 'phi-database-stage' },
      to: { stageId: 'file-write-stage' },
    },
    {
      id: 'file-to-email',
      from: { stageId: 'file-write-stage' },
      to: { stageId: 'email-stage' },
    },
  ],
  documentation: 'Channel designed to trigger multiple policy violations for testing',
};

export const largeChannel: ChannelIR = {
  version: 1,
  channelId: 'large-test-channel',
  title: 'Large Test Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: Array.from({ length: 100 }, (_, i) => ({
    id: `stage-${i + 1}`,
    title: `Processing Stage ${i + 1}`,
    nexonId: 'function',
    params: {
      code: `
        msg.stage${i + 1} = {
          processed: true,
          timestamp: new Date().toISOString(),
          stageNumber: ${i + 1}
        };
        return msg;
      `,
    },
    position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 150 },
  })),
  edges: Array.from({ length: 99 }, (_, i) => ({
    id: `edge-${i + 1}`,
    from: { stageId: `stage-${i + 1}` },
    to: { stageId: `stage-${i + 2}` },
  })),
  documentation: 'Large channel with 100 stages for performance and scalability testing',
};

export const channelWithCircularDependency: ChannelIR = {
  version: 1,
  channelId: 'circular-dependency-channel',
  title: 'Circular Dependency Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'stage-a',
      title: 'Stage A',
      nexonId: 'function',
      params: { code: 'msg.stageA = true; return msg;' },
    },
    {
      id: 'stage-b',
      title: 'Stage B',
      nexonId: 'function',
      params: { code: 'msg.stageB = true; return msg;' },
    },
    {
      id: 'stage-c',
      title: 'Stage C',
      nexonId: 'function',
      params: { code: 'msg.stageC = true; return msg;' },
    },
  ],
  edges: [
    {
      id: 'a-to-b',
      from: { stageId: 'stage-a' },
      to: { stageId: 'stage-b' },
    },
    {
      id: 'b-to-c',
      from: { stageId: 'stage-b' },
      to: { stageId: 'stage-c' },
    },
    {
      id: 'c-to-a',
      from: { stageId: 'stage-c' },
      to: { stageId: 'stage-a' },
    },
  ],
  documentation: 'Channel with circular dependency for validation testing',
};

export const channelWithOrphanedStages: ChannelIR = {
  version: 1,
  channelId: 'orphaned-stages-channel',
  title: 'Orphaned Stages Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'connected-stage-1',
      title: 'Connected Stage 1',
      nexonId: 'function',
      params: { code: 'msg.connected1 = true; return msg;' },
    },
    {
      id: 'connected-stage-2',
      title: 'Connected Stage 2',
      nexonId: 'function',
      params: { code: 'msg.connected2 = true; return msg;' },
    },
    {
      id: 'orphaned-stage-1',
      title: 'Orphaned Stage 1',
      nexonId: 'function',
      params: { code: 'msg.orphaned1 = true; return msg;' },
    },
    {
      id: 'orphaned-stage-2',
      title: 'Orphaned Stage 2',
      nexonId: 'function',
      params: { code: 'msg.orphaned2 = true; return msg;' },
    },
  ],
  edges: [
    {
      id: 'connected-edge',
      from: { stageId: 'connected-stage-1' },
      to: { stageId: 'connected-stage-2' },
    },
  ],
  documentation: 'Channel with orphaned stages for validation warning testing',
};

export const channelWithExpressions: ChannelIR = {
  version: 1,
  channelId: 'expressions-channel',
  title: 'Expressions Test Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'expression-stage',
      title: 'Expression Stage',
      nexonId: 'http.request',
      params: {
        url: {
          expression: 'params.baseUrl + "/api/v1/data"',
        },
        method: 'GET',
        headers: {
          'User-Agent': {
            expression: 'channel.title + " v1.0"',
          },
          'X-Channel-ID': {
            expression: 'channel.channelId',
          },
        },
        timeout: {
          expression: 'params.timeout || 30000',
        },
      },
      position: { x: 100, y: 100 },
    },
  ],
  edges: [],
  documentation: 'Channel with expression-based parameter values for substitution testing',
};

export const channelWithMissingNexon: ChannelIR = {
  version: 1,
  channelId: 'missing-nexon-channel',
  title: 'Missing Nexon Channel',
  runtime: { target: 'onprem' },
  security: {
    allowInternetHttpOut: false,
    allowInternetTcpOut: false,
    allowInternetUdpOut: false,
    allowHttpInPublic: false,
  },
  stages: [
    {
      id: 'missing-nexon-stage',
      title: 'Missing Nexon Stage',
      nexonId: 'nonexistent.nexon',
      nexonVersion: '1.0.0',
      params: {
        someParam: 'someValue',
      },
      position: { x: 100, y: 100 },
    },
  ],
  edges: [],
  documentation: 'Channel with non-existent nexon for error handling testing',
};

// Invalid channels for validation testing
export const invalidChannels = {
  missingVersion: {
    channelId: 'invalid-no-version',
    title: 'Invalid Channel - No Version',
    runtime: { target: 'onprem' },
    stages: [],
    edges: [],
  },

  invalidVersion: {
    version: 'invalid-version',
    channelId: 'invalid-version-channel',
    title: 'Invalid Channel - Bad Version',
    runtime: { target: 'onprem' },
    stages: [],
    edges: [],
  },

  missingChannelId: {
    version: 1,
    title: 'Invalid Channel - No Channel ID',
    runtime: { target: 'onprem' },
    stages: [],
    edges: [],
  },

  missingTitle: {
    version: 1,
    channelId: 'invalid-no-title',
    runtime: { target: 'onprem' },
    stages: [],
    edges: [],
  },

  missingRuntime: {
    version: 1,
    channelId: 'invalid-no-runtime',
    title: 'Invalid Channel - No Runtime',
    stages: [],
    edges: [],
  },

  invalidStage: {
    version: 1,
    channelId: 'invalid-stage-channel',
    title: 'Invalid Channel - Bad Stage',
    runtime: { target: 'onprem' },
    stages: [
      {
        // Missing id and nexonId
        title: 'Invalid Stage',
        params: {},
      },
    ],
    edges: [],
  },

  invalidEdge: {
    version: 1,
    channelId: 'invalid-edge-channel',
    title: 'Invalid Channel - Bad Edge',
    runtime: { target: 'onprem' },
    stages: [
      {
        id: 'stage-1',
        nexonId: 'function',
        params: {},
      },
    ],
    edges: [
      {
        // Missing id and proper from/to structure
        from: 'stage-1',
        to: 'stage-2',
      },
    ],
  },
};

// Export all fixtures as a collection
export const testChannels = {
  validMinimalChannel,
  validComplexChannel,
  channelWithSecrets,
  channelWithPolicyViolations,
  largeChannel,
  channelWithCircularDependency,
  channelWithOrphanedStages,
  channelWithExpressions,
  channelWithMissingNexon,
  invalidChannels,
};