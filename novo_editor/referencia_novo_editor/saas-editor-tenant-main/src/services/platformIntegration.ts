import { z } from 'zod';
import type { TenantContext } from '../types/tenant';

export const TenantResponseSchema = z.object({
  tenant_id: z.string(),
  external_tenant_id: z.string().optional(),
  name: z.string(),
  status: z.enum(['active', 'suspended', 'pending']),
  plan: z.object({
    id: z.string(),
    name: z.string(),
  }),
  features: z.object({
    catalog: z.boolean(),
    visualEditor: z.boolean(),
    customDomain: z.boolean(),
    cart: z.boolean(),
    checkout: z.boolean(),
    multipleTemplates: z.boolean(),
  }),
  limits: z.object({
    stores: z.number(),
    products: z.number(),
    storageMb: z.number(),
  }),
});

async function fetchWithTimeout<T>(
  input: string,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export class PlatformIntegrationService {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
  ) {}

  async getTenantContext(tenantId: string): Promise<TenantContext> {
    try {
      const rawData = await fetchWithTimeout<any>(
        `${this.baseUrl}/api/tenants/${tenantId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.internalToken}`,
            'Content-Type': 'application/json',
          },
        },
        5000,
      );

      const validated = TenantResponseSchema.parse(rawData);

      return {
        tenantId: validated.tenant_id,
        externalTenantId: validated.external_tenant_id || validated.tenant_id,
        name: validated.name,
        status: validated.status,
        plan: validated.plan,
        features: validated.features,
        limits: validated.limits,
      };
    } catch (error) {
      throw new Error(`Erro no PlatformIntegrationService.getTenantContext: ${(error as Error).message}`);
    }
  }
}
