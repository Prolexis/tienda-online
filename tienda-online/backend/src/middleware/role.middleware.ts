// =============================================
// MIDDLEWARE DE ROL - Autorización RBAC
// =============================================

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Autorización basada en roles (RBAC).
 * Verifica si el usuario autenticado tiene alguno de los roles permitidos.
 * 
 * @param rolesPermitidos Lista de roles que pueden acceder al recurso
 * @returns Middleware de Express
 */
export function requireRole(...rolesPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ 
        success: false, 
        message: 'No autenticado: Se requiere inicio de sesión' 
      });
      return;
    }

    const tieneRol = req.usuario.roles.some((r) => rolesPermitidos.includes(r));

    if (!tieneRol) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tienes los permisos necesarios para realizar esta acción',
      });
      return;
    }

    next();
  };
}

export default requireRole;
