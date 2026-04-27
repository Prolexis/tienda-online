// =============================================
// RUTAS DE LISTA DE DESEOS (WISHLIST)
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

export const wishlistRoutes = Router();
wishlistRoutes.use(autenticar);

// GET /wishlist - Obtener lista de deseos del usuario
wishlistRoutes.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { usuarioId: req.usuario!.id },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            precioVenta: true,
            precioOferta: true,
            imagen: true,
            stock: true,
            sku: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: items.map(item => item.producto) });
  } catch (err) { next(err); }
});

// POST /wishlist - Agregar producto a la lista de deseos
wishlistRoutes.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productoId } = z.object({ productoId: z.number() }).parse(req.body);

    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new AppError('Producto no encontrado', 404);

    const wishlist = await prisma.wishlistItem.upsert({
      where: {
        usuarioId_productoId: {
          usuarioId: req.usuario!.id,
          productoId
        }
      },
      update: {}, // Si ya existe, no hace nada
      create: {
        usuarioId: req.usuario!.id,
        productoId
      }
    });

    res.status(201).json({ success: true, data: wishlist });
  } catch (err) { next(err); }
});

// DELETE /wishlist/:productoId - Eliminar producto de la lista de deseos
wishlistRoutes.delete('/:productoId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productoId = parseInt(req.params.productoId);
    if (isNaN(productoId)) throw new AppError('ID de producto inválido', 400);

    await prisma.wishlistItem.delete({
      where: {
        usuarioId_productoId: {
          usuarioId: req.usuario!.id,
          productoId
        }
      }
    });

    res.json({ success: true, message: 'Eliminado de la lista de deseos' });
  } catch (err) { next(err); }
});
