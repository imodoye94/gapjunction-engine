import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import * as dotenv from 'dotenv';
import fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { Server } from 'socket.io';
import * as winston from 'winston';

// Import converted services
import { AgentsService } from './agents/agents.service.js';
import { BuildsService } from './builds/builds.service.js';
import { CapabilitiesService } from './capabilities/capabilities.service.js';
import { ChannelsService } from './channels/channels.service.js';
import { IdempotencyService } from './common/services/idempotency.service.js';
import { CompilerService } from './services/compiler.service.js';
import { SupabaseService } from './services/supabase.service.js';
import { WebSocketService } from './websocket/websocket.service.js';

// Load environment variables
dotenv.config();

// HTTP Status Constants
const HTTP_STATUS = {
  ok: 200,
  accepted: 202,
  unauthorized: 401,
  internalServerError: 500,
} as const;

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/control-api-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/control-api-combined.log'
    })
  ]
});

// Config service implementation
class ConfigService {
  get<T>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is not defined`);
    }
    return value as unknown as T;
  }
}

// Service container
interface Services {
  supabaseService: SupabaseService;
  compilerService: CompilerService;
  channelsService: ChannelsService;
  buildsService: BuildsService;
  agentsService: AgentsService;
  capabilitiesService: CapabilitiesService;
  webSocketService: WebSocketService;
  idempotencyService: IdempotencyService;
}

// Request/Response interfaces
interface CompileRequestBody {
  orgId: string;
  projectId: string;
  userId: string;
  runtimeId: string;
  runtimeType: 'cloud' | 'onprem';
  mode: 'PROD' | 'TEST';
  channelId: string;
  irVersion: number;
  irContent: Record<string, unknown>;
  policyProfile?: string;
  notes?: string;
}

interface DeployRequestBody {
  runtimeId: string;
  channelId: string;
  mode: 'PROD' | 'TEST';
  strategy: {
    type: 'blueGreen' | 'rolling' | 'recreate';
    healthTimeoutSec?: number;
    maxUnavailable?: number;
  };
}

interface AgentEnrollRequestBody {
  runtimeId: string;
  bootstrapToken: string;
  version: string;
  os: string;
}

interface RouteTokenRequestBody {
  fromRuntime: string;
  toRuntime: string;
  channelId: string;
  maxBytes: number;
  ttlSec: number;
}

interface EnrollmentCodeRequestBody {
  runtimeId: string;
  organizationId: string;
  userId: string;
  agentId: string;
  useP2p: boolean;
  ttlSec: number;
}

// Middleware for idempotency
async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  services: Services
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'] as string;
  const orgId = request.headers['x-org-id'] as string;

  if (!idempotencyKey || !orgId) {
    return; // Skip idempotency check if headers are missing
  }

  const cachedResult = await services.idempotencyService.checkIdempotency(orgId, idempotencyKey);
  if (cachedResult) {
    reply.code(HTTP_STATUS.ok).send(cachedResult);
    
  }
}

// JWT Authentication hook (placeholder)
async function jwtAuthHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(HTTP_STATUS.unauthorized).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  // TODO: Implement actual JWT validation
  const BEARER_PREFIX_LENGTH = 7;
  const token = authHeader.substring(BEARER_PREFIX_LENGTH);
  if (!token) {
    reply.code(HTTP_STATUS.unauthorized).send({ error: 'Invalid token' });
    return;
  }

  // Mock validation - would implement actual JWT verification
  await Promise.resolve(); // Placeholder for future async operations
  logger.debug('JWT token validated (mock)');
}

async function registerCors(server: FastifyInstance): Promise<void> {
  await server.register(cors, {
    origin: process.env['NODE_ENV'] === 'production' ? false : true,
    credentials: true
  });
}

async function registerSwagger(server: FastifyInstance): Promise<void> {
  if (process.env['NODE_ENV'] !== 'production' && process.env['ENABLE_SWAGGER'] !== 'false') {
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'Gap Junction Control API',
          description: 'API for orchestrating compile, deploy, and monitor workflows',
          version: '1.0.0'
        },
        tags: [
          { name: 'health', description: 'Health check endpoints' },
          { name: 'channels', description: 'Channel management endpoints' },
          { name: 'builds', description: 'Build and deployment endpoints' },
          { name: 'agents', description: 'Agent management endpoints' },
          { name: 'capabilities', description: 'Capability token endpoints' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    });

    await server.register(swaggerUi, {
      routePrefix: '/api',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });
  }
}

async function registerSocketIO(server: FastifyInstance, services: Services): Promise<void> {
  await Promise.resolve(); // Placeholder for future async operations
  
  const io = new Server(server.server, {
    cors: {
      origin: process.env['NODE_ENV'] === 'production' ? false : true,
      credentials: true
    },
    path: '/socket.io/'
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('enroll', async (data: AgentEnrollRequestBody) => {
      logger.info('Agent enrollment request', { socketId: socket.id, runtimeId: data.runtimeId });
      try {
        const result = await services.agentsService.enroll(data);
        socket.emit('enroll_result', result);
      } catch (error) {
        logger.error('Agent enrollment failed', error);
        socket.emit('enroll_error', { error: 'Enrollment failed' });
      }
    });

    socket.on('heartbeat', async (data: Record<string, unknown>) => {
      logger.debug('Agent heartbeat', { socketId: socket.id, agentId: data['agentId'] });
      try {
        await services.webSocketService.handleHeartbeat(
          data['agentId'] as string,
          data['runtimeId'] as string,
          data
        );
      } catch (error) {
        logger.error('Heartbeat processing failed', error);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO server initialized');
}

function initializeServices(): Services {
  const configService = new ConfigService();
  
  // Initialize core services
  const supabaseService = new SupabaseService(configService, logger);
  const compilerService = new CompilerService(configService, logger);
  const webSocketService = new WebSocketService(logger);
  const idempotencyService = new IdempotencyService(logger);
  
  // Initialize business logic services with dependencies
  const channelsService = new ChannelsService(
    compilerService,
    supabaseService,
    webSocketService,
    logger
  );
  
  const buildsService = new BuildsService(
    supabaseService,
    webSocketService,
    logger
  );
  
  const agentsService = new AgentsService(logger);
  const capabilitiesService = new CapabilitiesService(logger);

  return {
    supabaseService,
    compilerService,
    channelsService,
    buildsService,
    agentsService,
    capabilitiesService,
    webSocketService,
    idempotencyService
  };
}

function registerHealthEndpoints(server: FastifyInstance, services: Services): void {
  server.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check',
      description: 'Returns the health status of the control API service',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            dependencies: {
              type: 'object',
              properties: {
                supabase: { type: 'boolean' },
                compiler: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async () => {
    const supabaseHealthy = await services.supabaseService.healthCheck();
    const compilerHealthy = await services.compilerService.healthCheck();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'gapjunction-control-api',
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        supabase: supabaseHealthy,
        compiler: compilerHealthy
      }
    };
  });

  server.get('/health/ready', {
    schema: {
      tags: ['health'],
      summary: 'Readiness check',
      description: 'Returns whether the service is ready to accept requests',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, () => ({
    ready: true,
    timestamp: new Date().toISOString()
  }));

  server.get('/health/live', {
    schema: {
      tags: ['health'],
      summary: 'Liveness check',
      description: 'Returns whether the service is alive',
      response: {
        200: {
          type: 'object',
          properties: {
            alive: { type: 'boolean' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, () => ({
    alive: true,
    timestamp: new Date().toISOString()
  }));
}

function registerChannelsEndpoints(server: FastifyInstance, services: Services): void {
  // Compile endpoint
  server.post<{ Params: { channelId: string }; Body: CompileRequestBody }>('/v1/channels/:channelId/compile', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['channels'],
      summary: 'Trigger compile for a channel',
      description: 'Compiles a channel IR into executable artifacts',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['channelId', 'orgId', 'userId', 'runtimeId', 'runtimeType', 'mode', 'irContent', 'irVersion'],
        properties: {
          channelId: { type: 'string' },
          orgId: { type: 'string' },
          userId: { type: 'string' },
          runtimeId: { type: 'string' },
          runtimeType: { type: 'string', enum: ['cloud', 'onprem'] },
          mode: { type: 'string', enum: ['PROD', 'TEST'] },
          irContent: { type: 'object' },
          irVersion: { type: 'number' },
          notes: { type: 'string' }
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            buildId: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { channelId: string }; Body: CompileRequestBody }>, reply: FastifyReply) => {
    const { channelId } = request.params;
    const compileRequest = request.body;

    // Check idempotency
    await idempotencyMiddleware(request, reply, services);
    if (reply.sent) return;

    try {
      const result = await services.channelsService.compile(channelId, compileRequest);
      
      // Store result for idempotency
      const idempotencyKey = request.headers['idempotency-key'] as string;
      const orgId = request.headers['x-org-id'] as string;
      if (idempotencyKey && orgId) {
        await services.idempotencyService.storeResult(orgId, idempotencyKey, result);
      }

      reply.code(HTTP_STATUS.accepted).send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Compile request failed', { error: errorMessage, channelId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Compilation failed' });
    }
  });

  // Channel control endpoints
  server.post<{ Params: { channelId: string }; Body: { runtimeId: string } }>('/v1/channels/:channelId/stop', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['channels'],
      summary: 'Stop a running channel on a runtime',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['runtimeId'],
        properties: {
          runtimeId: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { channelId: string }; Body: { runtimeId: string } }>, reply: FastifyReply) => {
    const { channelId } = request.params;
    const { runtimeId } = request.body;

    try {
      const result = await services.channelsService.stop(channelId, runtimeId);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Stop channel failed', { error: errorMessage, channelId, runtimeId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Failed to stop channel' });
    }
  });

  server.post<{ Params: { channelId: string }; Body: { runtimeId: string } }>('/v1/channels/:channelId/start', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['channels'],
      summary: 'Start a channel on a runtime',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['runtimeId'],
        properties: {
          runtimeId: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { channelId: string }; Body: { runtimeId: string } }>, reply: FastifyReply) => {
    const { channelId } = request.params;
    const { runtimeId } = request.body;

    try {
      const result = await services.channelsService.start(channelId, runtimeId);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Start channel failed', { error: errorMessage, channelId, runtimeId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Failed to start channel' });
    }
  });

  server.get<{ Params: { channelId: string }; Querystring: { runtimeId: string } }>('/v1/channels/:channelId/status', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['channels'],
      summary: 'Get channel status on a runtime',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        required: ['runtimeId'],
        properties: {
          runtimeId: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { channelId: string }; Querystring: { runtimeId: string } }>, reply: FastifyReply) => {
    const { channelId } = request.params;
    const { runtimeId } = request.query;

    try {
      const result = await services.channelsService.getStatus(channelId, runtimeId);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get channel status failed', { error: errorMessage, channelId, runtimeId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Failed to get channel status' });
    }
  });
}

function registerBuildsEndpoints(server: FastifyInstance, services: Services): void {
  server.post<{ Params: { buildId: string }; Body: DeployRequestBody }>('/v1/builds/:buildId/deploy', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['builds'],
      summary: 'Deploy a compiled build to a runtime',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          buildId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['runtimeId', 'channelId', 'mode', 'strategy'],
        properties: {
          runtimeId: { type: 'string' },
          channelId: { type: 'string' },
          mode: { type: 'string', enum: ['PROD', 'TEST'] },
          strategy: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['blueGreen', 'rolling', 'recreate'] },
              healthTimeoutSec: { type: 'number' },
              maxUnavailable: { type: 'number' }
            }
          }
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            deployId: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { buildId: string }; Body: DeployRequestBody }>, reply: FastifyReply) => {
    const { buildId } = request.params;
    const deployRequest = request.body;

    try {
      const result = await services.buildsService.deploy(buildId, deployRequest);
      reply.code(HTTP_STATUS.accepted).send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Deploy request failed', { error: errorMessage, buildId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Deployment failed' });
    }
  });
}

function registerAgentsEndpoints(server: FastifyInstance, services: Services): void {
  server.post<{ Body: AgentEnrollRequestBody }>('/v1/agents/enroll', {
    schema: {
      tags: ['agents'],
      summary: 'Enroll a new agent',
      body: {
        type: 'object',
        required: ['runtimeId', 'bootstrapToken', 'version', 'os'],
        properties: {
          runtimeId: { type: 'string' },
          bootstrapToken: { type: 'string' },
          version: { type: 'string' },
          os: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            agentJwt: { type: 'string' },
            overlay: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                enrollmentCode: { type: 'string' },
                lighthouses: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: AgentEnrollRequestBody }>, reply: FastifyReply) => {
    const enrollRequest = request.body;

    try {
      const result = await services.agentsService.enroll(enrollRequest);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Agent enrollment failed', { error: errorMessage, runtimeId: enrollRequest.runtimeId });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Agent enrollment failed' });
    }
  });
}

function registerCapabilitiesEndpoints(server: FastifyInstance, services: Services): void {
  server.post<{ Body: RouteTokenRequestBody }>('/v1/capabilities/route-token', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['capabilities'],
      summary: 'Issue a route capability token',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['fromRuntime', 'toRuntime', 'channelId', 'maxBytes', 'ttlSec'],
        properties: {
          fromRuntime: { type: 'string' },
          toRuntime: { type: 'string' },
          channelId: { type: 'string' },
          maxBytes: { type: 'number' },
          ttlSec: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RouteTokenRequestBody }>, reply: FastifyReply) => {
    const tokenRequest = request.body;

    try {
      const result = await services.capabilitiesService.issueRouteToken(tokenRequest);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Route token generation failed', { error: errorMessage });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Failed to issue route token' });
    }
  });

  server.post<{ Body: EnrollmentCodeRequestBody }>('/v1/capabilities/enrollment-code', {
    preHandler: [jwtAuthHook],
    schema: {
      tags: ['capabilities'],
      summary: 'Issue an enrollment code token',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['runtimeId', 'organizationId', 'userId', 'agentId', 'useP2p', 'ttlSec'],
        properties: {
          runtimeId: { type: 'string' },
          organizationId: { type: 'string' },
          userId: { type: 'string' },
          agentId: { type: 'string' },
          useP2p: { type: 'boolean' },
          ttlSec: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: EnrollmentCodeRequestBody }>, reply: FastifyReply) => {
    const codeRequest = request.body;

    try {
      const result = await services.capabilitiesService.issueEnrollmentCode(codeRequest);
      reply.send(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Enrollment code generation failed', { error: errorMessage });
      reply.code(HTTP_STATUS.internalServerError).send({ error: 'Failed to issue enrollment code' });
    }
  });
}

async function createServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info'
    }
  });

  await registerCors(server);
  await registerSwagger(server);

  const services = initializeServices();

  // Register Socket.IO
  await registerSocketIO(server, services);

  // Register all endpoints
  registerHealthEndpoints(server, services);
  registerChannelsEndpoints(server, services);
  registerBuildsEndpoints(server, services);
  registerAgentsEndpoints(server, services);
  registerCapabilitiesEndpoints(server, services);

  return await server;
}

async function start(): Promise<void> {
  try {
    const server = await createServer();
    const DEFAULT_PORT = 3002;
    const RADIX_DECIMAL = 10;
    const port = parseInt(process.env['PORT'] ?? DEFAULT_PORT.toString(), RADIX_DECIMAL);
    const host = process.env['HOST'] ?? '0.0.0.0';

    await server.listen({ port, host });
    
    logger.info(`🚀 Control API service is running on: http://${host}:${port}`);
    if (process.env['NODE_ENV'] !== 'production' && process.env['ENABLE_SWAGGER'] !== 'false') {
      logger.info(`📚 API documentation available at: http://${host}:${port}/api`);
    }
    logger.info(`🔌 WebSocket server listening for agent connections`);
  } catch (error) {
    logger.error('Failed to start control API service:', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  throw new Error('SIGINT received');
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  throw new Error('SIGTERM received');
});

start().catch((error) => {
  logger.error('Failed to start server:', error);
  throw error;
});