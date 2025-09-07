// TypeScript interfaces and JSON schemas for Fastify validation
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
};
export const CompileResponseSchema = {
    type: 'object',
    required: ['buildId', 'status'],
    properties: {
        buildId: { type: 'string' },
        status: { type: 'string', enum: ['QUEUED'] }
    }
};
export const DeploymentStrategySchema = {
    type: 'object',
    required: ['type'],
    properties: {
        type: { type: 'string', enum: ['blueGreen', 'rolling', 'recreate'] },
        healthTimeoutSec: { type: 'number' },
        maxUnavailable: { type: 'number' }
    }
};
export const DeployRequestSchema = {
    type: 'object',
    required: ['strategy', 'runtimeId', 'channelId', 'mode'],
    properties: {
        strategy: DeploymentStrategySchema,
        runtimeId: { type: 'string' },
        channelId: { type: 'string' },
        mode: { type: 'string', enum: ['PROD', 'TEST'] }
    }
};
export const DeployResponseSchema = {
    type: 'object',
    required: ['deployId', 'status'],
    properties: {
        deployId: { type: 'string' },
        status: { type: 'string', enum: ['QUEUED'] }
    }
};
export const ChannelControlRequestSchema = {
    type: 'object',
    required: ['runtimeId'],
    properties: {
        runtimeId: { type: 'string' }
    }
};
export const ChannelControlResponseSchema = {
    type: 'object',
    required: ['channelId', 'status'],
    properties: {
        channelId: { type: 'string' },
        status: { type: 'string', enum: ['STARTED', 'STOPPED'] }
    }
};
export const AgentEnrollRequestSchema = {
    type: 'object',
    required: ['runtimeId', 'bootstrapToken'],
    properties: {
        runtimeId: { type: 'string' },
        bootstrapToken: { type: 'string' }
    }
};
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
};
export const AgentEnrollResponseSchema = {
    type: 'object',
    required: ['agentId', 'agentJwt', 'overlay'],
    properties: {
        agentId: { type: 'string' },
        agentJwt: { type: 'string' },
        overlay: OverlayConfigSchema
    }
};
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
};
export const RouteTokenResponseSchema = {
    type: 'object',
    required: ['token'],
    properties: {
        token: { type: 'string' }
    }
};
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
};
export const EnrollmentCodeResponseSchema = {
    type: 'object',
    required: ['token'],
    properties: {
        token: { type: 'string' }
    }
};
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
};
export const HealthCheckResponseSchema = {
    type: 'object',
    required: ['status'],
    properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
    }
};
//# sourceMappingURL=index.js.map