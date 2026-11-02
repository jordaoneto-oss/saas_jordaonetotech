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

export class MedusaCommerceAdapter {
  constructor(
    private readonly medusaApiUrl: string,
    private readonly apiKey: string,
  ) {}

  private async fetchMedusa<T>(endpoint: string, tenantId: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('x-medusa-access-token', this.apiKey);
    headers.set('x-tenant-id', tenantId);

    return fetchWithTimeout<T>(
      `${this.medusaApiUrl}${endpoint}`,
      {
        ...options,
        headers,
      },
      5000,
    );
  }

  async getProducts(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      categoryId?: string;
    },
  ): Promise<any[]> {
    const params = new URLSearchParams();

    if (options?.limit) params.append('limit', String(Math.min(options.limit, 24)));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.categoryId) params.append('category_id', options.categoryId);
    if (options?.search) params.append('q', options.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchMedusa<{ products: any[] }>(`/store/products${query}`, tenantId);

    return response.products ?? [];
  }
}
