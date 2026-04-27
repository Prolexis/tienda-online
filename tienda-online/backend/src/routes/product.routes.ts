// =============================================
// RUTAS DE PRODUCTOS
// =============================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as productService from '../services/product.service';
import { autenticar, requireRole } from '../middleware/auth.middleware';

export const productRoutes = Router();

// ─── Rutas públicas ───────────────────────────────────────────

// GET /products - Listar productos
productRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({
      pagina:      z.coerce.number().default(1),
      porPagina:   z.coerce.number().default(12),
      busqueda:    z.string().optional(),
      categoriaId: z.coerce.number().optional(),
      destacados:  z.coerce.boolean().optional(),
      precioMin:   z.coerce.number().optional(),
      precioMax:   z.coerce.number().optional(),
    }).parse(req.query);

    const resultado = await productService.listarProductos(query);
    res.json({ success: true, ...resultado });
  } catch (err) { next(err); }
});

// GET /products/categories - Listar categorías
productRoutes.get('/categories', async (_req, res, next) => {
  try {
    const categorias = await productService.listarCategorias();
    res.json({ success: true, data: categorias });
  } catch (err) { next(err); }
});

// GET /products/brands - Listar marcas
productRoutes.get('/brands', async (_req, res, next) => {
  try {
    const marcas = await productService.listarMarcas();
    res.json({ success: true, data: marcas });
  } catch (err) { next(err); }
});

// GET /products/:id - Detalle de producto
productRoutes.get('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const producto = await productService.obtenerProducto(id);
    res.json({ success: true, data: producto });
  } catch (err) { next(err); }
});

// ─── Rutas protegidas (solo ADMIN / GERENTE_INVENTARIO) ──────

const CreateProductoSchema = z.object({
  categoriaId:  z.number(),
  marcaId:      z.number().optional(),
  sku:          z.string().min(1),
  nombre:       z.string().min(1),
  descripcion:  z.string().optional(),
  imagen:       z.string().optional(),
  imagenes:     z.array(z.object({
    url: z.string(),
    esPrincipal: z.boolean().optional(),
    orden: z.number().int().optional(),
  })).optional(),
  precioVenta:  z.number().positive(),
  precioOferta: z.number().positive().optional(),
  precioCompra: z.number().positive().optional(),
  stock:         z.number().int().min(0).default(0),
  stockMinimo:   z.number().int().min(0).default(5),
  destacado:     z.boolean().default(false),
});

// POST /products - Crear producto
productRoutes.post('/',
  autenticar, requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res, next) => {
    try {
      const datos = CreateProductoSchema.parse(req.body);
      const producto = await productService.crearProducto(datos);
      res.status(201).json({ success: true, data: producto, message: 'Producto creado exitosamente' });
    } catch (err) { next(err); }
  }
);

// PUT /products/:id - Actualizar producto
productRoutes.put('/:id',
  autenticar, requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res, next) => {
    try {
      const { id }  = z.object({ id: z.coerce.number() }).parse(req.params);
      const datos   = CreateProductoSchema.partial().parse(req.body);
      const producto = await productService.actualizarProducto(id, datos);
      res.json({ success: true, data: producto, message: 'Producto actualizado' });
    } catch (err) { next(err); }
  }
);

// DELETE /products/:id - Eliminar producto
productRoutes.delete('/:id',
  autenticar, requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
      await productService.eliminarProducto(id);
      res.json({ success: true, message: 'Producto eliminado' });
    } catch (err) { next(err); }
  }
);
