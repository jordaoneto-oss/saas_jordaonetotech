import type { Router, Request, Response } from 'express';
import { z } from 'zod';

const ProductQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  search: z.string().max(100).optional(),
  categoryId: z.string().max(100).optional(),
});

const SavePageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  contentJson: z.object({}).passthrough(),
});

export function registerStoreRoutes(router: Router, medusaAdapter: any) {
  router.get('/stores/me/settings', (req: Request, res: Response) => {
    res.status(200).json({ success: true, tenant: req.tenant });
  });

  router.get('/stores/products', async (req: Request, res: Response) => {
    try {
      const query = ProductQuerySchema.parse(req.query);
      const products = await medusaAdapter.getProducts(req.tenant!.tenantId, query);
      res.status(200).json({ success: true, products });
    } catch (error) {
      res.status(400).json({
        error: 'Parâmetros inválidos.',
        details: (error as Error).message,
      });
    }
  });

  router.post('/stores/pages', async (req: Request, res: Response) => {
    const validation = SavePageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Dados inválidos.',
        details: validation.error.errors,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Página salva com sucesso!',
      data: validation.data,
    });
  });

  router.post('/stores/publish', async (req: Request, res: Response) => {
    if (!req.tenant?.features.visualEditor) {
      res.status(403).json({ error: 'Plano não permite publicação via editor visual.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Loja ${req.tenant.tenantId} publicada com sucesso!`,
    });
  });
}
