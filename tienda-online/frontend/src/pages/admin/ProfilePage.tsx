// =============================================
// PÁGINA: PERFIL DEL CLIENTE
// =============================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Direccion {
  id: number; alias: string; nombre: string; apellido: string
  direccion: string; ciudad: string; departamento: string
  codigoPostal: string; telefono: string; esPrincipal: boolean
}

interface AddressForm {
  alias: string; nombre: string; apellido: string; direccion: string
  ciudad: string; departamento: string; codigoPostal: string; telefono: string
  esPrincipal: boolean
}

interface Perfil {
  id: number; nombre: string; apellido: string; email: string
  telefono: string | null; activo: boolean; createdAt: string
  roles: Array<{ rol: { nombre: string } }>
  cliente: {
    totalGastado: number; cantidadOrdenes: number; segmento: string
    direcciones: Direccion[]
  } | null
}

const SEGMENTO_COLORES: Record<string, string> = {
  nuevo:      'bg-blue-100 text-blue-700',
  recurrente: 'bg-green-100 text-green-700',
  vip:        'bg-yellow-100 text-yellow-700',
  inactivo:   'bg-red-100 text-red-700',
}

const SEGMENTO_ICONOS: Record<string, string> = {
  nuevo: '🌱', recurrente: '⭐', vip: '👑', inactivo: '💤',
}

export default function ProfilePage() {
  const [perfil,    setPerfil]    = useState<Perfil | null>(null)
  const [cargando,  setCargando]  = useState(true)
  const [editando,  setEditando]  = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form,      setForm]      = useState({ nombre: '', apellido: '', telefono: '' })

  // Estados para gestión de direcciones
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState<AddressForm>({
    alias: '', nombre: '', apellido: '', direccion: '',
    ciudad: 'Lima', departamento: 'Lima', codigoPostal: '', telefono: '',
    esPrincipal: false
  })

  const cargarPerfil = async () => {
    try {
      const { data } = await api.get('/auth/profile')
      setPerfil(data.data)
      setForm({
        nombre:   data.data.nombre,
        apellido: data.data.apellido,
        telefono: data.data.telefono || '',
      })
    } catch { toast.error('Error al cargar el perfil') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarPerfil() }, [])

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellido) {
      toast.error('Nombre y apellido son obligatorios'); return
    }
    setGuardando(true)
    try {
      const { data } = await api.put('/auth/profile', form)
      setPerfil((p) => p ? { ...p, ...data.data } : p)
      toast.success('Perfil actualizado correctamente')
      setEditando(false)
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  // Lógica de direcciones
  const handleSaveAddress = async () => {
    try {
      if (editingAddress) {
        await api.put(`/address/${editingAddress}`, addressForm)
        toast.success('Dirección actualizada')
      } else {
        await api.post('/address', addressForm)
        toast.success('Dirección agregada')
      }
      setShowAddressForm(false)
      setEditingAddress(null)
      cargarPerfil()
    } catch { toast.error('Error al guardar dirección') }
  }

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('¿Eliminar esta dirección?')) return
    try {
      await api.delete(`/address/${id}`)
      toast.success('Dirección eliminada')
      cargarPerfil()
    } catch { toast.error('Error al eliminar') }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await api.patch(`/address/${id}/default`)
      toast.success('Dirección predeterminada actualizada')
      cargarPerfil()
    } catch { toast.error('Error al actualizar') }
  }

  const openEditAddress = (dir: Direccion) => {
    setAddressForm({
      alias: dir.alias, nombre: dir.nombre, apellido: dir.apellido,
      direccion: dir.direccion, ciudad: dir.ciudad, departamento: dir.departamento,
      codigoPostal: dir.codigoPostal || '', telefono: dir.telefono,
      esPrincipal: dir.esPrincipal
    })
    setEditingAddress(dir.id)
    setShowAddressForm(true)
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )

  if (!perfil) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      <div className="space-y-6">

        {/* Tarjeta de perfil */}
        <div className="card">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {perfil.nombre[0]}{perfil.apellido[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{perfil.nombre} {perfil.apellido}</h2>
                <p className="text-gray-500 text-sm">{perfil.email}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-xs ${perfil.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {perfil.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className={`badge text-xs ${perfil.roles.some(r => r.rol.nombre === 'ADMIN') ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}>
                      {perfil.roles.map(r => r.rol.nombre).join(', ')}
                    </span>
                  {perfil.cliente && (
                    <span className={`badge text-xs ${SEGMENTO_COLORES[perfil.cliente.segmento] || 'bg-gray-100 text-gray-600'}`}>
                      {SEGMENTO_ICONOS[perfil.cliente.segmento]} {perfil.cliente.segmento}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!editando && (
              <button onClick={() => setEditando(true)} className="btn-secondary text-sm">
                ✏️ Editar
              </button>
            )}
          </div>

          {/* Datos del perfil */}
          {editando ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="input-field text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input value={form.apellido}
                    onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                    className="input-field text-sm"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="input-field text-sm" placeholder="+51 999 999 999"/>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setEditando(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
                  {guardando ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Nombre completo</p>
                <p className="font-medium text-gray-900">{perfil.nombre} {perfil.apellido}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="font-medium text-gray-900">{perfil.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                <p className="font-medium text-gray-900">{perfil.telefono || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Miembro desde</p>
                <p className="font-medium text-gray-900">
                  {new Date(perfil.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas del cliente */}
        {perfil.cliente && (
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-700">{perfil.cliente.cantidadOrdenes}</p>
              <p className="text-xs text-gray-500 mt-1">Órdenes realizadas</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">
                S/. {Number(perfil.cliente.totalGastado).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total gastado</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl">{SEGMENTO_ICONOS[perfil.cliente.segmento]}</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{perfil.cliente.segmento}</p>
              <p className="text-xs text-gray-500">Segmento</p>
            </div>
          </div>
        )}

        {/* Direcciones guardadas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">📍 Mis direcciones</h3>
            <button
              onClick={() => {
                setEditingAddress(null)
                setAddressForm({
                  alias: '', nombre: perfil.nombre, apellido: perfil.apellido,
                  direccion: '', ciudad: 'Lima', departamento: 'Lima',
                  codigoPostal: '', telefono: perfil.telefono || '', esPrincipal: false
                })
                setShowAddressForm(true)
              }}
              className="text-primary-600 text-sm font-semibold hover:underline"
            >
              + Agregar nueva
            </button>
          </div>

          {showAddressForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="font-bold text-sm text-gray-700">{editingAddress ? 'Editar' : 'Nueva'} Dirección</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Alias (ej: Casa, Trabajo)</label>
                  <input value={addressForm.alias} onChange={e => setAddressForm({...addressForm, alias: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Nombre</label>
                  <input value={addressForm.nombre} onChange={e => setAddressForm({...addressForm, nombre: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Apellido</label>
                  <input value={addressForm.apellido} onChange={e => setAddressForm({...addressForm, apellido: e.target.value})} className="input-field text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Dirección</label>
                  <input value={addressForm.direccion} onChange={e => setAddressForm({...addressForm, direccion: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Ciudad</label>
                  <input value={addressForm.ciudad} onChange={e => setAddressForm({...addressForm, ciudad: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Departamento</label>
                  <input value={addressForm.departamento} onChange={e => setAddressForm({...addressForm, departamento: e.target.value})} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Teléfono</label>
                  <input value={addressForm.telefono} onChange={e => setAddressForm({...addressForm, telefono: e.target.value})} className="input-field text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="esPrincipal" checked={addressForm.esPrincipal} onChange={e => setAddressForm({...addressForm, esPrincipal: e.target.checked})} />
                  <label htmlFor="esPrincipal" className="text-xs text-gray-600">Establecer como principal</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAddressForm(false)} className="btn-secondary text-xs flex-1">Cancelar</button>
                <button onClick={handleSaveAddress} className="btn-primary text-xs flex-1">Guardar</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {perfil.cliente?.direcciones && perfil.cliente.direcciones.length > 0 ? (
              perfil.cliente.direcciones.map((dir) => (
                <div key={dir.id}
                  className={`p-4 rounded-xl border-2 transition-all ${dir.esPrincipal ? 'border-primary-200 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{dir.alias}</span>
                      {dir.esPrincipal && (
                        <span className="badge bg-primary-100 text-primary-700 text-[10px] px-1.5 py-0">Principal</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!dir.esPrincipal && (
                        <button onClick={() => handleSetDefault(dir.id)} className="text-[10px] text-primary-600 font-bold hover:underline">Principal</button>
                      )}
                      <button onClick={() => openEditAddress(dir)} className="text-[10px] text-gray-500 font-bold hover:underline">Editar</button>
                      <button onClick={() => handleDeleteAddress(dir.id)} className="text-[10px] text-red-500 font-bold hover:underline">Eliminar</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{dir.nombre} {dir.apellido}</p>
                  <p className="text-sm text-gray-500">{dir.direccion}</p>
                  <p className="text-sm text-gray-500">{dir.ciudad}, {dir.departamento}</p>
                  <p className="text-xs text-gray-400 mt-1">📞 {dir.telefono}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 italic">No tienes direcciones guardadas.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}