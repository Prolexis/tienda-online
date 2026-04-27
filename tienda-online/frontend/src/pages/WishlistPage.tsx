// =============================================
// PÁGINA: LISTA DE DESEOS (FAVORITOS)
// =============================================

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'

interface Producto {
  id:          number
  sku:         string
  nombre:      string
  imagen:      string | null
  precioVenta: number
  precioOferta: number | null
  stock:       number
}

export default function WishlistPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando]   = useState(true)
  const { agregarItem }           = useCartStore()
  const { usuario }               = useAuthStore()

  const cargarWishlist = useCallback(async () => {
    if (!usuario) return
    setCargando(true)
    try {
      const { data } = await api.get('/wishlist')
      setProductos(data.data)
    } catch {
      toast.error('Error al cargar favoritos')
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => { cargarWishlist() }, [cargarWishlist])

  const eliminarDeWishlist = async (productoId: number) => {
    try {
      await api.delete(`/wishlist/${productoId}`)
      setProductos(productos.filter(p => p.id !== productoId))
      toast.success('Eliminado de favoritos')
    } catch {
      toast.error('Error al eliminar de favoritos')
    }
  }

  const handleAgregarAlCarrito = async (productoId: number) => {
    await agregarItem(productoId, 1)
    toast.success('Producto agregado al carrito')
  }

  if (cargando) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 text-sm">Cargando tus favoritos...</p>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-6">❤️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu lista de deseos está vacía</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Aún no has guardado ningún producto como favorito. Explora nuestra tienda y guarda lo que más te guste.
        </p>
        <Link to="/products" className="btn-primary px-8">Explorar productos</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Favoritos</h1>
          <p className="text-gray-500 text-sm mt-1">Tienes {productos.length} productos guardados</p>
        </div>
        <Link to="/products" className="text-primary-600 font-medium hover:underline text-sm">
          Continuar comprando
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {productos.map((p) => (
          <div key={p.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
            {/* Imagen */}
            <div className="relative aspect-square overflow-hidden bg-gray-50">
              <img
                src={p.imagen || 'https://via.placeholder.com/300?text=Sin+Imagen'}
                alt={p.nombre}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <button
                onClick={() => eliminarDeWishlist(p.id)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                title="Eliminar de favoritos"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">
                {p.nombre}
              </h3>
              
              <div className="mb-4">
                {p.precioOferta ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-primary-600">S/. {Number(p.precioOferta).toFixed(2)}</span>
                    <span className="text-xs text-gray-400 line-through">S/. {Number(p.precioVenta).toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-gray-900">S/. {Number(p.precioVenta).toFixed(2)}</span>
                )}
              </div>

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => handleAgregarAlCarrito(p.id)}
                  disabled={p.stock === 0}
                  className="btn-primary w-full text-sm py-2"
                >
                  {p.stock === 0 ? 'Sin stock' : '🛒 Agregar al carrito'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
