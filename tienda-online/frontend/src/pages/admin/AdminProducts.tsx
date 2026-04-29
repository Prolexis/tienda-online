// =============================================
// PÁGINA ADMIN: GESTIÓN DE PRODUCTOS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { getImageUrl } from '../../utils/imageUrl'

interface ImagenProducto {
  url: string
  esPrincipal: boolean
  orden: number
}

interface Producto {
  id: number
  sku: string
  nombre: string
  descripcion?: string | null
  imagen?: string | null
  precioVenta: number
  precioOferta: number | null
  stock: number
  stockMinimo: number
  activo: boolean
  destacado: boolean
  categoria: {
    nombre: string
  }
  marca?: {
    nombre: string
  } | null
  imagenes?: ImagenProducto[]
}

interface Categoria {
  id: number
  nombre: string
}

interface Marca {
  id: number
  nombre: string
}

const VACIO = {
  categoriaId: 0,
  marcaId: 0,
  sku: '',
  nombre: '',
  descripcion: '',
  precioVenta: '',
  precioOferta: '',
  precioCompra: '',
  stock: '0',
  stockMinimo: '5',
  destacado: false,
  imagen: '',
  imagenes: [] as ImagenProducto[],
}

export default function AdminProducts() {
  const { usuario } = useAuthStore()
  const roles = usuario?.roles ?? []

  const puedeCrear = roles.some((r) =>
    ['ADMIN', 'GERENTE_INVENTARIO'].includes(r)
  )
  const puedeEditar = roles.some((r) =>
    ['ADMIN', 'GERENTE_INVENTARIO'].includes(r)
  )
  const puedeEliminar = roles.includes('ADMIN')

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPags, setTotalPags] = useState(1)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState({ ...VACIO })
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)

    try {
      const { data } = await api.get('/admin/products', {
        params: {
          pagina,
          porPagina: 15,
          busqueda: busqueda || undefined,
        },
      })

      setProductos(data.data || [])
      setTotalPags(data.meta?.totalPaginas || 1)
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [pagina, busqueda])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    api
      .get('/products/categories')
      .then(({ data }) => setCategorias(data.data || []))
      .catch(() => toast.error('Error al cargar categorías'))

    api
      .get('/products/brands')
      .then(({ data }) => setMarcas(data.data || []))
      .catch(() => toast.error('Error al cargar marcas'))
  }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...VACIO, imagenes: [] })
    setModal(true)
  }

  const obtenerImagenPrincipal = (imagenes?: ImagenProducto[], imagen?: string | null) => {
    return imagenes?.find((img) => img.esPrincipal)?.url || imagen || ''
  }

  const abrirEditar = (producto: Producto) => {
    const imagenes = producto.imagenes || []
    const imagenPrincipal = obtenerImagenPrincipal(imagenes, producto.imagen)

    setEditando(producto)

    setForm({
      categoriaId:
        categorias.find((c) => c.nombre === producto.categoria.nombre)?.id || 0,
      marcaId: producto.marca
        ? marcas.find((m) => m.nombre === producto.marca?.nombre)?.id || 0
        : 0,
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      imagen: imagenPrincipal,
      imagenes,
      precioVenta: String(producto.precioVenta ?? ''),
      precioOferta: producto.precioOferta?.toString() || '',
      precioCompra: '',
      stock: producto.stock.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      destacado: producto.destacado,
    })

    setModal(true)
  }

  const normalizarImagenes = (imagenes: ImagenProducto[]) => {
    if (imagenes.length === 0) return []

    const existePrincipal = imagenes.some((img) => img.esPrincipal)

    return imagenes.map((img, index) => ({
      ...img,
      orden: index,
      esPrincipal: existePrincipal ? img.esPrincipal : index === 0,
    }))
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.sku || !form.precioVenta || !form.categoriaId) {
      toast.error('Completa los campos obligatorios')
      return
    }

    const imagenesNormalizadas = normalizarImagenes(form.imagenes)
    const imagenPrincipal = obtenerImagenPrincipal(imagenesNormalizadas, form.imagen)

    const payload = {
      categoriaId: Number(form.categoriaId),
      marcaId: form.marcaId ? Number(form.marcaId) : undefined,
      sku: form.sku.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || undefined,
      imagen: imagenPrincipal || undefined,
      imagenes: imagenesNormalizadas.length > 0 ? imagenesNormalizadas : undefined,
      precioVenta: Number(form.precioVenta),
      precioOferta: form.precioOferta ? Number(form.precioOferta) : undefined,
      precioCompra: form.precioCompra ? Number(form.precioCompra) : undefined,
      stock: Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
      destacado: form.destacado,
    }

    setGuardando(true)

    try {
      if (editando) {
        await api.put(`/products/${editando.id}`, payload)
        toast.success('Producto actualizado correctamente')
      } else {
        await api.post('/products', payload)
        toast.success('Producto creado correctamente')
      }

      setModal(false)
      setEditando(null)
      setForm({ ...VACIO, imagenes: [] })
      cargar()
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'No se pudo guardar el producto'

      toast.error(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return

    try {
      await api.delete(`/products/${id}`)
      toast.success('Producto eliminado')
      cargar()
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.message ||
        'No se pudo eliminar el producto'

      toast.error(mensaje)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG o WEBP')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5 MB')
      e.target.value = ''
      return
    }

    if (form.imagenes.length >= 8) {
      toast.error('Solo puedes subir hasta 8 imágenes')
      e.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('imagen', file)

    setSubiendo(true)

    try {
      const { data } = await api.post('/admin/products/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const url = data?.data?.url

      if (!url) {
        toast.error('El servidor no devolvió la URL de la imagen')
        return
      }

      setForm((prev) => {
        const yaTienePrincipal = prev.imagenes.some((img) => img.esPrincipal)

        const nuevaImagen: ImagenProducto = {
          url,
          esPrincipal: !yaTienePrincipal && prev.imagenes.length === 0,
          orden: prev.imagenes.length,
        }

        const nuevasImagenes = normalizarImagenes([
          ...prev.imagenes,
          nuevaImagen,
        ])

        const principal = obtenerImagenPrincipal(nuevasImagenes, url)

        return {
          ...prev,
          imagen: principal,
          imagenes: nuevasImagenes,
        }
      })

      toast.success('Imagen subida correctamente')
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Error al subir la imagen'

      toast.error(mensaje)
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  const establecerPrincipal = (index: number) => {
    setForm((prev) => {
      const nuevasImagenes = prev.imagenes.map((img, i) => ({
        ...img,
        esPrincipal: i === index,
        orden: i,
      }))

      return {
        ...prev,
        imagen: nuevasImagenes[index]?.url || '',
        imagenes: nuevasImagenes,
      }
    })

    toast.success('Imagen principal actualizada')
  }

  const quitarImagen = (index: number) => {
    setForm((prev) => {
      const nuevasImagenes = prev.imagenes
        .filter((_, i) => i !== index)
        .map((img, i) => ({
          ...img,
          orden: i,
          esPrincipal: i === 0,
        }))

      return {
        ...prev,
        imagen: nuevasImagenes[0]?.url || '',
        imagenes: nuevasImagenes,
      }
    })

    toast.success('Imagen eliminada')
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src =
      'https://placehold.co/400x300/e5e7eb/64748b?text=Sin+imagen'
  }

  const campo = (
    key: keyof typeof form,
    label: string,
    tipo = 'text',
    requerido = false,
    placeholder = ''
  ) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {requerido && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <input
        type={tipo}
        value={form[key] as string}
        onChange={(e) =>
          setForm((actual) => ({
            ...actual,
            [key]: e.target.value,
          }))
        }
        className="input-field text-sm"
        placeholder={placeholder}
      />
    </div>
  )

  const renderEstadoStock = (producto: Producto) => {
    if (producto.stock === 0) {
      return (
        <span className="font-semibold text-red-600">
          {producto.stock} <span className="text-xs">Agotado</span>
        </span>
      )
    }

    if (producto.stock <= producto.stockMinimo) {
      return (
        <span className="font-semibold text-orange-500">
          {producto.stock} <span className="text-xs">⚠️ Bajo</span>
        </span>
      )
    }

    return <span className="font-semibold text-gray-900">{producto.stock}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestión de Productos
          </h1>

          {!puedeCrear && (
            <p className="text-xs text-gray-500 mt-1">
              👁️ Solo lectura — no tienes permisos para modificar productos
            </p>
          )}
        </div>

        {puedeCrear && (
          <button onClick={abrirCrear} className="btn-primary text-sm">
            + Nuevo producto
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="mb-5">
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPagina(1)
          }}
          placeholder="Buscar por nombre o SKU..."
          className="input-field max-w-sm"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Imagen',
                  'SKU',
                  'Producto',
                  'Categoría',
                  'Marca',
                  'Precio',
                  'Stock',
                  'Estado',
                  ...(puedeEditar ? ['Acciones'] : []),
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                productos.map((producto) => {
                  const imagenPrincipal = obtenerImagenPrincipal(
                    producto.imagenes,
                    producto.imagen
                  )

                  return (
                    <tr
                      key={producto.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={getImageUrl(imagenPrincipal)}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {producto.sku}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[220px]">
                          {producto.nombre}
                        </div>

                        {producto.destacado && (
                          <span className="text-xs text-yellow-600">
                            ⭐ Destacado
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {producto.categoria.nombre}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {producto.marca?.nombre || '-'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-primary-700">
                          S/. {Number(producto.precioVenta).toFixed(2)}
                        </div>

                        {producto.precioOferta && (
                          <div className="text-xs text-green-600">
                            Oferta: S/. {Number(producto.precioOferta).toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {renderEstadoStock(producto)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            producto.activo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {puedeEditar && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => abrirEditar(producto)}
                              className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                            >
                              Editar
                            </button>

                            {puedeEliminar && (
                              <button
                                onClick={() =>
                                  handleEliminar(producto.id, producto.nombre)
                                }
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            ←
          </button>

          <span className="flex items-center px-3 text-sm text-gray-600">
            {pagina} / {totalPags}
          </span>

          <button
            onClick={() => setPagina((p) => Math.min(totalPags, p + 1))}
            disabled={pagina === totalPags}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            →
          </button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !guardando && !subiendo) {
              setModal(false)
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editando ? 'Editar producto' : 'Nuevo producto'}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Sube imágenes, define la principal y guarda el producto.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(false)}
                disabled={guardando || subiendo}
                className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Categoría <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={form.categoriaId}
                    onChange={(e) =>
                      setForm((actual) => ({
                        ...actual,
                        categoriaId: Number(e.target.value),
                      }))
                    }
                    className="input-field text-sm"
                  >
                    <option value={0}>Selecciona una categoría</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Marca
                  </label>

                  <select
                    value={form.marcaId}
                    onChange={(e) =>
                      setForm((actual) => ({
                        ...actual,
                        marcaId: Number(e.target.value),
                      }))
                    }
                    className="input-field text-sm"
                  >
                    <option value={0}>Sin marca</option>
                    {marcas.map((marca) => (
                      <option key={marca.id} value={marca.id}>
                        {marca.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campo('sku', 'SKU', 'text', true, 'PROD-001')}
                {campo('nombre', 'Nombre', 'text', true, 'Nombre del producto')}
              </div>

              {campo('descripcion', 'Descripción', 'text', false, 'Descripción breve...')}

              {/* Galería de imágenes */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Galería de imágenes
                    </label>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Puedes subir hasta 8 imágenes. La principal se usará como portada.
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {form.imagenes.length}/8
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                  {form.imagenes.map((img, index) => (
                    <div
                      key={`${img.url}-${index}`}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm"
                    >
                      <img
                        src={getImageUrl(img.url)}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />

                      {img.esPrincipal && (
                        <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-[9px] font-extrabold text-white px-2 py-0.5 rounded-full shadow-sm">
                          PRINCIPAL
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => establecerPrincipal(index)}
                          title="Establecer como principal"
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow ${
                            img.esPrincipal
                              ? 'bg-yellow-400 text-white'
                              : 'bg-white text-gray-700 hover:bg-yellow-50'
                          }`}
                        >
                          ⭐
                        </button>

                        <button
                          type="button"
                          onClick={() => quitarImagen(index)}
                          title="Eliminar imagen"
                          className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm shadow hover:bg-red-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  {form.imagenes.length < 8 && (
                    <label
                      htmlFor="product-upload"
                      className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                        subiendo
                          ? 'border-primary-300 bg-primary-50 cursor-wait'
                          : 'border-gray-200 bg-white cursor-pointer hover:border-primary-400 hover:bg-primary-50'
                      }`}
                    >
                      {subiendo ? (
                        <>
                          <svg
                            className="animate-spin h-6 w-6 text-primary-600 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>

                          <span className="text-[11px] text-primary-600 font-semibold">
                            Subiendo...
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl text-gray-300 leading-none">
                            +
                          </span>
                          <span className="text-[11px] text-gray-400 font-semibold mt-1">
                            Subir
                          </span>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        id="product-upload"
                        className="hidden"
                        disabled={subiendo}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campo('precioVenta', 'Precio venta (S/.)', 'number', true, '0.00')}
                {campo('precioOferta', 'Precio oferta (S/.)', 'number', false, 'Opcional')}
                {campo('precioCompra', 'Precio compra (S/.)', 'number', false, 'Opcional')}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campo('stock', 'Stock actual', 'number', false, '0')}
                {campo('stockMinimo', 'Stock mínimo', 'number', false, '5')}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.destacado}
                  onChange={(e) =>
                    setForm((actual) => ({
                      ...actual,
                      destacado: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-gray-700">Producto destacado</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModal(false)}
                disabled={guardando || subiendo}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando || subiendo}
                className="btn-primary flex-1"
              >
                {guardando
                  ? 'Guardando...'
                  : editando
                    ? 'Actualizar'
                    : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
