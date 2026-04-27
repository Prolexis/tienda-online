// =============================================
// MIDDLEWARE DE ROL - Autorización RBAC
// =============================================

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Normaliza roles para evitar errores por:
 * - mayúsculas/minúsculas: admin vs ADMIN
 * - tildes: DUEÑO vs DUENO
 * - objetos: { nombre: 'ADMIN' } o { rol: { nombre: 'ADMIN' } }
 */
function normalizarRol(rol: any): string {
  let valor = '';

  if (typeof rol === 'string') {
    valor = rol;
  } else if (rol?.nombre) {
    valor = rol.nombre;
  } else if (rol?.rol?.nombre) {
    valor = rol.rol.nombre;
  }

  return valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Autorización basada en roles.
 */
export function requireRole(...rolesPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({
        success: false,
        message: 'No autenticado: Se requiere inicio de sesión',
      });
      return;
    }

    const rolesUsuario = Array.isArray(req.usuario.roles)
      ? req.usuario.roles.map(normalizarRol)
      : [];

    const rolesPermitidosNormalizados = rolesPermitidos.map(normalizarRol);

    const tieneRol = rolesPermitidosNormalizados.some((rolPermitido) =>
      rolesUsuario.includes(rolPermitido)
    );

    if (!tieneRol) {
      console.warn('Acceso denegado por rol:', {
        usuario: req.usuario.email,
        rolesUsuario,
        rolesPermitidos: rolesPermitidosNormalizados,
      });

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
