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
import { getImageUrl } from '../utils/imageUrl'

interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion: string | null
  imagen: string | null
  imagenes: {
    url: string
    esPrincipal: boolean
    orden: number
  }[]
  precioVenta: number
  precioOferta: number | null
  stock: number
  destacado: boolean
  categoria: {
    id: number
    nombre: string
  }
}

interface Categoria {
  id: number
  nombre: string
  _count: {
    productos: number
  }
}

interface Marca {
  id: number
  nombre: string
  _count: {
    productos: number
  }
}

export default function ProductsPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | undefined>()
  const [marcaId, setMarcaId] = useState<number | undefined>()
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const { agregarItem } = useCartStore()
  const { usuario } = useAuthStore()

  const [wishlist, setWishlist] = useState<number[]>([])
  const [productoResena, setProductoResena] = useState<{
    id: number
    nombre: string
  } | null>(null)
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null)

  const cargarWishlist = useCallback(async () => {
    if (!usuario) return

    try {
      const { data } = await api.get('/wishlist')
      const lista = Array.isArray(data?.data) ? data.data : []
      setWishlist(lista.map((p: any) => p.id))
    } catch {
      // Silencioso para no interrumpir la experiencia del cliente.
    }
  }, [usuario])

  useEffect(() => {
    cargarWishlist()
  }, [cargarWishlist])

  const cargarProductos = useCallback(async () => {
    setCargando(true)

    try {
      const params: Record<string, string | number | boolean> = {
        pagina,
        porPagina: 12,
      }

      if (busqueda) params.busqueda = busqueda
      if (categoriaId) params.categoriaId = categoriaId
      if (marcaId) params.marcaId = marcaId

      const { data } = await api.get('/products', { params })

      console.log('RESPUESTA PRODUCTOS:', data)

      const listaProductos: Producto[] = Array.isArray(data?.productos)
        ? data.productos
        : Array.isArray(data?.data?.productos)
          ? data.data.productos
          : Array.isArray(data?.data)
            ? data.data
            : []

      const meta = data?.meta || data?.data?.meta || {}

      setProductos(listaProductos)
      setTotalPaginas(meta.totalPaginas || 1)
    } catch (error) {
      console.error('ERROR AL CARGAR PRODUCTOS:', error)
      toast.error('Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [pagina, busqueda, categoriaId, marcaId])

  useEffect(() => {
    cargarProductos()
  }, [cargarProductos])

  useEffect(() => {
    api
      .get('/products/categories')
      .then(({ data }) => {
        const listaCategorias: Categoria[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.categorias)
            ? data.categorias
            : []

        setCategorias(listaCategorias)
      })
      .catch(() => toast.error('Error al cargar categorías'))

    api
      .get('/products/brands')
      .then(({ data }) => {
        const listaMarcas: Marca[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.marcas)
            ? data.marcas
            : []

        setMarcas(listaMarcas)
      })
      .catch(() => toast.error('Error al cargar marcas'))
  }, [])

  const getProductoImagen = (producto: Producto): string => {
    const imagenPrincipal = producto.imagenes?.find((img) => img.esPrincipal)?.url
    return getImageUrl(imagenPrincipal || producto.imagen)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src =
      'https://placehold.co/600x450/e5e7eb/64748b?text=Sin+imagen'
  }

  const toggleWishlist = async (
    e: React.MouseEvent<HTMLButtonElement>,
    productoId: number
  ) => {
    e.stopPropagation()

    if (!usuario) {
      toast.error('Inicia sesión para usar la lista de deseos')
      return
    }

    try {
      if (wishlist.includes(productoId)) {
        await api.delete(`/wishlist/${productoId}`)
        setWishlist(wishlist.filter((id) => id !== productoId))
        toast.success('Eliminado de favoritos')
      } else {
        await api.post('/wishlist', { productoId })
        setWishlist([...wishlist, productoId])
        toast.success('Agregado a favoritos')
      }
    } catch {
      toast.error('Error al actualizar favoritos')
    }
  }

  const handleAgregar = async (
    e: React.MouseEvent<HTMLButtonElement>,
    producto: Producto
  ) => {
    e.stopPropagation()

    if (!usuario) {
      toast.error('Debes iniciar sesión para agregar al carrito')
      return
    }

    if (producto.stock <= 0) {
      toast.error('Producto sin stock disponible')
      return
    }

    await agregarItem(producto.id, 1)
  }

  const precioMostrar = (producto: Producto) => {
    return Number(producto.precioOferta ?? producto.precioVenta)
  }

  const porcentajeDescuento = (producto: Producto) => {
    if (!producto.precioOferta) return 0

    return Math.round(
      (1 - Number(producto.precioOferta) / Number(producto.precioVenta)) * 100
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
          Catálogo 2026
        </p>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">
          Nuestros Productos
        </h1>

        <p className="text-gray-500 mt-2">
          Explora productos disponibles con imágenes actualizadas, stock real y precios vigentes.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              placeholder="Buscar productos..."
              className="input-field pl-9"
            />
          </div>

          <select
            value={categoriaId ?? ''}
            onChange={(e) => {
              setCategoriaId(e.target.value ? Number(e.target.value) : undefined)
              setPagina(1)
            }}
            className="input-field w-full sm:w-52"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre} ({cat._count?.productos ?? 0})
              </option>
            ))}
          </select>

          <select
            value={marcaId ?? ''}
            onChange={(e) => {
              setMarcaId(e.target.value ? Number(e.target.value) : undefined)
              setPagina(1)
            }}
            className="input-field w-full sm:w-52"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((marca) => (
              <option key={marca.id} value={marca.id}>
                {marca.nombre} ({marca._count?.productos ?? 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Productos */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse overflow-hidden"
            >
              <div className="bg-gray-200 h-56" />
              <div className="p-4 space-y-3">
                <div className="bg-gray-200 h-4 rounded w-3/4" />
                <div className="bg-gray-200 h-4 rounded w-1/2" />
                <div className="bg-gray-200 h-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm text-center py-16">
          <p className="text-6xl mb-4">😕</p>
          <h3 className="text-lg font-semibold text-gray-700">
            No se encontraron productos
          </h3>
          <p className="text-gray-500 mt-1">
            Intenta con otros filtros de búsqueda o revisa la consola para ver la respuesta del backend.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((prod) => {
            const imagenProducto = getProductoImagen(prod)
            const sinStock = prod.stock <= 0
            const stockBajo = prod.stock > 0 && prod.stock <= 5

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Imagen */}
                <div
                  className="relative overflow-hidden h-56 bg-gray-100 cursor-pointer"
                  onClick={() => setProductoDetalle(prod)}
                >
                  <img
                    src={imagenProducto}
                    alt={prod.nombre}
                    onError={handleImageError}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Favorito */}
                  <button
                    onClick={(e) => toggleWishlist(e, prod.id)}
                    className={`absolute top-3 right-3 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all z-10 ${
                      wishlist.includes(prod.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-400 hover:text-red-500'
                    }`}
                    title="Agregar a favoritos"
                  >
                    <svg
                      className="w-5 h-5"
                      fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>

                  {/* Descuento / destacado */}
                  {prod.precioOferta ? (
                    <span className="absolute top-3 left-3 bg-red-100 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                      -{porcentajeDescuento(prod)}% OFF
                    </span>
                  ) : prod.destacado ? (
                    <span className="absolute top-3 left-3 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      ⭐ Destacado
                    </span>
                  ) : null}

                  {/* Agotado */}
                  {sinStock && (
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <span className="bg-white text-gray-900 font-bold px-4 py-2 rounded-full text-sm shadow">
                        Agotado
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <span className="inline-flex text-xs text-primary-700 font-bold bg-primary-50 px-2.5 py-1 rounded-full">
                    {prod.categoria?.nombre || 'Sin categoría'}
                  </span>

                  <h3
                    className="font-bold text-gray-900 mt-3 line-clamp-2 text-sm leading-snug min-h-[40px] cursor-pointer hover:text-primary-700 transition-colors"
                    onClick={() => setProductoDetalle(prod)}
                  >
                    {prod.nombre}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-primary-700">
                      S/. {precioMostrar(prod).toFixed(2)}
                    </span>

                    {prod.precioOferta && (
                      <span className="text-sm text-gray-400 line-through">
                        S/. {Number(prod.precioVenta).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    {sinStock ? (
                      <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                        🚫 Sin stock
                      </span>
                    ) : stockBajo ? (
                      <span className="inline-flex items-center text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                        ⚡ Últimas {prod.stock} unidades
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        ✅ Stock: {prod.stock}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => handleAgregar(e, prod)}
                      disabled={sinStock}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                        sinStock
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-100 active:scale-[0.98]'
                      }`}
                    >
                      {sinStock ? 'Sin stock' : '🛒 Agregar'}
                    </button>

                    <button
                      onClick={() =>
                        setProductoResena({
                          id: prod.id,
                          nombre: prod.nombre,
                        })
                      }
                      className="w-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      title="Ver reseñas"
                    >
                      ⭐
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {productoDetalle && (
        <ProductDetailModal
          producto={productoDetalle}
          onClose={() => setProductoDetalle(null)}
          onAgregar={() => {
            if (!usuario) {
              toast.error('Debes iniciar sesión para agregar al carrito')
              return
            }

            if (productoDetalle.stock <= 0) {
              toast.error('Producto sin stock disponible')
              return
            }

            agregarItem(productoDetalle.id, 1)
          }}
        />
      )}

      {/* Modal de reseñas */}
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
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="btn-secondary px-4 py-2"
          >
            ← Anterior
          </button>

          <span className="flex items-center px-4 text-sm text-gray-600">
            Página {pagina} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="btn-secondary px-4 py-2"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
