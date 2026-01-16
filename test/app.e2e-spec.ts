import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('E2E Tests', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let testUsername: string;
  let testEmail: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    testUsername = `testuser${timestamp}`;
    testEmail = `testuser${timestamp}@example.com`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / - health check', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Its Running');
  });

  describe('Authentication', () => {
    it('POST /auth/register - should create new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: 'TestPassword123!',
          username: testUsername,
          fullName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user.email).toBe(testEmail);
          accessToken = res.body.accessToken;
        });
    });

    it('POST /auth/register - should reject duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `another${testEmail}`,
          password: 'TestPassword123!',
          username: testUsername,
          fullName: 'Another User',
        })
        .expect(409);
    });

    it('POST /auth/login - should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'TestPassword123!' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          accessToken = res.body.accessToken;
        });
    });

    it('POST /auth/login - should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' })
        .expect(401);
    });

    it('GET /auth/me - should return current user', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testEmail);
        });
    });

    it('GET /auth/me - should reject without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('POST /auth/logout - should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Validation', () => {
    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          username: `test${Date.now()}`,
          fullName: 'Test',
        })
        .expect(400);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'weak',
          username: `test${Date.now()}`,
          fullName: 'Test',
        })
        .expect(400);
    });

    it('should reject short username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'TestPassword123!',
          username: 'ab',
          fullName: 'Test',
        })
        .expect(400);
    });
  });
});
