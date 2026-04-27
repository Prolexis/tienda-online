import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';

/**
 * Servicio para la gestión y validación de stock en tiempo real
 */

/**
 * Verifica si hay suficiente stock para una lista de productos
 * @param items Lista de productos y cantidades a verificar
 * @throws AppError si no hay stock suficiente
 */
export async function verificarStock(items: { productoId: number; cantidad: number }[]) {
  for (const item of items) {
    const producto = await prisma.producto.findUnique({
      where: { id: item.productoId },
      select: { nombre: true, stock: true, stockMinimo: true }
    });

    if (!producto) {
      throw new AppError(`Producto con ID ${item.productoId} no encontrado`, 404);
    }

    if (producto.stock < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}`,
        400
      );
    }
  }
}

/**
 * Descuenta el stock de un producto y registra el movimiento
 * @param tx Instancia de transacción de Prisma
 * @param productoId ID del producto
 * @param cantidad Cantidad a descontar
 * @param motivo Motivo del descuento (ej: Venta, Ajuste)
 * @param usuarioId ID del usuario que realiza la operación
 */
export async function descontarStock(
  tx: any,
  productoId: number,
  cantidad: number,
  motivo: string,
  usuarioId: number
) {
  const producto = await tx.producto.findUnique({
    where: { id: productoId },
    select: { stock: true, stockMinimo: true, nombre: true }
  });

  if (!producto) throw new AppError('Producto no encontrado', 404);

  const nuevoStock = producto.stock - cantidad;

  if (nuevoStock < 0) {
    throw new AppError(`Stock insuficiente para "${producto.nombre}"`, 400);
  }

  // Actualizar stock
  await tx.producto.update({
    where: { id: productoId },
    data: { stock: nuevoStock }
  });

  // Registrar movimiento
  await tx.movimientoInventario.create({
    data: {
      productoId,
      tipo: 'salida',
      cantidad,
      stockAntes: producto.stock,
      stockDespues: nuevoStock,
      motivo,
      usuarioId
    }
  });

  // Verificar alerta de stock bajo
  if (nuevoStock <= producto.stockMinimo) {
    await crearAlertaStockBajo(productoId, producto.nombre, nuevoStock, producto.stockMinimo);
  }

  return nuevoStock;
}

/**
 * Crea una alerta de stock bajo
 */
async function crearAlertaStockBajo(productoId: number, nombre: string, stockActual: number, stockMinimo: number) {
  const mensaje = `ALERTA DE STOCK CRÍTICO: El producto "${nombre}" ha llegado a ${stockActual} unidades. El mínimo es ${stockMinimo}.`;
  
  console.warn(mensaje);
  
  // Registrar notificación en la base de datos
  try {
    await prisma.notificacion.create({
      data: {
        tipo: 'alerta_stock',
        mensaje,
        vinculo: `/admin/inventory?busqueda=${encodeURIComponent(nombre)}`
      }
    });
  } catch (err) {
    console.error('Error al crear notificación de stock:', err);
  }
}

/**
 * Valida la disponibilidad de un producto individual
 */
export async function validarDisponibilidad(productoId: number, cantidad: number) {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { stock: true, activo: true }
  });

  if (!producto || !producto.activo) return false;
  return producto.stock >= cantidad;
}
