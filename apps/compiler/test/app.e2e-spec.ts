import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CompilerController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('healthy');
        expect(res.body.service).toBe('gapjunction-compiler');
      });
  });

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.ready).toBe(true);
      });
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res) => {
        expect(res.body.alive).toBe(true);
      });
  });

  it('/compiler/compile (POST) - should validate request', () => {
    return request(app.getHttpServer())
      .post('/compiler/compile')
      .send({})
      .expect(400);
  });

  it('/compiler/verifySecurityAck (POST) - should validate request', () => {
    return request(app.getHttpServer())
      .post('/compiler/verifySecurityAck')
      .send({})
      .expect(400);
  });
});