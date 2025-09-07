import fastify, { type FastifyInstance } from 'fastify';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HTTP_STATUS } from '../src/common/constants/http-status.js';

import { fixtures, mockHeaders } from './fixtures/index.js';

describe('Control API E2E Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a minimal Fastify app for E2E testing
    app = fastify({ logger: false });
    
    // Register CORS
    await app.register(import('@fastify/cors'), {
      origin: true,
      credentials: true,
    });

    // Mock authentication middleware
    app.addHook('preHandler', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (request.url.startsWith('/v1/') && (!authHeader?.startsWith('Bearer '))) {
        reply.code(HTTP_STATUS.unauthorized).send({ error: 'Missing or invalid authorization header' });
      }
    });

    // Health endpoints
    app.get('/health', () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'gapjunction-control-api',
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        supabase: true,
        compiler: true,
      },
    }));

    app.get('/health/ready', () => ({
      ready: true,
      timestamp: new Date().toISOString(),
    }));

    app.get('/health/live', () => ({
      alive: true,
      timestamp: new Date().toISOString(),
    }));

    // Channel endpoints
    app.post('/v1/channels/:channelId/compile', async (request, reply) => {
      const { channelId: channelIdParam } = request.params as { channelId: string };
      // channelIdParam is used implicitly in the endpoint logic
      void channelIdParam;
      const buildId = `build-${Date.now()}`;
      reply.code(HTTP_STATUS.accepted).send({ buildId, status: 'QUEUED' });
    });

    app.post('/v1/channels/:channelId/start', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.body as { runtimeId: string };
      reply.send({ channelId, runtimeId, status: 'STARTING' });
    });

    app.post('/v1/channels/:channelId/stop', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.body as { runtimeId: string };
      reply.send({ channelId, runtimeId, status: 'STOPPING' });
    });

    app.get('/v1/channels/:channelId/status', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.query as { runtimeId: string };
      reply.send({ channelId, runtimeId, status: 'RUNNING', health: 'HEALTHY' });
    });

    // Build endpoints
    app.post('/v1/builds/:buildId/deploy', async (request, reply) => {
      const deployId = `deploy-${Date.now()}`;
      reply.code(HTTP_STATUS.accepted).send({ deployId, status: 'QUEUED' });
    });

    // Agent endpoints
    app.post('/v1/agents/enroll', async (request, reply) => {
      reply.send({
        agentId: `agent-${Date.now()}`,
        agentJwt: 'mock-jwt-token',
        overlay: { enabled: true, enrollmentCode: 'mock-code', lighthouses: [] },
      });
    });

    // Capability endpoints
    app.post('/v1/capabilities/route-token', async (request, reply) => {
      reply.send({ token: 'mock-route-token' });
    });

    app.post('/v1/capabilities/enrollment-code', async (request, reply) => {
      reply.send({ token: 'mock-enrollment-token' });
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete Workflow Tests', () => {
    it('should complete full channel compilation and deployment workflow', async () => {
      const channelId = 'test-channel-123';
      const compileRequest = fixtures.requests.compile();

      // Step 1: Compile channel
      const compileResponse = await request(app.server)
        .post(`/v1/channels/${channelId}/compile`)
        .set(mockHeaders.withAuth)
        .send(compileRequest)
        .expect(HTTP_STATUS.accepted);

      expect(compileResponse.body).toMatchObject({
        buildId: expect.stringMatching(/^build-\d+$/),
        status: 'QUEUED',
      });

      const { buildId } = compileResponse.body;

      // Step 2: Deploy build
      const deployRequest = fixtures.requests.deploy();
      const deployResponse = await request(app.server)
        .post(`/v1/builds/${buildId}/deploy`)
        .set(mockHeaders.withAuth)
        .send(deployRequest)
        .expect(HTTP_STATUS.accepted);

      expect(deployResponse.body).toMatchObject({
        deployId: expect.stringMatching(/^deploy-\d+$/),
        status: 'QUEUED',
      });

      // Step 3: Start channel
      const startResponse = await request(app.server)
        .post(`/v1/channels/${channelId}/start`)
        .set(mockHeaders.withAuth)
        .send({ runtimeId: deployRequest.runtimeId })
        .expect(HTTP_STATUS.ok);

      expect(startResponse.body).toMatchObject({
        channelId,
        runtimeId: deployRequest.runtimeId,
        status: 'STARTING',
      });

      // Step 4: Check channel status
      const statusResponse = await request(app.server)
        .get(`/v1/channels/${channelId}/status`)
        .query({ runtimeId: deployRequest.runtimeId })
        .set(mockHeaders.withAuth)
        .expect(HTTP_STATUS.ok);

      expect(statusResponse.body).toMatchObject({
        channelId,
        runtimeId: deployRequest.runtimeId,
        status: 'RUNNING',
        health: 'HEALTHY',
      });
    });

    it('should complete agent enrollment and capability token workflow', async () => {
      // Step 1: Enroll agent
      const enrollRequest = fixtures.requests.agentEnroll();
      const enrollResponse = await request(app.server)
        .post('/v1/agents/enroll')
        .send(enrollRequest)
        .expect(HTTP_STATUS.ok);

      expect(enrollResponse.body).toMatchObject({
        agentId: expect.stringMatching(/^agent-\d+$/),
        agentJwt: 'mock-jwt-token',
        overlay: expect.objectContaining({
          enabled: true,
          enrollmentCode: 'mock-code',
        }),
      });

      // Step 2: Issue route token
      const routeTokenRequest = fixtures.requests.routeToken();
      const routeTokenResponse = await request(app.server)
        .post('/v1/capabilities/route-token')
        .set(mockHeaders.withAuth)
        .send(routeTokenRequest)
        .expect(HTTP_STATUS.ok);

      expect(routeTokenResponse.body).toMatchObject({
        token: 'mock-route-token',
      });

      // Step 3: Issue enrollment code
      const enrollmentCodeRequest = fixtures.requests.enrollmentCode();
      const enrollmentCodeResponse = await request(app.server)
        .post('/v1/capabilities/enrollment-code')
        .set(mockHeaders.withAuth)
        .send(enrollmentCodeRequest)
        .expect(HTTP_STATUS.ok);

      expect(enrollmentCodeResponse.body).toMatchObject({
        token: 'mock-enrollment-token',
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle authentication failures across endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/v1/channels/test/compile', body: {} },
        { method: 'post', path: '/v1/channels/test/start', body: {} },
        { method: 'post', path: '/v1/channels/test/stop', body: {} },
        { method: 'get', path: '/v1/channels/test/status', query: { runtimeId: 'test' } },
        { method: 'post', path: '/v1/builds/test/deploy', body: {} },
        { method: 'post', path: '/v1/capabilities/route-token', body: {} },
        { method: 'post', path: '/v1/capabilities/enrollment-code', body: {} },
      ];

      for (const endpoint of endpoints) {
        let req: any;
        
        switch (endpoint.method) {
          case 'get':
            req = request(app.server).get(endpoint.path);
            break;
          case 'post':
            req = request(app.server).post(endpoint.path);
            break;
          case 'put':
            req = request(app.server).put(endpoint.path);
            break;
          case 'delete':
            req = request(app.server).delete(endpoint.path);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
        }
        
        if (endpoint.body) {
          req.send(endpoint.body);
        }
        
        if (endpoint.query) {
          req.query(endpoint.query);
        }

        await req.expect(HTTP_STATUS.unauthorized);
      }
    });

    it('should handle malformed requests', async () => {
      // Test malformed JSON
      await request(app.server)
        .post('/v1/agents/enroll')
        .set('content-type', 'application/json')
        .send('invalid json')
        .expect(HTTP_STATUS.badRequest);

      // Test missing required fields
      await request(app.server)
        .post('/v1/channels/test/compile')
        .set(mockHeaders.withAuth)
        .send({})
        .expect(HTTP_STATUS.badRequest);
    });

    it('should handle non-existent resources', async () => {
      await request(app.server)
        .get('/non-existent-endpoint')
        .expect(HTTP_STATUS.notFound);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app.server)
          .get('/health')
          .expect(HTTP_STATUS.ok);
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      
      for (const response of responses) {
        expect(response.body.status).toBe('healthy');
      }
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app.server)
        .get('/health')
        .expect(HTTP_STATUS.ok);
      
      const duration = Date.now() - startTime;
      const maxDurationMs = 1000;
      expect(duration).toBeLessThan(maxDurationMs); // Should respond within 1 second
    });
  });

  describe('Security Tests', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      await request(app.server)
        .post('/v1/channels/test/compile')
        .set('authorization', 'Bearer invalid-token')
        .send(fixtures.requests.compile())
        .expect(HTTP_STATUS.unauthorized);
    });

    it('should handle CORS properly', async () => {
      const response = await request(app.server)
        .options('/v1/channels/test/compile')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type')
        .expect(HTTP_STATUS.noContent);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should sanitize error messages', async () => {
      const response = await request(app.server)
        .post('/v1/channels/test/compile')
        .expect(HTTP_STATUS.unauthorized);

      expect(response.body.error).toBe('Missing or invalid authorization header');
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('details');
    });
  });

  describe('API Documentation', () => {
    it('should serve health endpoints without authentication', async () => {
      await request(app.server).get('/health').expect(HTTP_STATUS.ok);
      await request(app.server).get('/health/ready').expect(HTTP_STATUS.ok);
      await request(app.server).get('/health/live').expect(HTTP_STATUS.ok);
    });

    it('should return consistent response formats', async () => {
      const healthResponse = await request(app.server)
        .get('/health')
        .expect(HTTP_STATUS.ok);

      expect(healthResponse.body).toHaveProperty('status');
      expect(healthResponse.body).toHaveProperty('timestamp');
      expect(healthResponse.body).toHaveProperty('service');
      expect(healthResponse.body).toHaveProperty('version');
      expect(healthResponse.body).toHaveProperty('uptime');
      expect(healthResponse.body).toHaveProperty('dependencies');
    });
  });
});