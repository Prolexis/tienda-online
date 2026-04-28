// =============================================
// TIPOS COMPARTIDOS - Interfaces y DTOs
// =============================================

import type { Request } from 'express';

// ─── Usuario autenticado en request ──────────────────────────
export interface UsuarioAutenticado {
  id: number;
  email: string;
  roles: string[];
  nombre?: string;
  apellido?: string;
  clienteId?: number | null;
}

// ─── Request autenticado ─────────────────────────────────────
// Usamos type en vez de interface para evitar que TypeScript pierda propiedades de Express.
export type AuthRequest = Request<any, any, any, any> & {
  usuario?: UsuarioAutenticado;
};

// ─── Respuesta estándar de la API ─────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    total?: number;
    pagina?: number;
    porPagina?: number;
    totalPaginas?: number;
  };
}

// ─── Parámetros de paginación ─────────────────────────────────
export interface PaginationParams {
  pagina?: number;
  porPagina?: number;
  busqueda?: string;
  orden?: string;
  direccion?: 'asc' | 'desc';
}

// ─── DTOs de Autenticación ────────────────────────────────────
export interface RegisterDTO {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// ─── DTOs de Productos ────────────────────────────────────────
export interface CreateProductoDTO {
  categoriaId: number;
  marcaId?: number;
  sku: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  precioVenta: number;
  precioOferta?: number;
  precioCompra?: number;
  stock: number;
  stockMinimo?: number;
  destacado?: boolean;
}

export interface CreateMarcaDTO {
  nombre: string;
  descripcion?: string;
  imagen?: string;
  activo?: boolean;
  categoriaIds?: number[];
}

// ─── DTOs de Carrito ─────────────────────────────────────────
export interface AddToCartDTO {
  productoId: number;
  cantidad: number;
}

export interface UpdateCartItemDTO {
  cantidad: number;
}

// ─── DTOs de Órdenes ─────────────────────────────────────────
export interface CreateOrderDTO {
  carritoId: number;
  direccionId?: number;
  metodoPago: string;
  notasCliente?: string;
  direccionNueva?: {
    nombre: string;
    apellido: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    codigoPostal?: string;
    telefono: string;
  };
}
