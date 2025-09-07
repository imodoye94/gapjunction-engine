// TypeScript interfaces and JSON schemas for Fastify validation

// Compile request/response interfaces and schemas
export interface CompileRequestBody {
  orgId: string;
  projectId: string;
  userId: string;
  runtimeId: string;
  runtimeType: 'cloud' | 'onprem';
  mode: 'PROD' | 'TEST';
  channelId: string;
  irVersion: number;
  irContent: any;
  policyProfile?: string;
  notes?: string;
}

export const CompileRequestSchema = {
  type: 'object',
  required: ['orgId', 'projectId', 'userId', 'runtimeId', 'runtimeType', 'mode', 'channelId', 'irVersion', 'irContent'],
  properties: {
    orgId: { type: 'string' },
    projectId: { type: 'string' },
    userId: { type: 'string' },
    runtimeId: { type: 'string' },
    runtimeType: { type: 'string', enum: ['cloud', 'onprem'] },
    mode: { type: 'string', enum: ['PROD', 'TEST'] },
    channelId: { type: 'string' },
    irVersion: { type: 'number' },
    irContent: { type: 'object' },
    policyProfile: { type: 'string' },
    notes: { type: 'string' }
  }
} as const;

export interface CompileResponseBody {
  buildId: string;
  status: 'QUEUED';
}

export const CompileResponseSchema = {
  type: 'object',
  required: ['buildId', 'status'],
  properties: {
    buildId: { type: 'string' },
    status: { type: 'string', enum: ['QUEUED'] }
  }
} as const;

// Deploy request/response interfaces and schemas
export interface DeploymentStrategyBody {
  type: 'blueGreen' | 'rolling' | 'recreate';
  healthTimeoutSec?: number;
  maxUnavailable?: number;
}

export const DeploymentStrategySchema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ['blueGreen', 'rolling', 'recreate'] },
    healthTimeoutSec: { type: 'number' },
    maxUnavailable: { type: 'number' }
  }
} as const;

export interface DeployRequestBody {
  strategy: DeploymentStrategyBody;
  runtimeId: string;
  channelId: string;
  mode: 'PROD' | 'TEST';
}

export const DeployRequestSchema = {
  type: 'object',
  required: ['strategy', 'runtimeId', 'channelId', 'mode'],
  properties: {
    strategy: DeploymentStrategySchema,
    runtimeId: { type: 'string' },
    channelId: { type: 'string' },
    mode: { type: 'string', enum: ['PROD', 'TEST'] }
  }
} as const;

export interface DeployResponseBody {
  deployId: string;
  status: 'QUEUED';
}

export const DeployResponseSchema = {
  type: 'object',
  required: ['deployId', 'status'],
  properties: {
    deployId: { type: 'string' },
    status: { type: 'string', enum: ['QUEUED'] }
  }
} as const;

// Channel control interfaces and schemas
export interface ChannelControlRequestBody {
  runtimeId: string;
}

export const ChannelControlRequestSchema = {
  type: 'object',
  required: ['runtimeId'],
  properties: {
    runtimeId: { type: 'string' }
  }
} as const;

export interface ChannelControlResponseBody {
  channelId: string;
  status: 'STARTED' | 'STOPPED';
}

export const ChannelControlResponseSchema = {
  type: 'object',
  required: ['channelId', 'status'],
  properties: {
    channelId: { type: 'string' },
    status: { type: 'string', enum: ['STARTED', 'STOPPED'] }
  }
} as const;

// Agent enrollment interfaces and schemas
export interface AgentEnrollRequestBody {
  runtimeId: string;
  bootstrapToken: string;
}

export const AgentEnrollRequestSchema = {
  type: 'object',
  required: ['runtimeId', 'bootstrapToken'],
  properties: {
    runtimeId: { type: 'string' },
    bootstrapToken: { type: 'string' }
  }
} as const;

export interface OverlayConfigBody {
  enabled: boolean;
  enrollmentCode?: string;
  lighthouses?: string[];
}

export const OverlayConfigSchema = {
  type: 'object',
  required: ['enabled'],
  properties: {
    enabled: { type: 'boolean' },
    enrollmentCode: { type: 'string' },
    lighthouses: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const;

export interface AgentEnrollResponseBody {
  agentId: string;
  agentJwt: string;
  overlay: OverlayConfigBody;
}

export const AgentEnrollResponseSchema = {
  type: 'object',
  required: ['agentId', 'agentJwt', 'overlay'],
  properties: {
    agentId: { type: 'string' },
    agentJwt: { type: 'string' },
    overlay: OverlayConfigSchema
  }
} as const;

// Capability token interfaces and schemas
export interface RouteTokenRequestBody {
  fromRuntime: string;
  toRuntime: string;
  channelId: string;
  maxBytes: number;
  ttlSec: number;
}

export const RouteTokenRequestSchema = {
  type: 'object',
  required: ['fromRuntime', 'toRuntime', 'channelId', 'maxBytes', 'ttlSec'],
  properties: {
    fromRuntime: { type: 'string' },
    toRuntime: { type: 'string' },
    channelId: { type: 'string' },
    maxBytes: { type: 'number' },
    ttlSec: { type: 'number' }
  }
} as const;

export interface RouteTokenResponseBody {
  token: string;
}

export const RouteTokenResponseSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string' }
  }
} as const;

export interface EnrollmentCodeRequestBody {
  organizationId: string;
  userId: string;
  runtimeId: string;
  agentId: string;
  useP2p: boolean;
  ttlSec: number;
}

export const EnrollmentCodeRequestSchema = {
  type: 'object',
  required: ['organizationId', 'userId', 'runtimeId', 'agentId', 'useP2p', 'ttlSec'],
  properties: {
    organizationId: { type: 'string' },
    userId: { type: 'string' },
    runtimeId: { type: 'string' },
    agentId: { type: 'string' },
    useP2p: { type: 'boolean' },
    ttlSec: { type: 'number' }
  }
} as const;

export interface EnrollmentCodeResponseBody {
  token: string;
}

export const EnrollmentCodeResponseSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string' }
  }
} as const;

// Error response interface and schema
export interface ErrorResponseBody {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: string;
}

export const ErrorResponseSchema = {
  type: 'object',
  required: ['code', 'message', 'timestamp'],
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'object' },
    requestId: { type: 'string' },
    timestamp: { type: 'string' }
  }
} as const;

// Health check interface and schema
export interface HealthCheckResponseBody {
  status: 'ok' | 'error';
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export const HealthCheckResponseSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['ok', 'error'] },
    info: { type: 'object' },
    error: { type: 'object' },
    details: { type: 'object' }
  }
} as const;