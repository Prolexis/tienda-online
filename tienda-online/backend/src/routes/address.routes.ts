// =============================================
// RUTAS DE DIRECCIONES
// =============================================

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

export const addressRoutes = Router();
addressRoutes.use(autenticar);

const AddressSchema = z.object({
  alias:        z.string().min(1).max(50),
  nombre:       z.string().min(1).max(100),
  apellido:     z.string().min(1).max(100),
  direccion:    z.string().min(5).max(255),
  ciudad:       z.string().min(1).max(100),
  departamento: z.string().min(1).max(100),
  codigoPostal: z.string().optional(),
  telefono:     z.string().min(7).max(20),
  esPrincipal:  z.boolean().default(false),
});

// GET /address - Listar direcciones del usuario
addressRoutes.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.usuario!.id },
      include: { direcciones: { where: { activo: true }, orderBy: { esPrincipal: 'desc' } } }
    });
    res.json({ success: true, data: cliente?.direcciones || [] });
  } catch (err) { next(err); }
});

// POST /address - Crear dirección
addressRoutes.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const datos = AddressSchema.parse(req.body);
    const cliente = await prisma.cliente.findUnique({ where: { usuarioId: req.usuario!.id } });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    if (datos.esPrincipal) {
      await prisma.direccion.updateMany({
        where: { clienteId: cliente.id },
        data: { esPrincipal: false }
      });
    }

    const direccion = await prisma.direccion.create({
      data: { ...datos, clienteId: cliente.id }
    });
    res.status(201).json({ success: true, data: direccion });
  } catch (err) { next(err); }
});

// PUT /address/:id - Editar dirección
addressRoutes.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const datos = AddressSchema.partial().parse(req.body);
    
    const direccionExistente = await prisma.direccion.findFirst({
      where: { id, cliente: { usuarioId: req.usuario!.id } }
    });
    if (!direccionExistente) throw new AppError('Dirección no encontrada', 404);

    if (datos.esPrincipal) {
      await prisma.direccion.updateMany({
        where: { clienteId: direccionExistente.clienteId },
        data: { esPrincipal: false }
      });
    }

    const direccion = await prisma.direccion.update({
      where: { id },
      data: datos
    });
    res.json({ success: true, data: direccion });
  } catch (err) { next(err); }
});

// DELETE /address/:id - "Eliminar" dirección (soft delete)
addressRoutes.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const direccionExistente = await prisma.direccion.findFirst({
      where: { id, cliente: { usuarioId: req.usuario!.id } }
    });
    if (!direccionExistente) throw new AppError('Dirección no encontrada', 404);

    await prisma.direccion.update({
      where: { id },
      data: { activo: false, esPrincipal: false }
    });
    res.json({ success: true, message: 'Dirección eliminada' });
  } catch (err) { next(err); }
});

// PATCH /address/:id/default - Establecer como predeterminada
addressRoutes.patch('/:id/default', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
    const direccionExistente = await prisma.direccion.findFirst({
      where: { id, cliente: { usuarioId: req.usuario!.id } }
    });
    if (!direccionExistente) throw new AppError('Dirección no encontrada', 404);

    await prisma.$transaction([
      prisma.direccion.updateMany({
        where: { clienteId: direccionExistente.clienteId },
        data: { esPrincipal: false }
      }),
      prisma.direccion.update({
        where: { id },
        data: { esPrincipal: true }
      })
    ]);

    res.json({ success: true, message: 'Dirección predeterminada actualizada' });
  } catch (err) { next(err); }
});
