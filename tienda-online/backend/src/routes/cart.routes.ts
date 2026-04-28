// =============================================
// RUTAS DEL CARRITO DE COMPRAS
// =============================================

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as cartService from '../services/cart.service';
import { autenticar } from '../middleware/auth.middleware';
import type { AuthRequest, AddToCartDTO, UpdateCartItemDTO } from '../types';

export const cartRoutes = Router();

// Todas las rutas del carrito requieren autenticación
cartRoutes.use(autenticar);

// ─── Esquemas de validación ───────────────────────────────────
const AddToCartSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive().max(99),
});

const UpdateCartItemSchema = z.object({
  cantidad: z.coerce.number().int().min(0),
});

const ParamsItemSchema = z.object({
  itemId: z.coerce.number().int().positive(),
});

// GET /cart - Ver carrito actual
cartRoutes.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const carrito = await cartService.obtenerOCrearCarrito(req.usuario.id);

      res.json({
        success: true,
        data: carrito,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /cart/items - Agregar producto
cartRoutes.post(
  '/items',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const datos = AddToCartSchema.parse(req.body) as AddToCartDTO;

      const carrito = await cartService.agregarAlCarrito(req.usuario.id, datos);

      res.json({
        success: true,
        data: carrito,
        message: 'Producto agregado al carrito',
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /cart/items/:itemId - Actualizar cantidad
cartRoutes.put(
  '/items/:itemId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const { itemId } = ParamsItemSchema.parse(req.params);
      const datos = UpdateCartItemSchema.parse(req.body) as UpdateCartItemDTO;

      const carrito = await cartService.actualizarItem(
        req.usuario.id,
        itemId,
        datos
      );

      res.json({
        success: true,
        data: carrito,
        message: 'Cantidad actualizada',
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /cart/items/:itemId - Eliminar item
cartRoutes.delete(
  '/items/:itemId',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const { itemId } = ParamsItemSchema.parse(req.params);

      const carrito = await cartService.eliminarItem(req.usuario.id, itemId);

      res.json({
        success: true,
        data: carrito,
        message: 'Producto eliminado del carrito',
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /cart - Vaciar carrito
cartRoutes.delete(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const carrito = await cartService.vaciarCarrito(req.usuario.id);

      res.json({
        success: true,
        data: carrito,
        message: 'Carrito vaciado',
      });
    } catch (err) {
      next(err);
    }
  }
);
