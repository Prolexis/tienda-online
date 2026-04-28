// =============================================
// RUTAS DE ÓRDENES
// =============================================

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { EstadoOrden } from '@prisma/client';
import ExcelJS from 'exceljs';

import * as orderService from '../services/order.service';
import { autenticar, requireRole } from '../middleware/auth.middleware';
import type { AuthRequest, CreateOrderDTO } from '../types';
import { prisma } from '../config/prisma';

export const orderRoutes = Router();

orderRoutes.use(autenticar);

// ─── Esquemas de validación ───────────────────────────────────

const CreateOrderSchema = z.object({
  carritoId: z.coerce.number().int().positive(),
  direccionId: z.coerce.number().int().positive().optional(),
  metodoPago: z.enum(['tarjeta', 'transferencia', 'contra_entrega']),
  notasCliente: z.string().max(500).optional(),
  direccionNueva: z
    .object({
      nombre: z.string().min(2),
      apellido: z.string().min(2),
      direccion: z.string().min(5),
      ciudad: z.string().min(2),
      departamento: z.string().min(2),
      codigoPostal: z.string().optional(),
      telefono: z.string().min(7),
    })
    .optional(),
});

const PaginationSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().default(10),
});

const AdminOrderFiltersSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().default(20),
  estado: z.nativeEnum(EstadoOrden).optional(),
  inicio: z.string().optional(),
  fin: z.string().optional(),
  cliente: z.string().optional(),
  numeroOrden: z.string().optional(),
});

const ExportFiltersSchema = z.object({
  estado: z.nativeEnum(EstadoOrden).optional(),
  inicio: z.string().optional(),
  fin: z.string().optional(),
  cliente: z.string().optional(),
  numeroOrden: z.string().optional(),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ChangeStatusSchema = z.object({
  estado: z.nativeEnum(EstadoOrden),
  comentario: z.string().optional(),
});

// POST /orders - Crear orden
orderRoutes.post(
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

      const datos = CreateOrderSchema.parse(req.body) as CreateOrderDTO;

      const orden = await orderService.crearOrden(req.usuario.id, datos);

      res.status(201).json({
        success: true,
        data: orden,
        message: '¡Compra realizada exitosamente!',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /orders - Historial de órdenes del usuario
orderRoutes.get(
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

      const { pagina, porPagina } = PaginationSchema.parse(req.query);

      const resultado = await orderService.listarOrdenesUsuario(
        req.usuario.id,
        pagina,
        porPagina
      );

      res.json({
        success: true,
        ...resultado,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── RUTAS ADMIN ──────────────────────────────────────────────
// Importante: estas rutas deben ir ANTES de /:id

// GET /orders/admin/all - Todas las órdenes con filtros
orderRoutes.get(
  '/admin/all',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        pagina,
        porPagina,
        estado,
        inicio,
        fin,
        cliente,
        numeroOrden,
      } = AdminOrderFiltersSchema.parse(req.query);

      const resultado = await orderService.listarTodasOrdenes({
        pagina,
        porPagina,
        estado,
        inicio,
        fin,
        cliente,
        numeroOrden,
      });

      res.json({
        success: true,
        ...resultado,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /orders/admin/export/excel - Exportar órdenes a Excel
orderRoutes.get(
  '/admin/export/excel',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, inicio, fin, cliente, numeroOrden } =
        ExportFiltersSchema.parse(req.query);

      const where: any = {};

      if (estado) {
        where.estado = estado;
      }

      if (numeroOrden) {
        where.numeroOrden = {
          contains: numeroOrden,
          mode: 'insensitive',
        };
      }

      if (inicio || fin) {
        where.createdAt = {};

        if (inicio) {
          where.createdAt.gte = new Date(inicio);
        }

        if (fin) {
          where.createdAt.lte = new Date(fin);
        }
      }

      if (cliente) {
        where.usuario = {
          OR: [
            {
              nombre: {
                contains: cliente,
                mode: 'insensitive',
              },
            },
            {
              apellido: {
                contains: cliente,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: cliente,
                mode: 'insensitive',
              },
            },
          ],
        };
      }

      const ordenes = await prisma.orden.findMany({
        where,
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true,
              email: true,
            },
          },
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ordenes');

      worksheet.columns = [
        { header: 'N° Orden', key: 'numeroOrden', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Método Pago', key: 'metodoPago', width: 18 },
        { header: 'Subtotal', key: 'subtotal', width: 12 },
        { header: 'IGV', key: 'impuesto', width: 12 },
        { header: 'Total', key: 'total', width: 12 },
      ];

      ordenes.forEach((o) => {
        worksheet.addRow({
          numeroOrden: o.numeroOrden,
          fecha: new Date(o.createdAt).toLocaleDateString('es-PE'),
          cliente: `${o.usuario.nombre} ${o.usuario.apellido}`,
          email: o.usuario.email,
          estado: o.estado,
          metodoPago: o.metodoPago,
          subtotal: Number(o.subtotal),
          impuesto: Number(o.impuesto),
          total: Number(o.total),
        });
      });

      worksheet.getRow(1).font = {
        bold: true,
      };

      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFE0E0E0',
        },
      };

      worksheet.getColumn('subtotal').numFmt = '"S/." #,##0.00';
      worksheet.getColumn('impuesto').numFmt = '"S/." #,##0.00';
      worksheet.getColumn('total').numFmt = '"S/." #,##0.00';

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte-ordenes.xlsx"'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /orders/:id/status - Cambiar estado
orderRoutes.patch(
  '/:id/status',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParamSchema.parse(req.params);
      const { estado, comentario } = ChangeStatusSchema.parse(req.body);

      const orden = await orderService.cambiarEstadoOrden(
        id,
        estado,
        comentario
      );

      res.json({
        success: true,
        data: orden,
        message: 'Estado actualizado',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /orders/:id - Detalle de orden
// Esta ruta debe ir al final para no bloquear /admin/all ni /admin/export/excel
orderRoutes.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const { id } = IdParamSchema.parse(req.params);

      const orden = await orderService.obtenerOrden(id);

      const esAdmin = req.usuario.roles.some((r) =>
        ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r)
      );

      if (!esAdmin && orden.usuarioId !== req.usuario.id) {
        res.status(403).json({
          success: false,
          message: 'Sin acceso a esta orden',
        });
        return;
      }

      res.json({
        success: true,
        data: orden,
      });
    } catch (err) {
      next(err);
    }
  }
);
