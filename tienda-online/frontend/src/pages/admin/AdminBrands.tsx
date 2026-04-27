// =============================================
// PÁGINA ADMIN: GESTIÓN DE MARCAS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Marca {
  id: number; nombre: string; slug: string; descripcion: string | null; imagen: string | null
  activo: boolean; _count: { productos: number };
  categorias: { id: number; nombre: string }[]
}

interface Categoria {
  id: number; nombre: string
}

const VACIO = { nombre: '', descripcion: '', imagen: '', categoriaIds: [] as number[] }

export default function AdminBrands() {
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState<Marca | null>(null)
  const [form,       setForm]       = useState({ ...VACIO })
  const [guardando,  setGuardando]  = useState(false)
  const [subiendo,   setSubiendo]   = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [rBrands, rCats] = await Promise.all([
        api.get('/admin/brands'),
        api.get('/products/categories')
      ])
      setMarcas(rBrands.data.data)
      setCategorias(rCats.data.data)
    } catch { toast.error('Error al cargar datos') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirCrear = () => { setEditando(null); setForm({ ...VACIO }); setModal(true) }
  const abrirEditar = (m: Marca) => {
    setEditando(m)
    setForm({ 
      nombre: m.nombre, 
      descripcion: m.descripcion || '', 
      imagen: m.imagen || '',
      categoriaIds: m.categorias.map(c => c.id)
    })
    setModal(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setGuardando(true)
    try {
      if (editando) {
        await api.put(`/admin/brands/${editando.id}`, form)
        toast.success('Marca actualizada')
      } else {
        await api.post('/admin/brands', form)
        toast.success('Marca creada')
      }
      setModal(false); cargar()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar'
      toast.error(msg)
    } finally { setGuardando(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validación frontal
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Use JPG, PNG o WEBP')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máx 2MB)')
      return
    }

    const formData = new FormData()
    formData.append('logo', file)

    setSubiendo(true)
    try {
      const { data } = await api.post('/admin/brands/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setForm(f => ({ ...f, imagen: data.data.url }))
      toast.success('Logo subido correctamente')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al subir el logo'
      toast.error(msg)
    } finally {
      setSubiendo(false)
      // Limpiar el input para permitir subir el mismo archivo si se desea
      e.target.value = ''
    }
  }

  // Fallback para imágenes que no cargan
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/200x200?text=Error+Logo'
  }

  const toggleCategoria = (id: number) => {
    setForm(f => ({
      ...f,
      categoriaIds: f.categoriaIds.includes(id)
        ? f.categoriaIds.filter(cid => cid !== id)
        : [...f.categoriaIds, id]
    }))
  }

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Desactivar la marca "${nombre}"?`)) return
    try {
      await api.delete(`/admin/brands/${id}`)
      toast.success('Marca desactivada')
      cargar()
    } catch { /* manejado */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Marcas</h1>
          <p className="text-sm text-gray-500 mt-1">{marcas.length} marcas en total</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary text-sm">+ Nueva marca</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cargando ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-28"/>
          ))
        ) : marcas.map((marca) => (
          <div key={marca.id} className={`bg-white rounded-xl border shadow-sm p-5 ${marca.activo ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                {marca.imagen && (
                  <img 
                    src={marca.imagen} 
                    alt={marca.nombre} 
                    onError={handleImageError}
                    className="w-12 h-12 rounded-lg object-contain border border-gray-100 bg-white" 
                  />
                )}
                <div>
                  <h3 className="font-bold text-gray-900">{marca.nombre}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{marca.slug}</p>
                  {marca.descripcion && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{marca.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="badge bg-primary-50 text-primary-700 text-xs">
                      📦 {marca._count.productos} productos
                    </span>
                    <span className={`badge text-xs ${marca.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {marca.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-3">
                <button onClick={() => abrirEditar(marca)}
                  className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                  Editar
                </button>
                {marca.activo && marca._count.productos === 0 && (
                  <button onClick={() => handleEliminar(marca.id, marca.nombre)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editando ? 'Editar marca' : 'Nueva marca'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="input-field text-sm" placeholder="Ej: Nike, Apple..."/>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Logo de marca</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                    {form.imagen ? (
                      <img 
                        src={form.imagen} 
                        alt="Preview" 
                        onError={handleImageError}
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <span className="text-2xl text-gray-300">🖼️</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleFileUpload} id="logo-upload" className="hidden" />
                    <label htmlFor="logo-upload" className={`btn-secondary text-xs cursor-pointer inline-block ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
                      {subiendo ? 'Subiendo...' : 'Subir logo'}
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Asociar con categorías</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-100 rounded-lg">
                  {categorias.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => toggleCategoria(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                        form.categoriaIds.includes(cat.id)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="input-field text-sm h-20 resize-none"
                  placeholder="Descripción de la marca..."/>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
