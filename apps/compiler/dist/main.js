import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import * as winston from 'winston';
import { ArtifactsService } from './services/artifacts.service.js';
import { BundlingService } from './services/bundling.service.js';
import { CompilerService } from './services/compiler.service.js';
import { HashingService } from './services/hashing.service.js';
import { IdGeneratorService } from './services/id-generator.service.js';
import { NexonTemplateService } from './services/nexon-template.service.js';
import { ParameterSubstitutionService } from './services/parameter-substitution.service.js';
import { PolicyService } from './services/policy.service.js';
import { ValidationService } from './services/validation.service.js';
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
            filename: 'logs/compiler-error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: 'logs/compiler-combined.log'
        })
    ]
});
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
                    title: 'Gap Junction Compiler API',
                    description: 'API for validating and compiling integration workflows',
                    version: '1.0.0'
                },
                tags: [
                    { name: 'compiler', description: 'Compilation endpoints' },
                    { name: 'health', description: 'Health check endpoints' }
                ]
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
function initializeServices() {
    const idGenerator = new IdGeneratorService();
    const hashingService = new HashingService();
    const nexonTemplateService = new NexonTemplateService();
    const parameterSubstitutionService = new ParameterSubstitutionService();
    const validationService = new ValidationService();
    const policyService = new PolicyService();
    const artifactsService = new ArtifactsService(nexonTemplateService, parameterSubstitutionService, idGenerator);
    const bundlingService = new BundlingService(hashingService);
    return new CompilerService(validationService, policyService, artifactsService, bundlingService);
}
function registerHealthEndpoints(server) {
    server.get('/health', {
        schema: {
            tags: ['health'],
            summary: 'Health check',
            description: 'Returns the health status of the compiler service',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                        service: { type: 'string' },
                        version: { type: 'string' },
                        uptime: { type: 'number' }
                    }
                }
            }
        }
    }, () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'gapjunction-compiler',
        version: '1.0.0',
        uptime: process.uptime()
    }));
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
function registerCompilerEndpoints(server, compilerService) {
    server.post('/compiler/compile', {
        schema: {
            tags: ['compiler'],
            summary: 'Compile a channel IR',
            description: 'Validates and compiles a GapJunction channel IR into executable artifacts',
            body: {
                type: 'object',
                required: ['channel', 'orgId', 'userId'],
                properties: {
                    channel: { type: 'object' },
                    orgId: { type: 'string' },
                    userId: { type: 'string' },
                    acknowledgedViolations: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        buildId: { type: 'string' },
                        validation: { type: 'object' },
                        policyLint: { type: 'object' },
                        errors: { type: 'array', items: { type: 'string' } },
                        warnings: { type: 'array', items: { type: 'string' } },
                        bundle: { type: 'string', description: 'Base64 encoded bundle' },
                        artifactHashes: { type: 'object' },
                        bundleHash: { type: 'string' },
                        merkleRoot: { type: 'string' },
                        metadata: { type: 'object' },
                        compiledArtifacts: { type: 'object' }
                    }
                }
            }
        }
    }, async (request) => {
        const { channel, orgId, userId, acknowledgedViolations } = request.body;
        logger.info('Received compile request', {
            orgId,
            userId,
            hasChannel: Boolean(channel),
            acknowledgedCount: acknowledgedViolations?.length ?? 0
        });
        try {
            const result = await compilerService.compile({
                channel,
                orgId,
                userId,
                acknowledgedViolations: acknowledgedViolations ?? []
            });
            logger.info('Compile request completed', {
                success: result.success,
                buildId: result.buildId,
                errorCount: result.errors?.length ?? 0,
                warningCount: result.warnings?.length ?? 0
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error('Compile request failed', { error: errorMessage, stack: errorStack });
            throw new Error('Compilation failed');
        }
    });
    server.post('/compiler/verifySecurityAck', {
        schema: {
            tags: ['compiler'],
            summary: 'Verify security acknowledgment',
            description: 'Acknowledges policy violations to allow compilation to proceed',
            body: {
                type: 'object',
                required: ['channelId', 'userId', 'violationIds', 'reason'],
                properties: {
                    channelId: { type: 'string' },
                    userId: { type: 'string' },
                    violationIds: { type: 'array', items: { type: 'string' } },
                    reason: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        acknowledgedViolations: { type: 'array', items: { type: 'string' } },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request) => {
        const { channelId, userId, violationIds, reason } = request.body;
        logger.info('Received security acknowledgment request', {
            channelId,
            userId,
            violationCount: violationIds.length
        });
        try {
            const result = compilerService.verifySecurityAck({
                channelId,
                userId,
                violationIds,
                reason
            });
            logger.info('Security acknowledgment completed', {
                success: result.success,
                acknowledgedCount: result.acknowledgedViolations.length
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Security acknowledgment failed', { error: errorMessage });
            throw new Error('Security acknowledgment failed');
        }
    });
    server.get('/compiler/status/:buildId', {
        schema: {
            tags: ['compiler'],
            summary: 'Get compilation status',
            description: 'Retrieves the status of a compilation build',
            params: {
                type: 'object',
                properties: {
                    buildId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        buildId: { type: 'string' },
                        status: { type: 'string' },
                        timestamp: { type: 'string' }
                    }
                }
            }
        }
    }, async (request) => {
        const { buildId } = request.params;
        if (!buildId) {
            throw new Error('Build ID is required');
        }
        logger.debug('Retrieving build status', { buildId });
        try {
            const status = compilerService.getCompilationStatus(buildId);
            return status;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to retrieve build status', { error: errorMessage, buildId });
            throw new Error('Failed to retrieve build status');
        }
    });
}
async function createServer() {
    const server = fastify({
        logger: {
            level: process.env['LOG_LEVEL'] ?? 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        }
    });
    await registerCors(server);
    await registerSwagger(server);
    const compilerService = initializeServices();
    registerHealthEndpoints(server);
    registerCompilerEndpoints(server, compilerService);
    return server;
}
async function start() {
    try {
        const server = await createServer();
        const port = parseInt(process.env['PORT'] ?? '3001', 10);
        const host = process.env['HOST'] ?? '0.0.0.0';
        await server.listen({ port, host });
        logger.info(`🚀 Compiler service is running on: http://${host}:${port}`);
        if (process.env['NODE_ENV'] !== 'production' && process.env['ENABLE_SWAGGER'] !== 'false') {
            logger.info(`📚 API documentation available at: http://${host}:${port}/api`);
        }
    }
    catch (error) {
        logger.error('Failed to start compiler service:', error);
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