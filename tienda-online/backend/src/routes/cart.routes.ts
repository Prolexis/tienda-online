// =============================================
// RUTAS DEL CARRITO DE COMPRAS
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as cartService from '../services/cart.service';
import { autenticar } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

export const cartRoutes = Router();

// Todas las rutas del carrito requieren autenticación
cartRoutes.use(autenticar);

// GET /cart - Ver carrito actual
cartRoutes.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const carrito = await cartService.obtenerOCrearCarrito(req.usuario!.id);
    res.json({ success: true, data: carrito });
  } catch (err) { next(err); }
});

// POST /cart/items - Agregar producto
cartRoutes.post('/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const datos = z.object({
      productoId: z.number().int().positive(),
      cantidad:   z.number().int().positive().max(99),
    }).parse(req.body);

    const carrito = await cartService.agregarAlCarrito(req.usuario!.id, datos);
    res.json({ success: true, data: carrito, message: 'Producto agregado al carrito' });
  } catch (err) { next(err); }
});

// PUT /cart/items/:itemId - Actualizar cantidad
cartRoutes.put('/items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { itemId } = z.object({ itemId: z.coerce.number() }).parse(req.params);
    const { cantidad } = z.object({ cantidad: z.number().int().min(0) }).parse(req.body);

    const carrito = await cartService.actualizarItem(req.usuario!.id, itemId, { cantidad });
    res.json({ success: true, data: carrito, message: 'Cantidad actualizada' });
  } catch (err) { next(err); }
});

// DELETE /cart/items/:itemId - Eliminar item
cartRoutes.delete('/items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { itemId } = z.object({ itemId: z.coerce.number() }).parse(req.params);
    const carrito = await cartService.eliminarItem(req.usuario!.id, itemId);
    res.json({ success: true, data: carrito, message: 'Producto eliminado del carrito' });
  } catch (err) { next(err); }
});

// DELETE /cart - Vaciar carrito
cartRoutes.delete('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const carrito = await cartService.vaciarCarrito(req.usuario!.id);
    res.json({ success: true, data: carrito, message: 'Carrito vaciado' });
  } catch (err) { next(err); }
});
