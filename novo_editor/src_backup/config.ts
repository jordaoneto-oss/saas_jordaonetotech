import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  PLATFORM_API_URL: z.string().url().min(1),
  INTERNAL_PLATFORM_TOKEN: z.string().min(12),
  JWT_SECRET: z.string().min(16),
  MEDUSA_API_URL: z.string().url().min(1),
  MEDUSA_API_KEY: z.string().min(12),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Configuração inválida do ambiente:\n${issues}`);
}

export const env = parsedEnv.data;
