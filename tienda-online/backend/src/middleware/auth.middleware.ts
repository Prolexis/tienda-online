// =============================================
// MIDDLEWARE DE AUTENTICACIÓN - JWT
// =============================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

// Reexportamos AuthRequest para que otros archivos que lo importan desde este middleware no fallen
export type { AuthRequest } from '../types';

interface JwtPayload {
  id: number;
  email: string;
  roles: string[];
}

/**
 * Verifica que el token JWT sea válido.
 * Inyecta req.usuario con los datos del token.
 */
export function autenticar(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Token de acceso ausente. Por favor, inicie sesión.'
    });
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Formato de token inválido. Use el esquema Bearer.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token no proporcionado.'
    });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno.');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    req.usuario = {
      id: payload.id,
      email: payload.email,
      roles: payload.roles || []
    };

    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'El token ha expirado. Por favor, renueve su sesión.'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido. Firma o estructura incorrecta.'
      });
      return;
    }

    console.error('Error en middleware de autenticación:', error);

    res.status(401).json({
      success: false,
      message: 'Error de autenticación.'
    });
  }
}

export { requireRole } from './role.middleware';
