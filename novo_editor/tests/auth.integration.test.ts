import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Auth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject requests without bearer token', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/stores/me/settings');

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Token de autenticação/i);
  });

  it('should accept a valid tenant token and return tenant data', async () => {
    const app = createApp();

    const token = jwt.sign(
      { sub: 'user-1', tenantId: 'tenant-123' },
      'jwt-secret-super-seguro123',
    );

    const response = await request(app)
      .get('/api/v1/stores/me/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tenant.tenantId).toBe('tenant-123');
  });

  it('should reject invalid JWT', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/stores/me/settings')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/Token inválido/i);
  });
});
