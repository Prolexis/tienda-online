// =============================================
// CONTROLADOR DE AUTENTICACIÓN
// =============================================

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';

// ─── Esquemas de validación ───────────────────────────────────
const RegisterSchema = z.object({
  nombre:   z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const LoginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// ─── Registro ─────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = RegisterSchema.parse(req.body);
    const resultado = await authService.registrar(datos);
    res.status(201).json({ success: true, data: resultado, message: 'Registro exitoso' });
  } catch (err) {
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = LoginSchema.parse(req.body);
    const resultado = await authService.login(datos);
    res.json({ success: true, data: resultado, message: 'Inicio de sesión exitoso' });
  } catch (err) {
    next(err);
  }
}

// ─── Refrescar token ──────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const resultado = await authService.refrescarToken(refreshToken);
    res.json({ success: true, data: resultado });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────
export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.usuario!.id);
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

// ─── Perfil del usuario autenticado ──────────────────────────
export async function me(req: AuthRequest, res: Response) {
  res.json({ success: true, data: req.usuario });
}
