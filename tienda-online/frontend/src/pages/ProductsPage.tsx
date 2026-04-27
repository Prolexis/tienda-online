// =============================================
// PÁGINA: LISTADO DE PRODUCTOS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import ReviewModal from '../components/products/ReviewModal'
import ProductDetailModal from '../components/products/ProductDetailModal'

interface Producto {
  id:          number
  sku:         string
  nombre:      string
  descripcion: string | null
  imagen:      string | null
  imagenes:    { url: string; esPrincipal: boolean; orden: number }[]
  precioVenta: number
  precioOferta: number | null
  stock:       number
  destacado:   boolean
  categoria:   { id: number; nombre: string }
}

interface Categoria { id: number; nombre: string; _count: { productos: number } }
interface Marca { id: number; nombre: string; _count: { productos: number } }

export default function ProductsPage() {
  const [productos,    setProductos]    = useState<Producto[]>([])
  const [categorias,   setCategorias]   = useState<Categoria[]>([])
  const [marcas,       setMarcas]       = useState<Marca[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [busqueda,     setBusqueda]     = useState('')
  const [categoriaId,  setCategoriaId]  = useState<number | undefined>()
  const [marcaId,      setMarcaId]      = useState<number | undefined>()
  const [pagina,       setPagina]       = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const { agregarItem }                 = useCartStore()
  const { usuario }                     = useAuthStore()
  const [wishlist, setWishlist]         = useState<number[]>([])
  
  // Estado para el modal de reseñas
  const [productoResena, setProductoResena] = useState<{ id: number; nombre: string } | null>(null)
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null)

  const cargarWishlist = useCallback(async () => {
    if (!usuario) return
    try {
      const { data } = await api.get('/wishlist')
      setWishlist(data.data.map((p: any) => p.id))
    } catch { /* silencioso */ }
  }, [usuario])

  useEffect(() => { cargarWishlist() }, [cargarWishlist])

  const toggleWishlist = async (productoId: number) => {
    if (!usuario) { toast.error('Inicia sesión para usar la lista de deseos'); return }
    try {
      if (wishlist.includes(productoId)) {
        await api.delete(`/wishlist/${productoId}`)
        setWishlist(wishlist.filter(id => id !== productoId))
        toast.success('Eliminado de favoritos')
      } else {
        await api.post('/wishlist', { productoId })
        setWishlist([...wishlist, productoId])
        toast.success('Agregado a favoritos')
      }
    } catch { toast.error('Error al actualizar favoritos') }
  }

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    try {
      const params: Record<string, string | number | boolean> = { pagina, porPagina: 12 }
      if (busqueda)    params.busqueda    = busqueda
      if (categoriaId) params.categoriaId = categoriaId
      if (marcaId)     params.marcaId     = marcaId
      const { data } = await api.get('/products', { params })
      setProductos(data.productos)
      setTotalPaginas(data.meta.totalPaginas)
    } catch { toast.error('Error al cargar productos') }
    finally  { setCargando(false) }
  }, [pagina, busqueda, categoriaId, marcaId])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  useEffect(() => {
    api.get('/products/categories').then(({ data }) => setCategorias(data.data))
    api.get('/products/brands').then(({ data }) => setMarcas(data.data))
  }, [])

  // Fallback para imágenes que no cargan
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/400x300/e5e7eb/9ca3af?text=Sin+imagen'
  }

  const handleAgregar = async (productoId: number) => {
    if (!usuario) { toast.error('Debes iniciar sesión para agregar al carrito'); return }
    await agregarItem(productoId, 1)
  }

  const precioMostrar = (p: Producto) =>
    Number(p.precioOferta ?? p.precioVenta)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nuestros Productos</h1>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            placeholder="Buscar productos..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={categoriaId ?? ''}
          onChange={(e) => { setCategoriaId(e.target.value ? Number(e.target.value) : undefined); setPagina(1) }}
          className="input-field w-full sm:w-48"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nombre} ({cat._count.productos})</option>
          ))}
        </select>
        <select
          value={marcaId ?? ''}
          onChange={(e) => { setMarcaId(e.target.value ? Number(e.target.value) : undefined); setPagina(1) }}
          className="input-field w-full sm:w-48"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((marca) => (
            <option key={marca.id} value={marca.id}>{marca.nombre} ({marca._count.productos})</option>
          ))}
        </select>
      </div>

      {/* Grid de productos */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-xl"/>
              <div className="p-4 space-y-3">
                <div className="bg-gray-200 h-4 rounded w-3/4"/>
                <div className="bg-gray-200 h-4 rounded w-1/2"/>
                <div className="bg-gray-200 h-9 rounded"/>
              </div>
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">😕</p>
          <h3 className="text-lg font-semibold text-gray-700">No se encontraron productos</h3>
          <p className="text-gray-500 mt-1">Intenta con otros filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((prod) => (
            <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
              {/* Imagen */}
              <div 
                className="relative overflow-hidden h-48 bg-gray-100 cursor-pointer"
                onClick={() => setProductoDetalle(prod)}
              >
                <img
                  src={prod.imagenes?.find(img => img.esPrincipal)?.url || prod.imagen || 'https://placehold.co/400x300/e5e7eb/9ca3af?text=Sin+imagen'}
                  alt={prod.nombre}
                  onError={handleImageError}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button 
                  onClick={() => toggleWishlist(prod.id)}
                  className={`absolute top-2 right-2 w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-all z-10
                    ${wishlist.includes(prod.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}
                >
                  <svg className="w-5 h-5" fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </button>
                {prod.precioOferta && (
                  <span className="absolute top-2 left-2 badge bg-red-100 text-red-700 font-bold">
                    -{Math.round((1 - Number(prod.precioOferta) / Number(prod.precioVenta)) * 100)}% OFF
                  </span>
                )}
                {prod.destacado && (
                  <span className="absolute top-2 right-2 badge bg-yellow-100 text-yellow-700">⭐ Destacado</span>
                )}
                {prod.stock === 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-gray-800 font-semibold px-3 py-1 rounded-full text-sm">Agotado</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded">
                  {prod.categoria.nombre}
                </span>
                <h3 className="font-semibold text-gray-900 mt-2 line-clamp-2 text-sm leading-snug">
                  {prod.nombre}
                </h3>

                {/* Precio */}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-primary-700">
                    S/. {precioMostrar(prod).toFixed(2)}
                  </span>
                  {prod.precioOferta && (
                    <span className="text-sm text-gray-400 line-through">
                      S/. {Number(prod.precioVenta).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Stock */}
                <p className={`text-xs mt-1 ${prod.stock <= 5 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {prod.stock === 0 ? 'Sin stock' : prod.stock <= 5 ? `¡Últimas ${prod.stock} unidades!` : `Stock: ${prod.stock}`}
                </p>

                {/* Botón */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAgregar(prod.id)}
                    disabled={prod.stock === 0}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    🛒 Agregar
                  </button>
                  <button
                    onClick={() => setProductoResena({ id: prod.id, nombre: prod.nombre })}
                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                    title="Ver reseñas"
                  >
                    ⭐
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle de Producto */}
      {productoDetalle && (
        <ProductDetailModal
          producto={productoDetalle}
          onClose={() => setProductoDetalle(null)}
          onAgregar={() => handleAgregar(productoDetalle.id)}
        />
      )}

      {/* Modal de Reseñas */}
      {productoResena && (
        <ReviewModal
          productoId={productoResena.id}
          nombreProducto={productoResena.nombre}
          onClose={() => setProductoResena(null)}
        />
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary px-4 py-2">
            ← Anterior
          </button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Página {pagina} de {totalPaginas}
          </span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="btn-secondary px-4 py-2">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}