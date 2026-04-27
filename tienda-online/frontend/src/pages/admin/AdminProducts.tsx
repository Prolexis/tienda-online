// =============================================
// PÁGINA ADMIN: GESTIÓN DE PRODUCTOS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

interface Producto {
  id: number; sku: string; nombre: string; precioVenta: number
  precioOferta: number | null; stock: number; stockMinimo: number
  activo: boolean; destacado: boolean; 
  categoria: { nombre: string };
  marca?: { nombre: string } | null;
  imagenes?: { url: string, esPrincipal: boolean, orden: number }[];
}
interface Categoria { id: number; nombre: string }
interface Marca { id: number; nombre: string }

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
  imagenes: [] as { url: string, esPrincipal: boolean, orden: number }[]
}

export default function AdminProducts() {
  const { usuario } = useAuthStore()
  const roles = usuario?.roles ?? []

  // Permisos por rol
  const puedeCrear   = roles.some((r) => ['ADMIN', 'GERENTE_INVENTARIO'].includes(r))
  const puedeEditar  = roles.some((r) => ['ADMIN', 'GERENTE_INVENTARIO'].includes(r))
  const puedeEliminar = roles.includes('ADMIN')

  const [productos,  setProductos]  = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas,     setMarcas]     = useState<Marca[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [pagina,     setPagina]     = useState(1)
  const [totalPags,  setTotalPags]  = useState(1)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState<Producto | null>(null)
  const [form,       setForm]       = useState({ ...VACIO })
  const [guardando,  setGuardando]  = useState(false)
  const [subiendo,   setSubiendo]   = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/products', { params: { pagina, porPagina: 15, busqueda: busqueda || undefined } })
      setProductos(data.data)
      setTotalPags(data.meta.totalPaginas)
    } catch { toast.error('Error al cargar productos') }
    finally { setCargando(false) }
  }, [pagina, busqueda])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { 
    api.get('/products/categories').then(({ data }) => setCategorias(data.data))
    api.get('/products/brands').then(({ data }) => setMarcas(data.data))
  }, [])

  const abrirCrear = () => { setEditando(null); setForm({ ...VACIO }); setModal(true) }
  const abrirEditar = (p: Producto) => {
    setEditando(p)
    setForm({
      categoriaId: categorias.find((c) => c.nombre === p.categoria.nombre)?.id || 0,
      marcaId: p.marca ? (marcas.find((m) => m.nombre === p.marca?.nombre)?.id || 0) : 0,
      sku: p.sku, nombre: p.nombre, descripcion: '', imagen: p.imagenes?.find(img => img.esPrincipal)?.url || '',
      imagenes: p.imagenes || [],
      precioVenta: p.precioVenta.toString(), precioOferta: p.precioOferta?.toString() || '',
      precioCompra: '', stock: p.stock.toString(), stockMinimo: p.stockMinimo.toString(),
      destacado: p.destacado,
    })
    setModal(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.sku || !form.precioVenta || !form.categoriaId) {
      toast.error('Completa los campos obligatorios'); return
    }
    setGuardando(true)
    const payload = {
      categoriaId: Number(form.categoriaId), 
      marcaId: form.marcaId ? Number(form.marcaId) : undefined,
      sku: form.sku, nombre: form.nombre,
      descripcion: form.descripcion || undefined, 
      imagenes: form.imagenes.length > 0 ? form.imagenes : undefined,
      precioVenta: Number(form.precioVenta),
      precioOferta: form.precioOferta ? Number(form.precioOferta) : undefined,
      precioCompra: form.precioCompra ? Number(form.precioCompra) : undefined,
      stock: Number(form.stock), stockMinimo: Number(form.stockMinimo), destacado: form.destacado,
    }
    try {
      if (editando) {
        await api.put(`/products/${editando.id}`, payload)
        toast.success('Producto actualizado')
      } else {
        await api.post('/products', payload)
        toast.success('Producto creado')
      }
      setModal(false); cargar()
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    try { await api.delete(`/products/${id}`); toast.success('Producto eliminado'); cargar() }
    catch { /* manejado */ }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Use JPG, PNG o WEBP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx 5MB)')
      return
    }

    const formData = new FormData()
    formData.append('imagen', file)

    setSubiendo(true)
    try {
      const { data } = await api.post('/admin/products/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const nuevaImagen = { 
        url: data.data.url, 
        esPrincipal: form.imagenes.length === 0, 
        orden: form.imagenes.length 
      }
      setForm(f => ({ 
        ...f, 
        imagenes: [...f.imagenes, nuevaImagen] 
      }))
      toast.success('Imagen subida correctamente')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al subir la imagen'
      toast.error(msg)
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/400x300/e5e7eb/9ca3af?text=Error+imagen'
  }

  const campo = (key: keyof typeof form, label: string, tipo = 'text', requerido = false, placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}{requerido && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={tipo} value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="input-field text-sm" placeholder={placeholder}/>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Productos</h1>
          {!puedeCrear && (
            <p className="text-xs text-gray-500 mt-1">👁️ Solo lectura — no tienes permisos para modificar productos</p>
          )}
        </div>
        {puedeCrear && (
          <button onClick={abrirCrear} className="btn-primary text-sm">+ Nuevo producto</button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="mb-5">
        <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
          placeholder="Buscar por nombre o SKU..." className="input-field max-w-sm"/>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['SKU', 'Producto', 'Categoría', 'Marca', 'Precio', 'Stock', 'Estado', ...(puedeEditar ? ['Acciones'] : [])].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                ))
              ) : productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">{p.nombre}</div>
                    {p.destacado && <span className="text-xs text-yellow-600">⭐ Destacado</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.categoria.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.marca?.nombre || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-primary-700">S/. {Number(p.precioVenta).toFixed(2)}</div>
                    {p.precioOferta && <div className="text-xs text-green-600">Oferta: S/. {Number(p.precioOferta).toFixed(2)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock <= p.stockMinimo ? 'text-orange-500' : 'text-gray-900'}`}>
                      {p.stock}
                    </span>
                    {p.stock <= p.stockMinimo && p.stock > 0 && <span className="ml-1 text-xs text-orange-500">⚠️</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {puedeEditar && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(p)} className="text-primary-600 hover:text-primary-800 text-xs font-medium">Editar</button>
                        {puedeEliminar && (
                          <button onClick={() => handleEliminar(p.id, p.nombre)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary px-3 py-1.5 text-sm">←</button>
          <span className="flex items-center px-3 text-sm text-gray-600">{pagina} / {totalPags}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="btn-secondary px-3 py-1.5 text-sm">→</button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                  <select value={form.categoriaId} onChange={(e) => setForm((f) => ({ ...f, categoriaId: Number(e.target.value) }))} className="input-field text-sm">
                    <option value={0}>Selecciona una categoría</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                  <select value={form.marcaId} onChange={(e) => setForm((f) => ({ ...f, marcaId: Number(e.target.value) }))} className="input-field text-sm">
                    <option value={0}>Sin marca</option>
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {campo('sku',    'SKU',    'text', true, 'PROD-001')}
                {campo('nombre', 'Nombre', 'text', true, 'Nombre del producto')}
              </div>
              {campo('descripcion', 'Descripción', 'text', false, 'Descripción breve...')}
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Galería de imágenes</label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {form.imagenes.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={img.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" onError={handleImageError} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            const nuevas = form.imagenes.map((i, j) => ({ ...i, esPrincipal: j === idx }))
                            setForm(f => ({ ...f, imagenes: nuevas }))
                          }}
                          title="Establecer como principal"
                          className={`p-1.5 rounded-full ${img.esPrincipal ? 'bg-yellow-400 text-white' : 'bg-white text-gray-700'}`}
                        >
                          ⭐
                        </button>
                        <button 
                          onClick={() => {
                            const nuevas = form.imagenes.filter((_, j) => j !== idx)
                              .map((i, j) => ({ ...i, orden: j }))
                            setForm(f => ({ ...f, imagenes: nuevas }))
                          }}
                          title="Eliminar"
                          className="p-1.5 rounded-full bg-red-500 text-white"
                        >
                          🗑️
                        </button>
                      </div>
                      {img.esPrincipal && (
                        <div className="absolute top-1 left-1 bg-yellow-400 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-sm">
                          PRINCIPAL
                        </div>
                      )}
                    </div>
                  ))}
                  {form.imagenes.length < 8 && (
                    <label htmlFor="product-upload" className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                      <span className="text-2xl text-gray-300">+</span>
                      <span className="text-[10px] text-gray-400 font-medium">Subir</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} id="product-upload" className="hidden" />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">Puedes subir hasta 8 imágenes. La primera será la principal por defecto.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {campo('precioVenta',  'Precio venta (S/.)',  'number', true, '0.00')}
                {campo('precioOferta', 'Precio oferta (S/.)', 'number', false, 'Opcional')}
                {campo('precioCompra', 'Precio compra (S/.)', 'number', false, 'Opcional')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {campo('stock',       'Stock actual',  'number', false, '0')}
                {campo('stockMinimo', 'Stock mínimo',  'number', false, '5')}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.destacado} onChange={(e) => setForm((f) => ({ ...f, destacado: e.target.checked }))} className="w-4 h-4 accent-primary-600"/>
                <span className="text-sm text-gray-700">Producto destacado</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}