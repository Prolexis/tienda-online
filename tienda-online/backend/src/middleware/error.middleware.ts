// =============================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =============================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Error de validación Zod
  if (err instanceof ZodError) {
    const errores = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({ success: false, message: 'Error de validación', errors: errores });
    return;
  }

  // Error personalizado de la aplicación
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Error de Prisma - registro duplicado
  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({ success: false, message: 'Ya existe un registro con esos datos' });
    return;
  }

  // Error genérico del servidor
  logger.error('Error no controlado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
}
