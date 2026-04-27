// =============================================
// RUTAS DE ÓRDENES
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EstadoOrden } from '@prisma/client';
import * as orderService from '../services/order.service';
import { autenticar, requireRole } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma';

export const orderRoutes = Router();
orderRoutes.use(autenticar);

// POST /orders - Crear orden (checkout)
orderRoutes.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const datos = z.object({
      carritoId:   z.number().int().positive(),
      direccionId: z.number().int().positive().optional(),
      metodoPago:  z.enum(['tarjeta', 'transferencia', 'contra_entrega']),
      notasCliente: z.string().max(500).optional(),
      direccionNueva: z.object({
        nombre:       z.string().min(2),
        apellido:     z.string().min(2),
        direccion:    z.string().min(5),
        ciudad:       z.string().min(2),
        departamento: z.string().min(2),
        codigoPostal: z.string().optional(),
        telefono:     z.string().min(7),
      }).optional(),
    }).parse(req.body);

    const orden = await orderService.crearOrden(req.usuario!.id, datos);
    res.status(201).json({ success: true, data: orden, message: '¡Compra realizada exitosamente!' });
  } catch (err) { next(err); }
});

// GET /orders - Historial de órdenes del usuario
orderRoutes.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pagina, porPagina } = z.object({
      pagina:    z.coerce.number().default(1),
      porPagina: z.coerce.number().default(10),
    }).parse(req.query);

    const resultado = await orderService.listarOrdenesUsuario(req.usuario!.id, pagina, porPagina);
    res.json({ success: true, ...resultado });
  } catch (err) { next(err); }
});

// GET /orders/:id - Detalle de orden
orderRoutes.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const orden = await orderService.obtenerOrden(id);

    // Verificar que la orden pertenece al usuario (a menos que sea admin)
    const esAdmin = req.usuario!.roles.some((r) => ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r));
    if (!esAdmin && orden.usuarioId !== req.usuario!.id) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta orden' });
    }

    res.json({ success: true, data: orden });
  } catch (err) { next(err); }
});

// ─── Rutas Admin ─────────────────────────────────────────────

// GET /orders/admin/all - Todas las órdenes con filtros avanzados
orderRoutes.get('/admin/all',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req, res, next) => {
    try {
      const { pagina, porPagina, estado, inicio, fin, cliente, numeroOrden } = z.object({
        pagina:      z.coerce.number().default(1),
        porPagina:   z.coerce.number().default(20),
        estado:      z.nativeEnum(EstadoOrden).optional(),
        inicio:      z.string().optional(),
        fin:         z.string().optional(),
        cliente:     z.string().optional(),
        numeroOrden: z.string().optional(),
      }).parse(req.query);

      const resultado = await orderService.listarTodasOrdenes({
        pagina, 
        porPagina, 
        estado, 
        inicio, 
        fin, 
        cliente, 
        numeroOrden
      });
      res.json({ success: true, ...resultado });
    } catch (err) { next(err); }
  }
);

// PATCH /orders/:id/status - Cambiar estado
orderRoutes.patch('/:id/status',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req, res, next) => {
    try {
      const { id }    = z.object({ id: z.coerce.number() }).parse(req.params);
      const { estado, comentario } = z.object({
        estado:     z.nativeEnum(EstadoOrden),
        comentario: z.string().optional(),
      }).parse(req.body);

      const orden = await orderService.cambiarEstadoOrden(id, estado, comentario);
      res.json({ success: true, data: orden, message: 'Estado actualizado' });
    } catch (err) { next(err); }
  }
);

// GET /orders/admin/export/excel - Exportar órdenes a Excel
orderRoutes.get('/admin/export/excel',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req, res, next) => {
    try {
      const { estado, inicio, fin, cliente, numeroOrden } = z.object({
        estado:      z.nativeEnum(EstadoOrden).optional(),
        inicio:      z.string().optional(),
        fin:         z.string().optional(),
        cliente:     z.string().optional(),
        numeroOrden: z.string().optional(),
      }).parse(req.query);

      const where: any = {};
      if (estado) where.estado = estado;
      if (numeroOrden) where.numeroOrden = { contains: numeroOrden };
      if (inicio || fin) {
        where.createdAt = {};
        if (inicio) where.createdAt.gte = new Date(inicio);
        if (fin)    where.createdAt.lte = new Date(fin);
      }
      if (cliente) {
        where.usuario = {
          OR: [
            { nombre:   { contains: cliente } },
            { apellido: { contains: cliente } },
            { email:    { contains: cliente } },
          ],
        };
      }

      const ordenes = await prisma.orden.findMany({
        where,
        include: {
          usuario: { select: { nombre: true, apellido: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ordenes');

      worksheet.columns = [
        { header: 'N° Orden', key: 'numeroOrden', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Metodo Pago', key: 'metodoPago', width: 15 },
        { header: 'Subtotal', key: 'subtotal', width: 12 },
        { header: 'IGV', key: 'impuesto', width: 12 },
        { header: 'Total', key: 'total', width: 12 },
      ];

      ordenes.forEach(o => {
        worksheet.addRow({
          numeroOrden: o.numeroOrden,
          fecha:       new Date(o.createdAt).toLocaleDateString('es-PE'),
          cliente:     `${o.usuario.nombre} ${o.usuario.apellido}`,
          email:       o.usuario.email,
          estado:      o.estado,
          metodoPago:  o.metodoPago,
          subtotal:    Number(o.subtotal),
          impuesto:    Number(o.impuesto),
          total:       Number(o.total),
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte-ordenes.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) { next(err); }
  }
);
