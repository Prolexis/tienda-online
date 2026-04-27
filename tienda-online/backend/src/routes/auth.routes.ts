// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { autenticar } from '../middleware/auth.middleware';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { z } from 'zod';

export const authRoutes = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:    { type: string }
 *               apellido:  { type: string }
 *               email:     { type: string, format: email }
 *               password:  { type: string, minLength: 8 }
 *     responses:
 *       201: { description: Registro exitoso }
 *       409: { description: Email ya registrado }
 */
authRoutes.post('/register',      authController.register);
authRoutes.post('/login',         authController.login);
authRoutes.post('/refresh-token', authController.refreshToken);
authRoutes.post('/logout',        autenticar, authController.logout);
authRoutes.get('/me',             autenticar, authController.me);

// ─── GET /auth/profile - Ver perfil del usuario ───────────────
authRoutes.get('/profile', autenticar, async (req: AuthRequest, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
      select: {
        id: true, nombre: true, apellido: true, email: true, telefono: true,
        activo: true,
        createdAt: true,
        roles: { include: { rol: { select: { nombre: true } } } },
        cliente: {
          select: {
            totalGastado: true, cantidadOrdenes: true, segmento: true,
            direcciones: {
              where: { activo: true },
              orderBy: { esPrincipal: 'desc' },
            }
          }
        }
      }
    })
    res.json({ success: true, data: usuario })
  } catch (err) { next(err) }
})

// ─── PUT /auth/profile - Editar perfil del usuario ───────────
authRoutes.put('/profile', autenticar, async (req: AuthRequest, res, next) => {
  try {
    const datos = z.object({
      nombre:   z.string().min(2).max(100),
      apellido: z.string().min(2).max(100),
      telefono: z.string().max(20).optional(),
    }).parse(req.body)

    const usuario = await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data:  datos,
      select: { id: true, nombre: true, apellido: true, email: true, telefono: true }
    })

    res.json({ success: true, data: usuario, message: 'Perfil actualizado correctamente' })
  } catch (err) { next(err) }
})