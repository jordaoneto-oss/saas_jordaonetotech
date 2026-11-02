import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createTenantMiddleware } from '../src/middleware/tenant';

describe('createTenantMiddleware', () => {
  it('should reject requests without Bearer token', async () => {
    const platformService = { getTenantContext: vi.fn() };

    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    const middleware = createTenantMiddleware(platformService as any, 'jwt-secret-super-seguro123');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept a valid token and attach tenant to request', async () => {
    const platformService = {
      getTenantContext: vi.fn().mockResolvedValue({
        tenantId: 'tenant-123',
        externalTenantId: 'ext-123',
        name: 'Loja Teste',
        status: 'active',
        plan: { id: 'plan-1', name: 'Pro' },
        features: {
          catalog: true,
          visualEditor: true,
          customDomain: false,
          cart: true,
          checkout: true,
          multipleTemplates: false,
        },
        limits: { stores: 1, products: 100, storageMb: 500 },
      }),
    };

    const token = jwt.sign(
      { sub: 'user-1', tenantId: 'tenant-123' },
      'jwt-secret-super-seguro123',
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const next = vi.fn();

    const middleware = createTenantMiddleware(platformService as any, 'jwt-secret-super-seguro123');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.tenant?.tenantId).toBe('tenant-123');
  });
});
