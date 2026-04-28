// =============================================
// STORE DEL CARRITO - Zustand
// =============================================

import { create } from 'zustand'
import toast from 'react-hot-toast'
import axios from 'axios'
import api from '../services/api'

interface ProductoCarrito {
  id: number
  nombre: string
  imagen: string | null
  precioVenta: number
  stock: number
}

interface ItemCarrito {
  id: number
  cantidad: number
  precio: number
  subtotal: number
  producto: ProductoCarrito
}

interface ResumenCarrito {
  cantidadItems: number
  subtotal: number
  impuesto: number
  total: number
}

interface Carrito {
  id: number
  items: ItemCarrito[]
  resumen: ResumenCarrito
}

interface CartState {
  carrito: Carrito | null
  cargando: boolean
  obtenerCarrito: () => Promise<void>
  agregarItem: (productoId: number, cantidad?: number) => Promise<void>
  actualizarCantidad: (itemId: number, cantidad: number) => Promise<void>
  eliminarItem: (itemId: number) => Promise<void>
  vaciarCarrito: () => Promise<void>
  totalItems: () => number
}

// Extrae el mensaje real que manda el backend
function obtenerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      'No se pudo realizar la operación'
    )
  }

  return 'Error inesperado'
}

export const useCartStore = create<CartState>((set, get) => ({
  carrito: null,
  cargando: false,

  obtenerCarrito: async () => {
    try {
      const { data } = await api.get('/cart')
      set({ carrito: data.data })
    } catch {
      // Si el usuario no está autenticado, no mostramos error.
    }
  },

  agregarItem: async (productoId, cantidad = 1) => {
    set({ cargando: true })

    try {
      const { data } = await api.post('/cart/items', {
        productoId,
        cantidad,
      })

      set({
        carrito: data.data,
        cargando: false,
      })

      toast.success('Producto agregado al carrito 🛒')
    } catch (error) {
      set({ cargando: false })

      const mensaje = obtenerMensajeError(error)

      // Aquí aparecerá: Stock insuficiente. Disponible: 3
      toast.error(mensaje)
    }
  },

  actualizarCantidad: async (itemId, cantidad) => {
    set({ cargando: true })

    try {
      const { data } = await api.put(`/cart/items/${itemId}`, {
        cantidad,
      })

      set({
        carrito: data.data,
        cargando: false,
      })
    } catch (error) {
      set({ cargando: false })

      const mensaje = obtenerMensajeError(error)

      // Aquí también aparecerá si aumenta más de lo disponible
      toast.error(mensaje)
    }
  },

  eliminarItem: async (itemId) => {
    set({ cargando: true })

    try {
      const { data } = await api.delete(`/cart/items/${itemId}`)

      set({
        carrito: data.data,
        cargando: false,
      })

      toast.success('Producto eliminado del carrito')
    } catch (error) {
      set({ cargando: false })

      const mensaje = obtenerMensajeError(error)
      toast.error(mensaje)
    }
  },

  vaciarCarrito: async () => {
    set({ cargando: true })

    try {
      await api.delete('/cart')

      set({
        carrito: null,
        cargando: false,
      })

      toast.success('Carrito vaciado')
    } catch (error) {
      set({ cargando: false })

      const mensaje = obtenerMensajeError(error)
      toast.error(mensaje)
    }
  },

  totalItems: () => get().carrito?.resumen.cantidadItems ?? 0,
}))
