import { describe, it, expect, vi } from 'vitest';
import { PlatformIntegrationService } from '../src/services/platformIntegration';

describe('PlatformIntegrationService', () => {
  it('should map tenant payload to TenantContext', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tenant_id: 'tenant-123',
        external_tenant_id: 'ext-123',
        name: 'Loja Demo',
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
        limits: {
          stores: 1,
          products: 50,
          storageMb: 1000,
        },
      }),
    });

    global.fetch = mockFetch as any;

    const service = new PlatformIntegrationService('https://api.example.com', 'token-123');
    const tenant = await service.getTenantContext('tenant-123');

    expect(tenant.tenantId).toBe('tenant-123');
    expect(tenant.name).toBe('Loja Demo');
    expect(tenant.status).toBe('active');
    expect(tenant.plan.name).toBe('Pro');
  });
});
