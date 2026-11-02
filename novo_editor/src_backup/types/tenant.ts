export type TenantStatus = 'active' | 'suspended' | 'pending';

export interface TenantPlan {
  id: string;
  name: string;
}

export interface TenantFeatures {
  catalog: boolean;
  visualEditor: boolean;
  customDomain: boolean;
  cart: boolean;
  checkout: boolean;
  multipleTemplates: boolean;
}

export interface TenantLimits {
  stores: number;
  products: number;
  storageMb: number;
}

export interface TenantContext {
  tenantId: string;
  externalTenantId: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  features: TenantFeatures;
  limits: TenantLimits;
}
