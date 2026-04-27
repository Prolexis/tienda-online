import { Router, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { z } from 'zod';

import { autenticar } from '../middleware/auth.middleware';

const notificationRoutes = Router();

// Todas las rutas requieren autenticación y rol autorizado
notificationRoutes.use(autenticar, requireRole('ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'));

/**
 * Listar notificaciones
 */
notificationRoutes.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { soloNoLeidas } = z.object({
      soloNoLeidas: z.string().optional()
    }).parse(req.query);

    const where: any = {};
    if (soloNoLeidas === 'true') {
      where.leida = false;
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const totalNoLeidas = await prisma.notificacion.count({
      where: { leida: false }
    });

    res.json({
      status: 'success',
      data: notificaciones,
      meta: { totalNoLeidas }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Marcar como leída
 */
notificationRoutes.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);

    await prisma.notificacion.update({
      where: { id: parseInt(id) },
      data: { leida: true }
    });

    res.json({
      status: 'success',
      message: 'Notificación marcada como leída'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Marcar todas como leídas
 */
notificationRoutes.post('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notificacion.updateMany({
      where: { leida: false },
      data: { leida: true }
    });

    res.json({
      status: 'success',
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (err) {
    next(err);
  }
});

export default notificationRoutes;
