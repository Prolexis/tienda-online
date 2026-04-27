import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { registrarAuditoria } from '../utils/audit';

const UMBRAL_2FA = 1000; // S/. 1000

/**
 * El Administrador marca un pago como recibido.
 * Esto crea una entrada en VerificacionPago con estado PENDIENTE_VERIFICACION.
 */
export async function marcarPagoRecibido(params: {
  pagoId: number;
  adminId: number;
  notas?: string;
  ip?: string;
  userAgent?: string;
}) {
  const { pagoId, adminId, notas, ip, userAgent } = params;

  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: { orden: true }
  });

  if (!pago) throw new AppError('Pago no encontrado', 404);
  if (pago.estado === 'confirmado') throw new AppError('El pago ya está confirmado', 400);

  const requiere2FA = Number(pago.monto) >= UMBRAL_2FA;

  return await prisma.$transaction(async (tx) => {
    // 1. Crear o actualizar verificación
    const verificacion = await tx.verificacionPago.upsert({
      where: { pagoId },
      create: {
        pagoId,
        marcadoPorId: adminId,
        estado: 'PENDIENTE_VERIFICACION',
        notas,
        requiere2FA
      },
      update: {
        marcadoPorId: adminId,
        estado: 'PENDIENTE_VERIFICACION',
        notas,
        requiere2FA,
        fechaMarcado: new Date()
      }
    });

    // 2. Registrar auditoría inmutable
    await registrarAuditoria({
      entidad: 'VerificacionPago',
      entidadId: verificacion.id,
      accion: 'MARCAR_RECIBIDO',
      usuarioId: adminId,
      datosNuevos: verificacion,
      ip,
      userAgent
    });

    // 3. Crear notificación para el Dueño
    await tx.notificacion.create({
      data: {
        tipo: 'pago_marcado_recibido',
        mensaje: `Admin ha marcado el pago del pedido ${pago.orden.numeroOrden} por S/. ${pago.monto} como recibido. Requiere verificación final.`,
        vinculo: `/admin/verificaciones/${verificacion.id}`
      }
    });

    return verificacion;
  });
}

/**
 * El Dueño confirma la verificación del pago.
 * Esto actualiza el estado del pago a 'confirmado' y la orden a 'PAGADA' si corresponde.
 */
export async function confirmarVerificacion(params: {
  verificacionId: number;
  duenoId: number;
  ip?: string;
  userAgent?: string;
  token2FA?: string; // Simulado para este ejemplo
}) {
  const { verificacionId, duenoId, ip, userAgent, token2FA } = params;

  const v = await prisma.verificacionPago.findUnique({
    where: { id: verificacionId },
    include: { pago: { include: { orden: true } } }
  });

  if (!v) throw new AppError('Verificación no encontrada', 404);
  if (v.estado === 'VERIFICADO') throw new AppError('Este pago ya fue verificado', 400);

  // Validación 2FA si supera el umbral
  if (v.requiere2FA && !token2FA) {
    throw new AppError('Este monto requiere validación de dos factores', 403);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar verificación
    const verificacionActualizada = await tx.verificacionPago.update({
      where: { id: verificacionId },
      data: {
        estado: 'VERIFICADO',
        verificadoPorId: duenoId,
        fechaVerificado: new Date()
      }
    });

    // 2. Actualizar pago
    await tx.pago.update({
      where: { id: v.pagoId },
      data: { estado: 'confirmado', fechaPago: new Date() }
    });

    // 3. Actualizar orden si el pago completa el total (simplificado)
    await tx.orden.update({
      where: { id: v.pago.ordenId },
      data: { estado: 'PAGADA' }
    });

    // 4. Registrar auditoría inmutable
    await registrarAuditoria({
      entidad: 'VerificacionPago',
      entidadId: v.id,
      accion: 'VERIFICAR',
      usuarioId: duenoId,
      datosAnteriores: v,
      datosNuevos: verificacionActualizada,
      ip,
      userAgent
    });

    // Integración contable (Simulada)
    console.log(`[Contabilidad] Pago ${v.pagoId} verificado. Actualizando estados contables...`);

    return verificacionActualizada;
  });
}

/**
 * Reverso de verificación con autorización del dueño.
 */
export async function reversarVerificacion(params: {
  verificacionId: number;
  duenoId: number;
  motivo: string;
  ip?: string;
  userAgent?: string;
}) {
  const { verificacionId, duenoId, motivo, ip, userAgent } = params;

  const v = await prisma.verificacionPago.findUnique({
    where: { id: verificacionId },
    include: { pago: true }
  });

  if (!v || v.estado !== 'VERIFICADO') throw new AppError('Solo se pueden reversar pagos verificados', 400);

  return await prisma.$transaction(async (tx) => {
    const actualizada = await tx.verificacionPago.update({
      where: { id: verificacionId },
      data: { estado: 'REVERSADO', notas: `${v.notas}\nREVERSO: ${motivo}` }
    });

    await tx.pago.update({
      where: { id: v.pagoId },
      data: { estado: 'reversado' }
    });

    await registrarAuditoria({
      entidad: 'VerificacionPago',
      entidadId: v.id,
      accion: 'REVERSAR',
      usuarioId: duenoId,
      datosAnteriores: v,
      datosNuevos: actualizada,
      ip,
      userAgent
    });

    return actualizada;
  });
}
