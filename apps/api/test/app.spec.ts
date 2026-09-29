import { buildApp } from '../src/app';

describe('API Foundation & Health Tests', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('omnichannel-ai-saas-api');
  });

  it('POST /api/v1/auth/register validates schema with Zod', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'invalid-email',
        password: 'short',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('REGISTRATION_FAILED');
  });
});
