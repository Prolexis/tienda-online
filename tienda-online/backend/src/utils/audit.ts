import crypto from 'crypto';
import { prisma } from '../config/prisma';

/**
 * Genera un checksum SHA-256 para una entrada de auditoría.
 */
export function generarChecksumAuditoria(datos: any): string {
  const str = JSON.stringify(datos);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Registra una acción en la tabla de auditoría inmutable.
 */
export async function registrarAuditoria(params: {
  entidad: string;
  entidadId: number;
  accion: string;
  usuarioId: number;
  datosAnteriores?: any;
  datosNuevos: any;
  ip?: string;
  userAgent?: string;
}) {
  const { entidad, entidadId, accion, usuarioId, datosAnteriores, datosNuevos, ip, userAgent } = params;
  
  const checksum = generarChecksumAuditoria({
    entidad,
    entidadId,
    accion,
    usuarioId,
    datosAnteriores,
    datosNuevos,
    timestamp: new Date().toISOString() // El timestamp asegura unicidad del hash incluso con mismos datos
  });

  return prisma.auditoriaInmutable.create({
    data: {
      entidad,
      entidadId,
      accion,
      usuarioId,
      datosAnteriores,
      datosNuevos,
      ip,
      userAgent,
      checksum
    }
  });
}
