import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import { Server } from 'socket.io';
import * as winston from 'winston';
// Import converted services
import { SupabaseService } from './services/supabase.service.js';
import { CompilerService } from './services/compiler.service.js';
import { ChannelsService } from './channels/channels.service.js';
import { BuildsService } from './builds/builds.service.js';
import { AgentsService } from './agents/agents.service.js';
import { CapabilitiesService } from './capabilities/capabilities.service.js';
import { WebSocketService } from './websocket/websocket.service.js';
import { IdempotencyService } from './common/services/idempotency.service.js';
// Load environment variables
dotenv.config();
// Configure Winston logger
const logger = winston.createLogger({
    level: process.env['LOG_LEVEL'] ?? 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
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
    get(key, defaultValue) {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is not defined`);
        }
        return value;
    }
}
// Middleware for idempotency
async function idempotencyMiddleware(request, reply, services) {
    const idempotencyKey = request.headers['idempotency-key'];
    const orgId = request.headers['x-org-id'];
    if (!idempotencyKey || !orgId) {
        return; // Skip idempotency check if headers are missing
    }
    const cachedResult = await services.idempotencyService.checkIdempotency(orgId, idempotencyKey);
    if (cachedResult) {
        reply.code(200).send(cachedResult);
        return;
    }
}
// JWT Authentication hook (placeholder)
async function jwtAuthHook(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing or invalid authorization header' });
        return;
    }
    // TODO: Implement actual JWT validation
    const token = authHeader.substring(7);
    if (!token) {
        reply.code(401).send({ error: 'Invalid token' });
        return;
    }
    // Mock validation - would implement actual JWT verification
    logger.debug('JWT token validated (mock)');
}
async function registerCors(server) {
    await server.register(cors, {
        origin: process.env['NODE_ENV'] === 'production' ? false : true,
        credentials: true
    });
}
async function registerSwagger(server) {
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
async function registerSocketIO(server, services) {
    const io = new Server(server.server, {
        cors: {
            origin: process.env['NODE_ENV'] === 'production' ? false : true,
            credentials: true
        },
        path: '/socket.io/'
    });
    io.on('connection', (socket) => {
        logger.info(`WebSocket client connected: ${socket.id}`);
        socket.on('enroll', async (data) => {
            logger.info('Agent enrollment request', { socketId: socket.id, runtimeId: data.runtimeId });
            try {
                const result = await services.agentsService.enroll(data);
                socket.emit('enroll_result', result);
            }
            catch (error) {
                logger.error('Agent enrollment failed', error);
                socket.emit('enroll_error', { error: 'Enrollment failed' });
            }
        });
        socket.on('heartbeat', async (data) => {
            logger.debug('Agent heartbeat', { socketId: socket.id, agentId: data.agentId });
            try {
                await services.webSocketService.handleHeartbeat(data.agentId, data.runtimeId, data);
            }
            catch (error) {
                logger.error('Heartbeat processing failed', error);
            }
        });
        socket.on('disconnect', () => {
            logger.info(`WebSocket client disconnected: ${socket.id}`);
        });
    });
    logger.info('Socket.IO server initialized');
}
function initializeServices() {
    const configService = new ConfigService();
    // Initialize core services
    const supabaseService = new SupabaseService(configService, logger);
    const compilerService = new CompilerService(configService, logger);
    const webSocketService = new WebSocketService(logger);
    const idempotencyService = new IdempotencyService(logger);
    // Initialize business logic services with dependencies
    const channelsService = new ChannelsService(compilerService, supabaseService, webSocketService, logger);
    const buildsService = new BuildsService(supabaseService, webSocketService, logger);
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
function registerHealthEndpoints(server, services) {
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
function registerChannelsEndpoints(server, services) {
    // Compile endpoint
    server.post('/v1/channels/:channelId/compile', {
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
    }, async (request, reply) => {
        const { channelId } = request.params;
        const compileRequest = request.body;
        // Check idempotency
        await idempotencyMiddleware(request, reply, services);
        if (reply.sent)
            return;
        try {
            const result = await services.channelsService.compile(channelId, compileRequest);
            // Store result for idempotency
            const idempotencyKey = request.headers['idempotency-key'];
            const orgId = request.headers['x-org-id'];
            if (idempotencyKey && orgId) {
                await services.idempotencyService.storeResult(orgId, idempotencyKey, result);
            }
            reply.code(202).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Compile request failed', { error: errorMessage, channelId });
            reply.code(500).send({ error: 'Compilation failed' });
        }
    });
    // Channel control endpoints
    server.post('/v1/channels/:channelId/stop', {
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
    }, async (request, reply) => {
        const { channelId } = request.params;
        const { runtimeId } = request.body;
        try {
            const result = await services.channelsService.stop(channelId, runtimeId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Stop channel failed', { error: errorMessage, channelId, runtimeId });
            reply.code(500).send({ error: 'Failed to stop channel' });
        }
    });
    server.post('/v1/channels/:channelId/start', {
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
    }, async (request, reply) => {
        const { channelId } = request.params;
        const { runtimeId } = request.body;
        try {
            const result = await services.channelsService.start(channelId, runtimeId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Start channel failed', { error: errorMessage, channelId, runtimeId });
            reply.code(500).send({ error: 'Failed to start channel' });
        }
    });
    server.get('/v1/channels/:channelId/status', {
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
    }, async (request, reply) => {
        const { channelId } = request.params;
        const { runtimeId } = request.query;
        try {
            const result = await services.channelsService.getStatus(channelId, runtimeId);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Get channel status failed', { error: errorMessage, channelId, runtimeId });
            reply.code(500).send({ error: 'Failed to get channel status' });
        }
    });
}
function registerBuildsEndpoints(server, services) {
    server.post('/v1/builds/:buildId/deploy', {
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
    }, async (request, reply) => {
        const { buildId } = request.params;
        const deployRequest = request.body;
        try {
            const result = await services.buildsService.deploy(buildId, deployRequest);
            reply.code(202).send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Deploy request failed', { error: errorMessage, buildId });
            reply.code(500).send({ error: 'Deployment failed' });
        }
    });
}
function registerAgentsEndpoints(server, services) {
    server.post('/v1/agents/enroll', {
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
    }, async (request, reply) => {
        const enrollRequest = request.body;
        try {
            const result = await services.agentsService.enroll(enrollRequest);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Agent enrollment failed', { error: errorMessage, runtimeId: enrollRequest.runtimeId });
            reply.code(500).send({ error: 'Agent enrollment failed' });
        }
    });
}
function registerCapabilitiesEndpoints(server, services) {
    server.post('/v1/capabilities/route-token', {
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
    }, async (request, reply) => {
        const tokenRequest = request.body;
        try {
            const result = await services.capabilitiesService.issueRouteToken(tokenRequest);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Route token generation failed', { error: errorMessage });
            reply.code(500).send({ error: 'Failed to issue route token' });
        }
    });
    server.post('/v1/capabilities/enrollment-code', {
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
    }, async (request, reply) => {
        const codeRequest = request.body;
        try {
            const result = await services.capabilitiesService.issueEnrollmentCode(codeRequest);
            reply.send(result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Enrollment code generation failed', { error: errorMessage });
            reply.code(500).send({ error: 'Failed to issue enrollment code' });
        }
    });
}
async function createServer() {
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
    return server;
}
async function start() {
    try {
        const server = await createServer();
        const port = parseInt(process.env['PORT'] ?? '3002', 10);
        const host = process.env['HOST'] ?? '0.0.0.0';
        await server.listen({ port, host });
        logger.info(`🚀 Control API service is running on: http://${host}:${port}`);
        if (process.env['NODE_ENV'] !== 'production' && process.env['ENABLE_SWAGGER'] !== 'false') {
            logger.info(`📚 API documentation available at: http://${host}:${port}/api`);
        }
        logger.info(`🔌 WebSocket server listening for agent connections`);
    }
    catch (error) {
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
//# sourceMappingURL=main.js.map