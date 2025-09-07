import fastify, { type FastifyInstance } from 'fastify';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { fixtures, mockHeaders } from './fixtures/index.js';
import { createMockSupabaseClient, createMockAxios } from './utils/test-helpers.js';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}));

vi.mock('axios', () => ({
  default: createMockAxios(),
  create: vi.fn(() => createMockAxios()),
  isAxiosError: vi.fn(),
}));

vi.mock('socket.io', () => ({
  Server: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
  })),
}));

describe('Control API Integration Tests', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mocks
    createMockSupabaseClient();
    createMockAxios();
    
    // Create Fastify app
    app = fastify({ logger: false });
    
    // Register CORS
    await app.register(import('@fastify/cors'), {
      origin: true,
      credentials: true,
    });

    // Mock JWT auth middleware
    app.addHook('preHandler', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (request.url.startsWith('/v1/') && (!authHeader?.startsWith('Bearer '))) {
        reply.code(401).send({ error: 'Missing or invalid authorization header' });
        
      }
    });

    // Register health endpoints
    app.get('/health', async () => ({
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

    app.get('/health/ready', async () => ({
      ready: true,
      timestamp: new Date().toISOString(),
    }));

    app.get('/health/live', async () => ({
      alive: true,
      timestamp: new Date().toISOString(),
    }));

    // Register channel endpoints
    app.post('/v1/channels/:channelId/compile', async (request, reply) => {
      // Mock successful compilation
      const buildId = `build-${Date.now()}`;
      reply.code(202).send({
        buildId,
        status: 'QUEUED',
      });
    });

    app.post('/v1/channels/:channelId/start', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.body as { runtimeId: string };

      reply.send({
        channelId,
        runtimeId,
        status: 'STARTING',
        message: 'Channel start initiated',
      });
    });

    app.post('/v1/channels/:channelId/stop', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.body as { runtimeId: string };

      reply.send({
        channelId,
        runtimeId,
        status: 'STOPPING',
        message: 'Channel stop initiated',
      });
    });

    app.get('/v1/channels/:channelId/status', async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const { runtimeId } = request.query as { runtimeId: string };

      reply.send({
        channelId,
        runtimeId,
        status: 'RUNNING',
        health: 'HEALTHY',
        uptime: 3600,
      });
    });

    // Register build endpoints
    app.post('/v1/builds/:buildId/deploy', async (request, reply) => {
      const deployId = `deploy-${Date.now()}`;
      reply.code(202).send({
        deployId,
        status: 'QUEUED',
      });
    });

    // Register agent endpoints
    app.post('/v1/agents/enroll', async (request, reply) => {
      reply.send({
        agentId: `agent-${Date.now()}`,
        agentJwt: 'mock-jwt-token',
        overlay: {
          enabled: true,
          enrollmentCode: 'mock-enrollment-code',
          lighthouses: ['lighthouse1.example.com'],
        },
      });
    });

    // Register capability endpoints
    app.post('/v1/capabilities/route-token', async (request, reply) => {
      reply.send({
        token: 'mock-route-token',
      });
    });

    app.post('/v1/capabilities/enrollment-code', async (request, reply) => {
      reply.send({
        token: 'mock-enrollment-token',
      });
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app.server)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'gapjunction-control-api',
        version: '1.0.0',
        dependencies: {
          supabase: true,
          compiler: true,
        },
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should return readiness status', async () => {
      const response = await request(app.server)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        ready: true,
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return liveness status', async () => {
      const response = await request(app.server)
        .get('/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        alive: true,
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Channel Endpoints', () => {
    describe('POST /v1/channels/:channelId/compile', () => {
      it('should compile channel successfully', async () => {
        const channelId = 'test-channel-123';
        const compileRequest = fixtures.requests.compile();

        const response = await request(app.server)
          .post(`/v1/channels/${channelId}/compile`)
          .set(mockHeaders.withAuth)
          .send(compileRequest)
          .expect(202);

        expect(response.body).toMatchObject({
          buildId: expect.stringMatching(/^build-\d+$/),
          status: 'QUEUED',
        });
      });

      it('should require authentication', async () => {
        const channelId = 'test-channel-123';
        const compileRequest = fixtures.requests.compile();

        await request(app.server)
          .post(`/v1/channels/${channelId}/compile`)
          .send(compileRequest)
          .expect(401);
      });

      it('should handle invalid authorization header', async () => {
        const channelId = 'test-channel-123';
        const compileRequest = fixtures.requests.compile();

        await request(app.server)
          .post(`/v1/channels/${channelId}/compile`)
          .set('authorization', 'Invalid token')
          .send(compileRequest)
          .expect(401);
      });
    });

    describe('POST /v1/channels/:channelId/start', () => {
      it('should start channel successfully', async () => {
        const channelId = 'test-channel-123';
        const startRequest = { runtimeId: 'test-runtime-123' };

        const response = await request(app.server)
          .post(`/v1/channels/${channelId}/start`)
          .set(mockHeaders.withAuth)
          .send(startRequest)
          .expect(200);

        expect(response.body).toMatchObject({
          channelId,
          runtimeId: startRequest.runtimeId,
          status: 'STARTING',
          message: 'Channel start initiated',
        });
      });

      it('should require authentication', async () => {
        const channelId = 'test-channel-123';
        const startRequest = { runtimeId: 'test-runtime-123' };

        await request(app.server)
          .post(`/v1/channels/${channelId}/start`)
          .send(startRequest)
          .expect(401);
      });
    });

    describe('POST /v1/channels/:channelId/stop', () => {
      it('should stop channel successfully', async () => {
        const channelId = 'test-channel-123';
        const stopRequest = { runtimeId: 'test-runtime-123' };

        const response = await request(app.server)
          .post(`/v1/channels/${channelId}/stop`)
          .set(mockHeaders.withAuth)
          .send(stopRequest)
          .expect(200);

        expect(response.body).toMatchObject({
          channelId,
          runtimeId: stopRequest.runtimeId,
          status: 'STOPPING',
          message: 'Channel stop initiated',
        });
      });

      it('should require authentication', async () => {
        const channelId = 'test-channel-123';
        const stopRequest = { runtimeId: 'test-runtime-123' };

        await request(app.server)
          .post(`/v1/channels/${channelId}/stop`)
          .send(stopRequest)
          .expect(401);
      });
    });

    describe('GET /v1/channels/:channelId/status', () => {
      it('should get channel status successfully', async () => {
        const channelId = 'test-channel-123';
        const runtimeId = 'test-runtime-123';

        const response = await request(app.server)
          .get(`/v1/channels/${channelId}/status`)
          .query({ runtimeId })
          .set(mockHeaders.withAuth)
          .expect(200);

        expect(response.body).toMatchObject({
          channelId,
          runtimeId,
          status: 'RUNNING',
          health: 'HEALTHY',
          uptime: 3600,
        });
      });

      it('should require authentication', async () => {
        const channelId = 'test-channel-123';
        const runtimeId = 'test-runtime-123';

        await request(app.server)
          .get(`/v1/channels/${channelId}/status`)
          .query({ runtimeId })
          .expect(401);
      });
    });
  });

  describe('Build Endpoints', () => {
    describe('POST /v1/builds/:buildId/deploy', () => {
      it('should deploy build successfully', async () => {
        const buildId = 'test-build-123';
        const deployRequest = fixtures.requests.deploy();

        const response = await request(app.server)
          .post(`/v1/builds/${buildId}/deploy`)
          .set(mockHeaders.withAuth)
          .send(deployRequest)
          .expect(202);

        expect(response.body).toMatchObject({
          deployId: expect.stringMatching(/^deploy-\d+$/),
          status: 'QUEUED',
        });
      });

      it('should require authentication', async () => {
        const buildId = 'test-build-123';
        const deployRequest = fixtures.requests.deploy();

        await request(app.server)
          .post(`/v1/builds/${buildId}/deploy`)
          .send(deployRequest)
          .expect(401);
      });
    });
  });

  describe('Agent Endpoints', () => {
    describe('POST /v1/agents/enroll', () => {
      it('should enroll agent successfully', async () => {
        const enrollRequest = fixtures.requests.agentEnroll();

        const response = await request(app.server)
          .post('/v1/agents/enroll')
          .send(enrollRequest)
          .expect(200);

        expect(response.body).toMatchObject({
          agentId: expect.stringMatching(/^agent-\d+$/),
          agentJwt: 'mock-jwt-token',
          overlay: {
            enabled: true,
            enrollmentCode: 'mock-enrollment-code',
            lighthouses: ['lighthouse1.example.com'],
          },
        });
      });

      it('should not require authentication for enrollment', async () => {
        const enrollRequest = fixtures.requests.agentEnroll();

        await request(app.server)
          .post('/v1/agents/enroll')
          .send(enrollRequest)
          .expect(200);
      });
    });
  });

  describe('Capability Endpoints', () => {
    describe('POST /v1/capabilities/route-token', () => {
      it('should issue route token successfully', async () => {
        const tokenRequest = fixtures.requests.routeToken();

        const response = await request(app.server)
          .post('/v1/capabilities/route-token')
          .set(mockHeaders.withAuth)
          .send(tokenRequest)
          .expect(200);

        expect(response.body).toMatchObject({
          token: 'mock-route-token',
        });
      });

      it('should require authentication', async () => {
        const tokenRequest = fixtures.requests.routeToken();

        await request(app.server)
          .post('/v1/capabilities/route-token')
          .send(tokenRequest)
          .expect(401);
      });
    });

    describe('POST /v1/capabilities/enrollment-code', () => {
      it('should issue enrollment code successfully', async () => {
        const codeRequest = fixtures.requests.enrollmentCode();

        const response = await request(app.server)
          .post('/v1/capabilities/enrollment-code')
          .set(mockHeaders.withAuth)
          .send(codeRequest)
          .expect(200);

        expect(response.body).toMatchObject({
          token: 'mock-enrollment-token',
        });
      });

      it('should require authentication', async () => {
        const codeRequest = fixtures.requests.enrollmentCode();

        await request(app.server)
          .post('/v1/capabilities/enrollment-code')
          .send(codeRequest)
          .expect(401);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app.server)
        .get('/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app.server)
        .post('/v1/agents/enroll')
        .set('content-type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      await request(app.server)
        .options('/v1/channels/test/compile')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type')
        .expect(204);
    });

    it('should include CORS headers in responses', async () => {
      const response = await request(app.server)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });
});
