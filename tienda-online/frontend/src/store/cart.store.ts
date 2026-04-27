// =============================================
// STORE DEL CARRITO - Zustand
// =============================================

import { create } from 'zustand'
import toast from 'react-hot-toast'
import api from '../services/api'

interface ProductoCarrito {
  id: number
  nombre: string
  imagen: string | null
  precioVenta: number
  stock: number
}

interface ItemCarrito {
  id:       number
  cantidad: number
  precio:   number
  subtotal: number
  producto: ProductoCarrito
}

interface ResumenCarrito {
  cantidadItems: number
  subtotal:      number
  impuesto:      number
  total:         number
}

interface Carrito {
  id:      number
  items:   ItemCarrito[]
  resumen: ResumenCarrito
}

interface CartState {
  carrito:  Carrito | null
  cargando: boolean
  obtenerCarrito:    () => Promise<void>
  agregarItem:       (productoId: number, cantidad?: number) => Promise<void>
  actualizarCantidad: (itemId: number, cantidad: number)    => Promise<void>
  eliminarItem:      (itemId: number)                       => Promise<void>
  vaciarCarrito:     ()                                     => Promise<void>
  totalItems:        () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  carrito:  null,
  cargando: false,

  obtenerCarrito: async () => {
    try {
      const { data } = await api.get('/cart')
      set({ carrito: data.data })
    } catch { /* usuario no autenticado, ignorar */ }
  },

  agregarItem: async (productoId, cantidad = 1) => {
    set({ cargando: true })
    try {
      const { data } = await api.post('/cart/items', { productoId, cantidad })
      set({ carrito: data.data, cargando: false })
      toast.success('Producto agregado al carrito 🛒')
    } catch (err) {
      set({ cargando: false })
      throw err
    }
  },

  actualizarCantidad: async (itemId, cantidad) => {
    try {
      const { data } = await api.put(`/cart/items/${itemId}`, { cantidad })
      set({ carrito: data.data })
    } catch (err) { throw err }
  },

  eliminarItem: async (itemId) => {
    try {
      const { data } = await api.delete(`/cart/items/${itemId}`)
      set({ carrito: data.data })
      toast.success('Producto eliminado del carrito')
    } catch (err) { throw err }
  },

  vaciarCarrito: async () => {
    try {
      await api.delete('/cart')
      set({ carrito: null })
      toast.success('Carrito vaciado')
    } catch (err) { throw err }
  },

  totalItems: () => get().carrito?.resumen.cantidadItems ?? 0,
}))
