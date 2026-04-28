// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '../config/prisma';
import { autenticar, requireRole } from '../middleware/auth.middleware';
import type { AuthRequest } from '../types';
import * as paymentVerificationService from '../services/payment-verification.service';
import { upload, processImage } from '../middleware/upload.middleware';

export const adminRoutes = Router();

// Middleware global — todos los roles admin pasan el portero
adminRoutes.use(
  autenticar,
  requireRole('ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR')
);

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// GET — Dashboard Stats
adminRoutes.get(
  '/dashboard',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hoy = new Date();
      const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

      const [
        ventasMesActual,
        ventasMesAnterior,
        ordenesMesActual,
        ordenesHoy,
        bajoStock,
        agotados,
        clientesNuevos,
      ] = await Promise.all([
        prisma.orden.aggregate({
          _sum: { total: true },
          where: {
            estado: 'PAGADA',
            createdAt: { gte: inicioMesActual },
          },
        }),
        prisma.orden.aggregate({
          _sum: { total: true },
          where: {
            estado: 'PAGADA',
            createdAt: {
              gte: inicioMesAnterior,
              lte: finMesAnterior,
            },
          },
        }),
        prisma.orden.count({
          where: {
            createdAt: { gte: inicioMesActual },
          },
        }),
        prisma.orden.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.producto.count({
          where: {
            stock: {
              gt: 0,
              lte: 5,
            },
          },
        }),
        prisma.producto.count({
          where: {
            stock: 0,
          },
        }),
        prisma.cliente.count({
          where: {
            createdAt: { gte: inicioMesActual },
          },
        }),
      ]);

      const totalMesActual = Number(ventasMesActual._sum.total || 0);
      const totalMesAnterior = Number(ventasMesAnterior._sum.total || 0);

      const variacion =
        totalMesAnterior === 0
          ? 100
          : ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100;

      const [
        ordenesPorEstado,
        topProductos,
        ventasPorCategoriaRaw,
        ventasDiarias,
      ] = await Promise.all([
        prisma.orden.groupBy({
          by: ['estado'],
          _count: {
            id: true,
          },
        }),
        prisma.itemOrden.groupBy({
          by: ['nombreProducto'],
          _sum: {
            cantidad: true,
            subtotal: true,
          },
          orderBy: {
            _sum: {
              cantidad: 'desc',
            },
          },
          take: 5,
        }),
        prisma.categoria.findMany({
          select: {
            nombre: true,
            productos: {
              select: {
                itemsOrden: {
                  select: {
                    subtotal: true,
                  },
                },
              },
            },
          },
        }),
        prisma.$queryRaw<{ fecha: Date; total: number; cantidad: number }[]>`
          SELECT 
            DATE_TRUNC('day', created_at) as fecha,
            SUM(total)::FLOAT as total,
            COUNT(id)::INT as cantidad
          FROM ord_ordenes
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY 1
          ORDER BY 1 ASC
        `,
      ]);

      const ventasPorCategoria = ventasPorCategoriaRaw
        .map((c) => ({
          nombre: c.nombre,
          total: c.productos.reduce(
            (acc, p) =>
              acc +
              p.itemsOrden.reduce(
                (sum, item) => sum + Number(item.subtotal),
                0
              ),
            0
          ),
        }))
        .filter((c) => c.total > 0);

      res.json({
        success: true,
        data: {
          kpis: {
            ventasMes: totalMesActual.toFixed(2),
            ordenesMes: ordenesMesActual,
            ticketPromedio:
              ordenesMesActual === 0
                ? '0.00'
                : (totalMesActual / ordenesMesActual).toFixed(2),
            variacionVentas: variacion.toFixed(1),
            ordenesHoy,
            productosBajoStock: bajoStock,
            productosAgotados: agotados,
            clientesNuevosMes: clientesNuevos,
          },
          graficos: {
            ordenesPorEstado,
            topProductos,
            ventasPorCategoria,
            ventasDiarias,
          },
        },
      });
    } catch (err) {
      console.error('Error en dashboard:', err);
      next(err);
    }
  }
);

// GET — Listar productos para admin
adminRoutes.get(
  '/products',
  requireRole('ADMIN', 'GERENTE_INVENTARIO', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pagina, porPagina, busqueda } = z
        .object({
          pagina: z.coerce.number().default(1),
          porPagina: z.coerce.number().default(15),
          busqueda: z.string().optional(),
        })
        .parse(req.query);

      const skip = (pagina - 1) * porPagina;

      const where = busqueda
        ? {
            OR: [
              {
                nombre: {
                  contains: busqueda,
                  mode: 'insensitive' as const,
                },
              },
              {
                sku: {
                  contains: busqueda,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {};

      const [products, total] = await Promise.all([
        prisma.producto.findMany({
          where,
          include: {
            categoria: true,
            marca: true,
            imagenes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: porPagina,
        }),
        prisma.producto.count({
          where,
        }),
      ]);

      res.json({
        success: true,
        data: products,
        meta: {
          total,
          pagina,
          porPagina,
          totalPaginas: Math.ceil(total / porPagina),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Listar todas las categorías
adminRoutes.get(
  '/categories',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await prisma.categoria.findMany({
        include: {
          _count: {
            select: {
              productos: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Crear categoría
adminRoutes.post(
  '/categories',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, descripcion } = z
        .object({
          nombre: z.string().min(1),
          descripcion: z.string().optional(),
        })
        .parse(req.body);

      const category = await prisma.categoria.create({
        data: {
          nombre,
          descripcion,
          slug: slugify(nombre),
        },
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT — Actualizar categoría
adminRoutes.put(
  '/categories/:id',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      const { nombre, descripcion, activo } = z
        .object({
          nombre: z.string().optional(),
          descripcion: z.string().optional(),
          activo: z.boolean().optional(),
        })
        .parse(req.body);

      const category = await prisma.categoria.update({
        where: {
          id,
        },
        data: {
          nombre,
          descripcion,
          activo,
          slug: nombre ? slugify(nombre) : undefined,
        },
      });

      res.json({
        success: true,
        data: category,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE — Desactivar categoría
adminRoutes.delete(
  '/categories/:id',
  requireRole('ADMIN'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      await prisma.categoria.update({
        where: {
          id,
        },
        data: {
          activo: false,
        },
      });

      res.json({
        success: true,
        message: 'Categoría desactivada',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Listar marcas
adminRoutes.get(
  '/brands',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brands = await prisma.marca.findMany({
        include: {
          categorias: {
            select: {
              id: true,
              nombre: true,
            },
          },
          _count: {
            select: {
              productos: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      res.json({
        success: true,
        data: brands,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Crear marca
adminRoutes.post(
  '/brands',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, descripcion, imagen, categoriaIds } = z
        .object({
          nombre: z.string().min(1),
          descripcion: z.string().optional(),
          imagen: z.string().optional(),
          categoriaIds: z.array(z.number()).optional(),
        })
        .parse(req.body);

      const brand = await prisma.marca.create({
        data: {
          nombre,
          descripcion,
          imagen,
          slug: slugify(nombre),
          categorias: categoriaIds
            ? {
                connect: categoriaIds.map((id) => ({
                  id,
                })),
              }
            : undefined,
        },
      });

      res.status(201).json({
        success: true,
        data: brand,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT — Actualizar marca
adminRoutes.put(
  '/brands/:id',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      const { nombre, descripcion, imagen, activo, categoriaIds } = z
        .object({
          nombre: z.string().optional(),
          descripcion: z.string().optional(),
          imagen: z.string().optional(),
          activo: z.boolean().optional(),
          categoriaIds: z.array(z.number()).optional(),
        })
        .parse(req.body);

      const brand = await prisma.marca.update({
        where: {
          id,
        },
        data: {
          nombre,
          descripcion,
          imagen,
          activo,
          slug: nombre ? slugify(nombre) : undefined,
          categorias: categoriaIds
            ? {
                set: categoriaIds.map((catId) => ({
                  id: catId,
                })),
              }
            : undefined,
        },
      });

      res.json({
        success: true,
        data: brand,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE — Desactivar marca
adminRoutes.delete(
  '/brands/:id',
  requireRole('ADMIN'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      await prisma.marca.update({
        where: {
          id,
        },
        data: {
          activo: false,
        },
      });

      res.json({
        success: true,
        message: 'Marca desactivada',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Listar usuarios
adminRoutes.get(
  '/users',
  requireRole('ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pagina, porPagina, busqueda } = z
        .object({
          pagina: z.coerce.number().default(1),
          porPagina: z.coerce.number().default(15),
          busqueda: z.string().optional(),
        })
        .parse(req.query);

      const skip = (pagina - 1) * porPagina;

      const where = busqueda
        ? {
            OR: [
              {
                nombre: {
                  contains: busqueda,
                  mode: 'insensitive' as const,
                },
              },
              {
                apellido: {
                  contains: busqueda,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: busqueda,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.usuario.findMany({
          where,
          include: {
            roles: {
              include: {
                rol: true,
              },
            },
            cliente: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: porPagina,
        }),
        prisma.usuario.count({
          where,
        }),
      ]);

      res.json({
        success: true,
        data: users,
        meta: {
          total,
          pagina,
          porPagina,
          totalPaginas: Math.ceil(total / porPagina),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Listar roles
adminRoutes.get(
  '/roles',
  requireRole('ADMIN'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await prisma.rol.findMany({
        where: {
          activo: true,
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      res.json({
        success: true,
        data: roles,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT — Actualizar roles de usuario
adminRoutes.put(
  '/users/:id/roles',
  requireRole('ADMIN'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = z.coerce.number().int().positive().parse(req.params.id);

      const { rolId } = z
        .object({
          rolId: z.coerce.number().int().positive(),
        })
        .parse(req.body);

      await prisma.$transaction([
        prisma.usuarioRol.deleteMany({
          where: {
            usuarioId: userId,
          },
        }),
        prisma.usuarioRol.create({
          data: {
            usuarioId: userId,
            rolId,
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Roles actualizados',
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT — Activar/Desactivar usuario
adminRoutes.put(
  '/users/:id/toggle',
  requireRole('ADMIN'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      const user = await prisma.usuario.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      const actualizado = await prisma.usuario.update({
        where: {
          id,
        },
        data: {
          activo: !user.activo,
        },
      });

      res.json({
        success: true,
        data: actualizado,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Upload imagen de producto
adminRoutes.post(
  '/products/upload',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  upload.single('imagen'),
  processImage,
  async (req, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo',
      });
      return;
    }

    const url = `/uploads/products/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url,
      },
    });
  }
);

// POST — Upload logo de marca
adminRoutes.post(
  '/brands/upload',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  upload.single('logo'),
  processImage,
  async (req, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo',
      });
      return;
    }

    const url = `/uploads/brands/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url,
      },
    });
  }
);

// POST — Reabastecer stock
adminRoutes.post(
  '/inventory/restock',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productoId, cantidad, motivo } = z
        .object({
          productoId: z.coerce.number().int().positive(),
          cantidad: z.coerce.number().int().positive(),
          motivo: z.string().default('Reabastecimiento manual'),
        })
        .parse(req.body);

      const producto = await prisma.producto.findUnique({
        where: {
          id: productoId,
        },
      });

      if (!producto) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      const nuevoStock = producto.stock + cantidad;

      const resultado = await prisma.$transaction(async (tx) => {
        const actualizado = await tx.producto.update({
          where: {
            id: productoId,
          },
          data: {
            stock: nuevoStock,
          },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId,
            tipo: 'entrada',
            cantidad,
            stockAntes: producto.stock,
            stockDespues: nuevoStock,
            motivo,
            usuarioId: req.usuario?.id,
          },
        });

        return actualizado;
      });

      res.json({
        success: true,
        data: resultado,
        message: 'Stock reabastecido',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Dashboard de verificaciones
adminRoutes.get(
  '/payments/verifications',
  requireRole('ADMIN', 'DUEÑO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado } = req.query;
      const where = estado ? { estado: estado as any } : {};

      const verifs = await prisma.verificacionPago.findMany({
        where,
        include: {
          pago: {
            include: {
              orden: true,
            },
          },
          marcadoPor: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
          verificadoPor: {
            select: {
              nombre: true,
              apellido: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: verifs,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Admin marca pago como recibido
adminRoutes.post(
  '/payments/:id/receive',
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagoId = z.coerce.number().int().positive().parse(req.params.id);
      const { notas } = req.body;

      const result = await paymentVerificationService.marcarPagoRecibido({
        pagoId,
        adminId: req.usuario!.id,
        notas,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
        message: 'Pago marcado como recibido. Notificación enviada al dueño.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Dueño confirma verificación final
adminRoutes.post(
  '/payments/verifications/:id/confirm',
  requireRole('DUEÑO', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const verificacionId = z.coerce
        .number()
        .int()
        .positive()
        .parse(req.params.id);

      const { token2FA } = req.body;

      const result = await paymentVerificationService.confirmarVerificacion({
        verificacionId,
        duenoId: req.usuario!.id,
        token2FA,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
        message: 'Pago verificado y confirmado exitosamente.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Dueño reversa verificación
adminRoutes.post(
  '/payments/verifications/:id/reverse',
  requireRole('DUEÑO'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const verificacionId = z.coerce
        .number()
        .int()
        .positive()
        .parse(req.params.id);

      const { motivo } = z
        .object({
          motivo: z.string().min(10),
        })
        .parse(req.body);

      const result = await paymentVerificationService.reversarVerificacion({
        verificacionId,
        duenoId: req.usuario!.id,
        motivo,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
        message: 'Verificación reversada correctamente.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Auditoría inmutable
adminRoutes.get(
  '/audit/immutable',
  requireRole('DUEÑO'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await prisma.auditoriaInmutable.findMany({
        include: {
          usuario: {
            select: {
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Cupones ──────────────────────────────────────────────────

const CuponCreateSchema = z.object({
  codigo: z.string().min(3).max(50),
  descripcion: z.string().optional(),
  tipo: z.enum(['porcentaje', 'monto_fijo']),
  valor: z.coerce.number().positive(),
  minimo: z.coerce.number().min(0).default(0),
  usosMaximos: z.coerce.number().int().positive().default(100),
  fechaInicio: z.string(),
  fechaFin: z.string(),
});

type CuponCreateDTO = {
  codigo: string;
  descripcion?: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  minimo: number;
  usosMaximos: number;
  fechaInicio: string;
  fechaFin: string;
};

const CuponUpdateSchema = z.object({
  descripcion: z.string().optional(),
  tipo: z.enum(['porcentaje', 'monto_fijo']),
  valor: z.coerce.number().positive(),
  minimo: z.coerce.number().min(0).default(0),
  usosMaximos: z.coerce.number().int().positive(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  activo: z.boolean(),
});

type CuponUpdateDTO = {
  descripcion?: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  minimo: number;
  usosMaximos: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
};

// GET — Listar cupones
adminRoutes.get(
  '/cupones',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cupones = await prisma.cupon.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: cupones,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Crear cupón
adminRoutes.post(
  '/cupones',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const datos = CuponCreateSchema.parse(req.body) as CuponCreateDTO;

      const cupon = await prisma.cupon.create({
        data: {
          codigo: datos.codigo.toUpperCase(),
          descripcion: datos.descripcion,
          tipo: datos.tipo,
          valor: datos.valor,
          minimo: datos.minimo,
          usosMaximos: datos.usosMaximos,
          fechaInicio: new Date(datos.fechaInicio),
          fechaFin: new Date(datos.fechaFin),
        },
      });

      res.status(201).json({
        success: true,
        data: cupon,
        message: 'Cupón creado',
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT — Actualizar cupón
adminRoutes.put(
  '/cupones/:id',
  requireRole('ADMIN', 'GERENTE_VENTAS'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const datos = CuponUpdateSchema.parse(req.body) as CuponUpdateDTO;

      const cupon = await prisma.cupon.update({
        where: {
          id,
        },
        data: {
          descripcion: datos.descripcion,
          tipo: datos.tipo,
          valor: datos.valor,
          minimo: datos.minimo,
          usosMaximos: datos.usosMaximos,
          fechaInicio: new Date(datos.fechaInicio),
          fechaFin: new Date(datos.fechaFin),
          activo: datos.activo,
        },
      });

      res.json({
        success: true,
        data: cupon,
        message: 'Cupón actualizado',
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE — Desactivar cupón
adminRoutes.delete(
  '/cupones/:id',
  requireRole('ADMIN'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);

      await prisma.cupon.update({
        where: {
          id,
        },
        data: {
          activo: false,
        },
      });

      res.json({
        success: true,
        message: 'Cupón desactivado',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Validar cupón
adminRoutes.post(
  '/cupones/validar',
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { codigo, subtotal } = z
        .object({
          codigo: z.string(),
          subtotal: z.coerce.number().positive(),
        })
        .parse(req.body);

      const cupon = await prisma.cupon.findUnique({
        where: {
          codigo: codigo.toUpperCase(),
        },
      });

      if (!cupon) {
        res.status(404).json({
          success: false,
          message: 'Cupón no encontrado',
        });
        return;
      }

      if (!cupon.activo) {
        res.status(400).json({
          success: false,
          message: 'Cupón inactivo',
        });
        return;
      }

      if (new Date() < cupon.fechaInicio) {
        res.status(400).json({
          success: false,
          message: 'Cupón aún no vigente',
        });
        return;
      }

      if (new Date() > cupon.fechaFin) {
        res.status(400).json({
          success: false,
          message: 'Cupón expirado',
        });
        return;
      }

      if (cupon.usos >= cupon.usosMaximos) {
        res.status(400).json({
          success: false,
          message: 'Cupón agotado',
        });
        return;
      }

      if (subtotal < Number(cupon.minimo)) {
        res.status(400).json({
          success: false,
          message: `Monto mínimo requerido: S/. ${Number(cupon.minimo).toFixed(
            2
          )}`,
        });
        return;
      }

      const descuento =
        cupon.tipo === 'porcentaje'
          ? subtotal * (Number(cupon.valor) / 100)
          : Number(cupon.valor);

      res.json({
        success: true,
        data: {
          cuponId: cupon.id,
          codigo: cupon.codigo,
          tipo: cupon.tipo,
          valor: Number(cupon.valor),
          descuento: Number(descuento.toFixed(2)),
          descripcion: cupon.descripcion,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Inventario ───────────────────────────────────────────────

// GET — Movimientos de inventario
adminRoutes.get(
  '/inventory/movements',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pagina, porPagina, productoId } = z
        .object({
          pagina: z.coerce.number().default(1),
          porPagina: z.coerce.number().default(20),
          productoId: z.coerce.number().optional(),
        })
        .parse(req.query);

      const skip = (pagina - 1) * porPagina;

      const where = productoId
        ? {
            productoId,
          }
        : {};

      const [movimientos, total] = await Promise.all([
        prisma.movimientoInventario.findMany({
          where,
          skip,
          take: porPagina,
          include: {
            producto: {
              select: {
                nombre: true,
                sku: true,
              },
            },
            usuario: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.movimientoInventario.count({
          where,
        }),
      ]);

      res.json({
        success: true,
        data: movimientos,
        meta: {
          total,
          pagina,
          porPagina,
          totalPaginas: Math.ceil(total / porPagina),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST — Crear movimiento de inventario
adminRoutes.post(
  '/inventory/movements',
  requireRole('ADMIN', 'GERENTE_INVENTARIO'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const datos = z
        .object({
          productoId: z.coerce.number().int().positive(),
          tipo: z.enum(['entrada', 'salida', 'ajuste']),
          cantidad: z.coerce.number().int().positive(),
          motivo: z.string().min(3).max(200),
        })
        .parse(req.body);

      const producto = await prisma.producto.findUnique({
        where: {
          id: datos.productoId,
        },
      });

      if (!producto) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      let nuevoStock = producto.stock;

      if (datos.tipo === 'entrada') {
        nuevoStock += datos.cantidad;
      } else if (datos.tipo === 'salida') {
        nuevoStock -= datos.cantidad;
      } else {
        nuevoStock = datos.cantidad;
      }

      if (nuevoStock < 0) {
        res.status(400).json({
          success: false,
          message: `Stock insuficiente. Stock actual: ${producto.stock}`,
        });
        return;
      }

      const movimiento = await prisma.$transaction(async (tx) => {
        const mov = await tx.movimientoInventario.create({
          data: {
            productoId: datos.productoId,
            tipo: datos.tipo,
            cantidad: datos.cantidad,
            stockAntes: producto.stock,
            stockDespues: nuevoStock,
            motivo: datos.motivo,
            usuarioId: req.usuario?.id,
          },
        });

        await tx.producto.update({
          where: {
            id: datos.productoId,
          },
          data: {
            stock: nuevoStock,
          },
        });

        return mov;
      });

      res.status(201).json({
        success: true,
        data: movimiento,
        message: 'Movimiento registrado',
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET — Stock de inventario
adminRoutes.get(
  '/inventory/stock',
  requireRole('ADMIN', 'GERENTE_INVENTARIO', 'VENDEDOR'),
  async (_req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productos = await prisma.producto.findMany({
        where: {
          activo: true,
        },
        select: {
          id: true,
          sku: true,
          nombre: true,
          stock: true,
          stockMinimo: true,
          categoria: {
            select: {
              nombre: true,
            },
          },
          marca: {
            select: {
              nombre: true,
            },
          },
        },
        orderBy: {
          stock: 'asc',
        },
      });

      const resumen = {
        totalProductos: productos.length,
        sinStock: productos.filter((p) => p.stock === 0).length,
        bajoStock: productos.filter(
          (p) => p.stock > 0 && p.stock <= p.stockMinimo
        ).length,
        stockNormal: productos.filter((p) => p.stock > p.stockMinimo).length,
      };

      res.json({
        success: true,
        data: productos,
        resumen,
      });
    } catch (err) {
      next(err);
    }
  }
);
