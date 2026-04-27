// =============================================
// RUTAS DE RESEÑAS (REVIEWS)
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

export const reviewRoutes = Router();

const ReviewSchema = z.object({
  productoId: z.number(),
  puntuacion: z.number().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

// GET /reviews/product/:id - Obtener reseñas de un producto
reviewRoutes.get('/product/:id', async (req, res, next) => {
  try {
    const productoId = parseInt(req.params.id);
    const reviews = await prisma.resena.findMany({
      where: { productoId, activo: true },
      include: {
        usuario: {
          select: { nombre: true, apellido: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

// POST /reviews - Crear una reseña (Solo para productos comprados)
reviewRoutes.post('/', autenticar, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const datos = ReviewSchema.parse(req.body);

    // Verificar si el usuario compró el producto y la orden está entregada
    const compra = await prisma.orden.findFirst({
      where: {
        usuarioId: req.usuario!.id,
        estado: 'ENTREGADA',
        items: {
          some: { productoId: datos.productoId }
        }
      }
    });

    if (!compra) {
      throw new AppError('Solo puedes calificar productos que hayas comprado y recibido.', 403);
    }

    const resena = await prisma.resena.upsert({
      where: {
        usuarioId_productoId: {
          usuarioId: req.usuario!.id,
          productoId: datos.productoId
        }
      },
      update: {
        puntuacion: datos.puntuacion,
        comentario: datos.comentario,
        activo: true
      },
      create: {
        usuarioId: req.usuario!.id,
        productoId: datos.productoId,
        puntuacion: datos.puntuacion,
        comentario: datos.comentario
      }
    });

    res.status(201).json({ success: true, data: resena });
  } catch (err) { next(err); }
});

// DELETE /reviews/:id - Eliminar una reseña (Soft delete)
reviewRoutes.delete('/:id', autenticar, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const resena = await prisma.resena.findFirst({
      where: { id, usuarioId: req.usuario!.id }
    });

    if (!resena) throw new AppError('Reseña no encontrada', 404);

    await prisma.resena.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ success: true, message: 'Reseña eliminada' });
  } catch (err) { next(err); }
});
