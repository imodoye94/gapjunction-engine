import { type FastifyInstance } from 'fastify';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { HTTP_STATUS } from '../src/common/constants/http-status.js';

import { createTestServer } from './utils/test-helpers.js';

describe('Control API (e2e)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestServer();
    
    // Add basic health check routes for testing
    app.get('/health', () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });
    
    app.get('/health/ready', () => {
      return { status: 'ready', timestamp: new Date().toISOString() };
    });
    
    app.get('/health/live', () => {
      return { status: 'live', timestamp: new Date().toISOString() };
    });
    
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Checks', () => {
    it('/health (GET)', async () => {
      const response = await request(app.server)
        .get('/health')
        .expect(HTTP_STATUS.ok);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('/health/ready (GET)', async () => {
      const response = await request(app.server)
        .get('/health/ready')
        .expect(HTTP_STATUS.ok);
      
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('/health/live (GET)', async () => {
      const response = await request(app.server)
        .get('/health/live')
        .expect(HTTP_STATUS.ok);
      
      expect(response.body).toHaveProperty('status', 'live');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app.server)
        .get('/non-existent-endpoint')
        .expect(HTTP_STATUS.notFound);
      
      expect(response.body).toHaveProperty('message');
    });
  });
});