// =============================================
// SERVICIO DE ÓRDENES
// =============================================

import { EstadoOrden } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { CreateOrderDTO } from '../types';
import * as stockService from './stock.service';

// ─── Generar número de orden único ───────────────────────────
function generarNumeroOrden(): string {
  const fecha  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ORD-${fecha}-${aleatorio}`;
}

// ─── Crear orden desde el carrito ────────────────────────────
export async function crearOrden(usuarioId: number, datos: CreateOrderDTO) {
  const { carritoId, metodoPago, notasCliente } = datos;

  // Obtener carrito con items
  const carrito = await prisma.carrito.findFirst({
    where: { id: carritoId, usuarioId, activo: true },
    include: {
      items: {
        include: { producto: true },
      },
    },
  });

  if (!carrito || carrito.items.length === 0) {
    throw new AppError('El carrito está vacío o no existe', 400);
  }

  // Verificar stock de todos los productos antes de crear la orden
  await stockService.verificarStock(carrito.items.map(item => ({
    productoId: item.productoId,
    cantidad: item.cantidad
  })));

  const IGV = 0.18;
  const subtotal  = carrito.items.reduce(
    (sum, item) => sum + Number(item.precio) * item.cantidad, 0
  );
  const impuesto  = subtotal * IGV;
  const total     = subtotal + impuesto;

  // Crear orden en transacción
  const orden = await prisma.$transaction(async (tx) => {
    // 1. Manejar dirección (si es nueva, crearla)
    let finalDireccionId = datos.direccionId;

    if (datos.direccionNueva) {
      const cliente = await tx.cliente.findUnique({ where: { usuarioId } });
      if (cliente) {
        const nuevaDir = await tx.direccion.create({
          data: {
            ...datos.direccionNueva,
            clienteId: cliente.id,
            alias: `Envío ${generarNumeroOrden()}`,
          }
        });
        finalDireccionId = nuevaDir.id;
      }
    }

    // 2. Crear la orden
    const nuevaOrden = await tx.orden.create({
      data: {
        usuarioId,
        direccionId:   finalDireccionId ?? null,
        numeroOrden:   generarNumeroOrden(),
        estado:        EstadoOrden.PENDIENTE_PAGO,
        subtotal,
        impuesto,
        total,
        metodoPago,
        notasCliente,
        items: {
          create: carrito.items.map((item) => ({
            productoId:     item.productoId,
            nombreProducto: item.producto.nombre,
            cantidad:       item.cantidad,
            precioUnitario: item.precio,
            subtotal:       Number(item.precio) * item.cantidad,
          })),
        },
        historialEstados: {
          create: { estadoNuevo: EstadoOrden.PENDIENTE_PAGO, comentario: 'Orden creada' },
        },
      },
    });

    // 3. Descontar stock y registrar movimientos
    for (const item of carrito.items) {
      await stockService.descontarStock(
        tx,
        item.productoId,
        item.cantidad,
        `Venta - Orden ${nuevaOrden.numeroOrden}`,
        usuarioId
      );
    }

    // 3. Desactivar carrito
    await tx.carrito.update({
      where: { id: carritoId },
      data: { activo: false },
    });

    // 4. Crear registro de pago simulado
    await tx.pago.create({
      data: {
        ordenId:  nuevaOrden.id,
        monto:    total,
        metodo:   metodoPago,
        estado:   'completado',
        referencia: `SIM-${Date.now()}`,
        fechaPago: new Date(),
      },
    });

    // 5. Actualizar estado a PAGADA (pago simulado)
    await tx.orden.update({
      where: { id: nuevaOrden.id },
      data: { estado: EstadoOrden.PAGADA },
    });

    // 6. Historial de estado PAGADA
    await tx.historialEstadoOrden.create({
      data: {
        ordenId:        nuevaOrden.id,
        estadoAnterior: EstadoOrden.PENDIENTE_PAGO,
        estadoNuevo:    EstadoOrden.PAGADA,
        comentario:     'Pago simulado procesado exitosamente',
      },
    });

    // 7. Actualizar estadísticas del cliente
    await tx.cliente.updateMany({
      where: { usuarioId },
      data: {
        totalGastado:   { increment: total },
        cantidadOrdenes: { increment: 1 },
      },
    });

    return nuevaOrden;
  });

  return obtenerOrden(orden.id);
}

// ─── Obtener orden por ID ─────────────────────────────────────
export async function obtenerOrden(id: number) {
  const orden = await prisma.orden.findUnique({
    where: { id },
    include: {
      items:    true,
      pagos:    true,
      direccion: true,
      historialEstados: { orderBy: { createdAt: 'asc' } },
      usuario:  { select: { nombre: true, apellido: true, email: true } },
    },
  });
  if (!orden) throw new AppError('Orden no encontrada', 404);
  return orden;
}

// ─── Listar órdenes de un usuario ────────────────────────────
export async function listarOrdenesUsuario(usuarioId: number, pagina = 1, porPagina = 10) {
  const skip = (pagina - 1) * porPagina;

  const [ordenes, total] = await Promise.all([
    prisma.orden.findMany({
      where: { usuarioId },
      skip,
      take: porPagina,
      include: {
        items: { select: { nombreProducto: true, cantidad: true, precioUnitario: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orden.count({ where: { usuarioId } }),
  ]);

  return { ordenes, meta: { total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) } };
}

// ─── Listar todas las órdenes (Admin) con filtros avanzados ──
export async function listarTodasOrdenes(filtros: {
  pagina?: number;
  porPagina?: number;
  estado?: EstadoOrden;
  inicio?: string;
  fin?: string;
  cliente?: string;
  numeroOrden?: string;
}) {
  const { pagina = 1, porPagina = 20, estado, inicio, fin, cliente, numeroOrden } = filtros;
  const skip = (pagina - 1) * porPagina;

  const where: any = {};

  if (estado) where.estado = estado;
  if (numeroOrden) where.numeroOrden = { contains: numeroOrden };
  
  // Filtro por rango de fechas
  if (inicio || fin) {
    where.createdAt = {};
    if (inicio) where.createdAt.gte = new Date(inicio);
    if (fin)    where.createdAt.lte = new Date(fin);
  }

  // Filtro por cliente (nombre, apellido o email)
  if (cliente) {
    where.usuario = {
      OR: [
        { nombre:   { contains: cliente } },
        { apellido: { contains: cliente } },
        { email:    { contains: cliente } },
      ],
    };
  }

  const [ordenes, total] = await Promise.all([
    prisma.orden.findMany({
      where,
      skip,
      take: porPagina,
      include: {
        usuario: { select: { nombre: true, apellido: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orden.count({ where }),
  ]);

  return { ordenes, meta: { total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) } };
}

// ─── Cambiar estado de orden (Admin) ─────────────────────────
export async function cambiarEstadoOrden(
  ordenId: number,
  nuevoEstado: EstadoOrden,
  comentario?: string
) {
  const orden = await prisma.orden.findUnique({ where: { id: ordenId } });
  if (!orden) throw new AppError('Orden no encontrada', 404);

  return prisma.$transaction(async (tx) => {
    await tx.historialEstadoOrden.create({
      data: {
        ordenId,
        estadoAnterior: orden.estado,
        estadoNuevo:    nuevoEstado,
        comentario,
      },
    });

    return tx.orden.update({ where: { id: ordenId }, data: { estado: nuevoEstado } });
  });
}
