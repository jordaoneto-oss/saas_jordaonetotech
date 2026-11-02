import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { PlatformIntegrationService } from '../services/platformIntegration';
import type { TenantContext } from '../types/tenant';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export const JwtPayloadSchema = z.object({
  sub: z.string(),
  tenantId: z.string(),
  iss: z.string().optional(),
  aud: z.string().optional(),
});

export function createTenantMiddleware(
  platformService: PlatformIntegrationService,
  jwtSecret: string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
        return;
      }

      const token = authHeader.split(' ')[1];

      let decodedToken: unknown;
      try {
        decodedToken = jwt.verify(token, jwtSecret);
      } catch (jwtError) {
        res.status(403).json({
          error: 'Token inválido ou expirado.',
          details: (jwtError as Error).message,
        });
        return;
      }

      const parsedPayload = JwtPayloadSchema.safeParse(decodedToken);
      if (!parsedPayload.success) {
        res.status(403).json({ error: 'Payload do token com estrutura inválida.' });
        return;
      }

      const { tenantId } = parsedPayload.data;
      if (!tenantId) {
        res.status(400).json({ error: 'Identificador de tenant ausente no contexto de segurança.' });
        return;
      }

      const tenantContext = await platformService.getTenantContext(tenantId);
      if (tenantContext.status !== 'active') {
        res.status(403).json({
          error: 'Acesso negado',
          message: `Loja com status: ${tenantContext.status}.`,
        });
        return;
      }

      req.tenant = tenantContext;
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Erro interno no processamento multi-tenant.',
        message: (error as Error).message,
      });
    }
  };
}
