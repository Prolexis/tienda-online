// =============================================
// PÁGINA ADMIN: GESTIÓN DE CATEGORÍAS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Categoria {
  id: number; nombre: string; slug: string; descripcion: string | null
  activo: boolean; _count: { productos: number }
}

const VACIO = { nombre: '', descripcion: '' }

export default function AdminCategories() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState<Categoria | null>(null)
  const [form,       setForm]       = useState({ ...VACIO })
  const [guardando,  setGuardando]  = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/categories')
      setCategorias(data.data)
    } catch { toast.error('Error al cargar categorías') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirCrear = () => { setEditando(null); setForm({ ...VACIO }); setModal(true) }
  const abrirEditar = (c: Categoria) => {
    setEditando(c)
    setForm({ nombre: c.nombre, descripcion: c.descripcion || '' })
    setModal(true)
  }

  const handleGuardar = async () => {
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setGuardando(true)
    try {
      if (editando) {
        await api.put(`/admin/categories/${editando.id}`, form)
        toast.success('Categoría actualizada')
      } else {
        await api.post('/admin/categories', form)
        toast.success('Categoría creada')
      }
      setModal(false); cargar()
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Desactivar la categoría "${nombre}"?`)) return
    try {
      await api.delete(`/admin/categories/${id}`)
      toast.success('Categoría desactivada')
      cargar()
    } catch { /* manejado */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">{categorias.length} categorías en total</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary text-sm">+ Nueva categoría</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cargando ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-28"/>
          ))
        ) : categorias.map((cat) => (
          <div key={cat.id} className={`bg-white rounded-xl border shadow-sm p-5 ${cat.activo ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{cat.nombre}</h3>
                <p className="text-xs text-gray-400 mt-0.5">/{cat.slug}</p>
                {cat.descripcion && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.descripcion}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="badge bg-primary-50 text-primary-700 text-xs">
                    📦 {cat._count.productos} productos
                  </span>
                  <span className={`badge text-xs ${cat.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {cat.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-3">
                <button onClick={() => abrirEditar(cat)}
                  className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                  Editar
                </button>
                {cat.activo && cat._count.productos === 0 && (
                  <button onClick={() => handleEliminar(cat.id, cat.nombre)}
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
              {editando ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="input-field text-sm" placeholder="Ej: Electrónica"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="input-field text-sm h-20 resize-none"
                  placeholder="Descripción de la categoría..."/>
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