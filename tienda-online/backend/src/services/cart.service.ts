// =============================================
// SERVICIO DE CARRITO DE COMPRAS
// =============================================

import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { AddToCartDTO, UpdateCartItemDTO } from '../types';

// ─── Obtener o crear carrito activo del usuario ──────────────
export async function obtenerOCrearCarrito(usuarioId: number) {
  let carrito = await prisma.carrito.findFirst({
    where: { usuarioId, activo: true },
    include: {
      items: {
        include: { producto: { select: { id: true, nombre: true, imagen: true, precioVenta: true, stock: true } } },
      },
    },
  });

  if (!carrito) {
    carrito = await prisma.carrito.create({
      data: { usuarioId, activo: true },
      include: { items: { include: { producto: true } } },
    });
  }

  return formatearCarrito(carrito);
}

// ─── Agregar producto al carrito ──────────────────────────────
export async function agregarAlCarrito(usuarioId: number, datos: AddToCartDTO) {
  const { productoId, cantidad } = datos;

  // Verificar que el producto existe y tiene stock
  const producto = await prisma.producto.findFirst({ where: { id: productoId, activo: true } });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  if (producto.stock < cantidad) {
    throw new AppError(`Stock insuficiente. Disponible: ${producto.stock}`, 400);
  }

  // Obtener o crear carrito
  let carrito = await prisma.carrito.findFirst({ where: { usuarioId, activo: true } });
  if (!carrito) {
    carrito = await prisma.carrito.create({ data: { usuarioId, activo: true } });
  }

  // Verificar si ya está en el carrito
  const itemExistente = await prisma.itemCarrito.findUnique({
    where: { carritoId_productoId: { carritoId: carrito.id, productoId } },
  });

  if (itemExistente) {
    const nuevaCantidad = itemExistente.cantidad + cantidad;
    if (producto.stock < nuevaCantidad) {
      throw new AppError(`Stock insuficiente. Disponible: ${producto.stock}`, 400);
    }
    await prisma.itemCarrito.update({
      where: { id: itemExistente.id },
      data: { cantidad: nuevaCantidad },
    });
  } else {
    await prisma.itemCarrito.create({
      data: {
        carritoId:  carrito.id,
        productoId,
        cantidad,
        precio:     producto.precioOferta ?? producto.precioVenta,
      },
    });
  }

  return obtenerOCrearCarrito(usuarioId);
}

// ─── Actualizar cantidad de un item ──────────────────────────
export async function actualizarItem(usuarioId: number, itemId: number, datos: UpdateCartItemDTO) {
  const item = await prisma.itemCarrito.findFirst({
    where: { id: itemId, carrito: { usuarioId, activo: true } },
    include: { producto: true },
  });

  if (!item) throw new AppError('Item no encontrado en el carrito', 404);

  if (datos.cantidad <= 0) {
    await prisma.itemCarrito.delete({ where: { id: itemId } });
  } else {
    if (item.producto.stock < datos.cantidad) {
      throw new AppError(`Stock insuficiente. Disponible: ${item.producto.stock}`, 400);
    }
    await prisma.itemCarrito.update({
      where: { id: itemId },
      data: { cantidad: datos.cantidad, precio: item.producto.precioOferta ?? item.producto.precioVenta },
    });
  }

  return obtenerOCrearCarrito(usuarioId);
}

// ─── Eliminar item del carrito ────────────────────────────────
export async function eliminarItem(usuarioId: number, itemId: number) {
  const item = await prisma.itemCarrito.findFirst({
    where: { id: itemId, carrito: { usuarioId, activo: true } },
  });
  if (!item) throw new AppError('Item no encontrado', 404);

  await prisma.itemCarrito.delete({ where: { id: itemId } });
  return obtenerOCrearCarrito(usuarioId);
}

// ─── Vaciar carrito ───────────────────────────────────────────
export async function vaciarCarrito(usuarioId: number) {
  const carrito = await prisma.carrito.findFirst({ where: { usuarioId, activo: true } });
  if (!carrito) return;

  await prisma.itemCarrito.deleteMany({ where: { carritoId: carrito.id } });
  return obtenerOCrearCarrito(usuarioId);
}

// ─── Calcular totales del carrito ─────────────────────────────
function formatearCarrito(carrito: {
  id: number;
  items: Array<{
    id: number;
    cantidad: number;
    precio: { toNumber: () => number } | number;
    producto: { id: number; nombre: string; imagen: string | null; precioVenta: { toNumber: () => number } | number; stock: number };
  }>;
}) {
  const IGV = 0.18; // 18% de impuesto

  const items = carrito.items.map((item) => {
    const precio = typeof item.precio === 'object' ? item.precio.toNumber() : Number(item.precio);
    return {
      id:        item.id,
      cantidad:  item.cantidad,
      precio,
      subtotal:  precio * item.cantidad,
      producto:  item.producto,
    };
  });

  const subtotal  = items.reduce((sum, item) => sum + item.subtotal, 0);
  const impuesto  = subtotal * IGV;
  const total     = subtotal + impuesto;

  return {
    id: carrito.id,
    items,
    resumen: {
      cantidadItems: items.reduce((sum, i) => sum + i.cantidad, 0),
      subtotal:      Number(subtotal.toFixed(2)),
      impuesto:      Number(impuesto.toFixed(2)),
      total:         Number(total.toFixed(2)),
    },
  };
}
