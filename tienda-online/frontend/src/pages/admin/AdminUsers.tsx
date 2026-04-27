// =============================================
// PÁGINA ADMIN: GESTIÓN DE USUARIOS / CLIENTES
// =============================================

import { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'

interface Rol { id: number; nombre: string }
interface Usuario {
  id: number; nombre: string; apellido: string; email: string; activo: boolean; createdAt: string
  roles: Array<{ rol: { id: number; nombre: string } }>
  cliente: { totalGastado: number; cantidadOrdenes: number; segmento: string } | null
}

const SEGMENTO_COLORES: Record<string, string> = {
  nuevo:      'bg-blue-100 text-blue-700',
  recurrente: 'bg-green-100 text-green-700',
  vip:        'bg-yellow-100 text-yellow-700',
  inactivo:   'bg-red-100 text-red-700',
}

export default function AdminUsers() {
  const { usuario }     = useAuthStore()
  const roles           = usuario?.roles ?? []
  const esAdmin         = roles.includes('ADMIN')
  const esGerenteVentas = roles.includes('GERENTE_VENTAS')
  const esVendedor      = roles.includes('VENDEDOR')

  const [usuarios,      setUsuarios]      = useState<Usuario[]>([])
  const [rolesDisponibles, setRolesDisponibles] = useState<Rol[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [pagina,        setPagina]        = useState(1)
  const [totalPags,     setTotalPags]     = useState(1)
  const [busqueda,      setBusqueda]      = useState('')
  const [modalUsuario,  setModalUsuario]  = useState<Usuario | null>(null)
  const [rolSeleccionado, setRolSeleccionado] = useState<number>(0)
  const [guardando,     setGuardando]     = useState(false)

  const cargar = async (p = pagina) => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/users', { 
        params: { 
          pagina: p, 
          porPagina: 15,
          busqueda: busqueda || undefined
        } 
      })
      
      if (!data.success) throw new Error(data.message || 'Error desconocido')
      
      const filtrados = (esGerenteVentas || esVendedor) && !esAdmin
        ? data.data.filter((u: Usuario) => u.roles.some((r) => r.rol.nombre === 'CLIENTE'))
        : data.data
        
      setUsuarios(filtrados)
      setTotalPags(data.meta?.totalPaginas || 1)
    } catch (error: any) { 
      const msg = error.response?.data?.message || error.message || 'Error al cargar usuarios'
      toast.error(msg)
      console.error('Error loading users:', error)
    } finally { 
      setCargando(false) 
    }
  }

  const cargarRoles = async (intentos = 0) => {
    try {
      const { data } = await api.get('/admin/roles')
      setRolesDisponibles(data.data)
    } catch (error) {
      if (intentos < 2) {
        setTimeout(() => cargarRoles(intentos + 1), 2000)
      } else {
        toast.error('Error al cargar la lista de roles')
      }
    }
  }

  useEffect(() => { 
    const debounceTimer = setTimeout(() => {
      cargar(1)
      setPagina(1)
    }, 500)
    return () => clearTimeout(debounceTimer)
  }, [busqueda])

  useEffect(() => { cargar() }, [pagina])
  useEffect(() => { if (esAdmin) cargarRoles() }, [esAdmin])

  const abrirModal = (u: Usuario) => {
    setModalUsuario(u)
    setRolSeleccionado(u.roles[0]?.rol.id ?? 0)
  }

  const handleCambiarRol = async () => {
    if (!modalUsuario || !rolSeleccionado) { toast.error('Selecciona un rol'); return }
    setGuardando(true)
    try {
      await api.put(`/admin/users/${modalUsuario.id}/roles`, { rolId: rolSeleccionado })
      toast.success('Rol actualizado correctamente')
      setModalUsuario(null)
      cargar()
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  const handleToggleActivo = async (u: Usuario) => {
    const accion = u.activo ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Deseas ${accion} al usuario ${u.nombre} ${u.apellido}?`)) return
    try {
      await api.put(`/admin/users/${u.id}/toggle`, {})
      toast.success(`Usuario ${u.activo ? 'desactivado' : 'activado'}`)
      cargar()
    } catch { /* manejado */ }
  }

  const formatRol = (nombre: string) => {
    return nombre.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const titulo    = esAdmin ? 'Gestión de Usuarios' : 'Clientes'
  const subtitulo = esAdmin ? 'Administra usuarios y roles del sistema' : 'Visualización de clientes — solo lectura'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>
        {!esAdmin && (
          <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
            👁️ Solo puedes visualizar — no puedes modificar usuarios
          </span>
        )}
      </div>

      {/* Búsqueda */}
      <div className="mb-5">
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email..." className="input-field max-w-sm"/>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Usuario', 'Email', 'Rol', 'Segmento', 'Compras',
                  'Total gastado', 'Estado', 'Registro',
                  ...(esAdmin ? ['Acciones'] : [])
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                ))
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {u.nombre?.[0] || '?'}{u.apellido?.[0] || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{u.nombre} {u.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.roles.map((r) => (
                        <span key={r.rol?.nombre || Math.random()} className="badge bg-primary-100 text-primary-700 text-xs mr-1">
                          {r.rol?.nombre || 'Sin rol'}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      {u.cliente ? (
                        <span className={`badge text-xs ${SEGMENTO_COLORES[u.cliente.segmento] || 'bg-gray-100 text-gray-600'}`}>
                          {u.cliente.segmento}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-700">
                      {u.cliente?.cantidadOrdenes ?? 0}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary-700">
                      S/. {Number(u.cliente?.totalGastado ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => abrirModal(u)}
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                            Cambiar rol
                          </button>
                          <button onClick={() => handleToggleActivo(u)}
                            className={`text-xs font-medium ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPags > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary px-3 py-1.5 text-sm">←</button>
          <span className="flex items-center px-3 text-sm text-gray-600">{pagina} / {totalPags}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="btn-secondary px-3 py-1.5 text-sm">→</button>
        </div>
      )}

      {/* Modal cambiar rol */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalUsuario(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar rol</h2>
            <p className="text-sm text-gray-500 mb-5">
              Usuario: <span className="font-semibold text-gray-900">{modalUsuario.nombre} {modalUsuario.apellido}</span>
            </p>

            {/* Rol actual */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Rol actual:</p>
              <div className="flex gap-1">
                {modalUsuario.roles.map((r) => (
                  <span key={r.rol.nombre} className="badge bg-primary-100 text-primary-700 text-xs">
                    {r.rol.nombre}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Nuevo rol</label>
              <div className="grid grid-cols-1 gap-2">
                {rolesDisponibles.map((rol) => (
                  <label key={rol.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${rolSeleccionado === rol.id 
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' 
                        : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                    <input type="radio" name="rol" value={rol.id} checked={rolSeleccionado === rol.id}
                      onChange={() => setRolSeleccionado(rol.id)} className="sr-only"/>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${rolSeleccionado === rol.id ? 'border-primary-500' : 'border-gray-300'}`}>
                      {rolSeleccionado === rol.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-scale-in"/>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 leading-tight">
                        {formatRol(rol.nombre)}
                      </span>
                      {rol.descripcion && (
                        <span className="text-xs text-gray-500">{rol.descripcion}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalUsuario(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCambiarRol} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : 'Cambiar rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}