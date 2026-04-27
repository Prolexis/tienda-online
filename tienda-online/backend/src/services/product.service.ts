// =============================================
// SERVICIO DE PRODUCTOS
// =============================================

import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { CreateProductoDTO, PaginationParams, CreateMarcaDTO } from '../types';

// ─── Listar productos con filtros y paginación ───────────────
export async function listarProductos(params: PaginationParams & {
  categoriaId?: number;
  marcaId?: number;
  destacados?: boolean;
  precioMin?: number;
  precioMax?: number;
}) {
  const { pagina = 1, porPagina = 12, busqueda, categoriaId, marcaId, destacados, precioMin, precioMax } = params;
  const skip = (pagina - 1) * porPagina;

  const where: Record<string, unknown> = { activo: true };

  if (busqueda) {
    where.OR = [
      { nombre:      { contains: busqueda, mode: 'insensitive' } },
      { descripcion: { contains: busqueda, mode: 'insensitive' } },
      { sku:         { contains: busqueda, mode: 'insensitive' } },
    ];
  }
  if (categoriaId) where.categoriaId = categoriaId;
  if (marcaId)     where.marcaId     = marcaId;
  if (destacados)  where.destacado   = true;
  if (precioMin || precioMax) {
    where.precioVenta = {};
    if (precioMin) (where.precioVenta as Record<string, unknown>).gte = precioMin;
    if (precioMax) (where.precioVenta as Record<string, unknown>).lte = precioMax;
  }

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip,
      take: porPagina,
      include: { 
        categoria: { select: { id: true, nombre: true } },
        marca: { select: { id: true, nombre: true } },
        imagenes: {
          select: { url: true, esPrincipal: true, orden: true },
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.producto.count({ where }),
  ]);

  return {
    productos,
    meta: {
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}

// ─── Obtener producto por ID ──────────────────────────────────
export async function obtenerProducto(id: number) {
  const producto = await prisma.producto.findFirst({
    where: { id, activo: true },
    include: { 
      categoria: true, 
      marca: true,
      imagenes: {
        orderBy: { orden: 'asc' }
      }
    },
  });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  return producto;
}

// ─── Crear producto (Admin) ───────────────────────────────────
export async function crearProducto(datos: any) {
  // Verificar SKU único
  const existe = await prisma.producto.findUnique({ where: { sku: datos.sku } });
  if (existe) throw new AppError('Ya existe un producto con ese SKU', 409);

  const { imagenes, ...rest } = datos;

  return prisma.producto.create({ 
    data: {
      ...rest,
      imagenes: imagenes ? {
        create: imagenes.map((img: any, idx: number) => ({
          url: img.url,
          esPrincipal: img.esPrincipal || idx === 0,
          orden: img.orden || idx
        }))
      } : undefined
    },
    include: { imagenes: true }
  });
}

// ─── Actualizar producto ──────────────────────────────────────
export async function actualizarProducto(id: number, datos: any) {
  await obtenerProducto(id); // Verifica existencia

  const { imagenes, ...rest } = datos;

  return prisma.$transaction(async (tx) => {
    // Si se envían nuevas imágenes, reemplazamos las anteriores o las actualizamos
    if (imagenes) {
      // Por simplicidad en este MVP, borramos y creamos de nuevo las imágenes
      // En producción se podría hacer una sincronización más fina
      await tx.productoImagen.deleteMany({ where: { productoId: id } });
      
      await tx.productoImagen.createMany({
        data: imagenes.map((img: any, idx: number) => ({
          productoId: id,
          url: img.url,
          esPrincipal: img.esPrincipal || idx === 0,
          orden: img.orden || idx
        }))
      });
    }

    return tx.producto.update({ 
      where: { id }, 
      data: rest,
      include: { imagenes: true }
    });
  });
}

// ─── Eliminar producto (eliminación lógica) ──────────────────
export async function eliminarProducto(id: number) {
  await obtenerProducto(id);
  return prisma.producto.update({ where: { id }, data: { activo: false } });
}

// ─── Listar categorías ────────────────────────────────────────
export async function listarCategorias() {
  return prisma.categoria.findMany({
    where: { activo: true },
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: 'asc' },
  });
}

// ─── Listar marcas ────────────────────────────────────────────
export async function listarMarcas(soloActivas = true) {
  return prisma.marca.findMany({
    where: soloActivas ? { activo: true } : {},
    include: { 
      _count: { select: { productos: true } },
      categorias: { select: { id: true, nombre: true } }
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function crearMarca(datos: CreateMarcaDTO) {
  // Verificar duplicado
  const existe = await prisma.marca.findFirst({
    where: { nombre: { equals: datos.nombre, mode: 'insensitive' } }
  });
  if (existe) throw new AppError('Ya existe una marca con ese nombre', 409);

  const slug = datos.nombre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  const { categoriaIds, ...rest } = datos;

  return prisma.marca.create({ 
    data: { 
      ...rest, 
      slug,
      categorias: categoriaIds ? {
        connect: categoriaIds.map(id => ({ id }))
      } : undefined
    } 
  });
}

export async function actualizarMarca(id: number, datos: Partial<CreateMarcaDTO>) {
  // Verificar duplicado si cambia el nombre
  if (datos.nombre) {
    const existe = await prisma.marca.findFirst({
      where: { 
        nombre: { equals: datos.nombre, mode: 'insensitive' },
        id: { not: id }
      }
    });
    if (existe) throw new AppError('Ya existe otra marca con ese nombre', 409);
  }

  let slug;
  if (datos.nombre) {
    slug = datos.nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  const { categoriaIds, ...rest } = datos;

  return prisma.marca.update({ 
    where: { id }, 
    data: { 
      ...rest, 
      ...(slug ? { slug } : {}),
      categorias: categoriaIds ? {
        set: categoriaIds.map(id => ({ id }))
      } : undefined
    } 
  });
}

export async function eliminarMarca(id: number) {
  const marca = await prisma.marca.findUnique({
    where: { id },
    include: { _count: { select: { productos: true } } }
  });

  if (!marca) throw new AppError('Marca no encontrada', 404);
  if (marca._count.productos > 0) {
    throw new AppError(`No se puede eliminar la marca porque tiene ${marca._count.productos} productos asociados`, 400);
  }

  return prisma.marca.update({ 
    where: { id }, 
    data: { activo: false } 
  });
}
