// =============================================
// PÁGINA ADMIN: GESTIÓN DE PEDIDOS
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

interface Orden {
  id: number; numeroOrden: string; estado: string; total: number; metodoPago: string
  createdAt: string; usuario: { nombre: string; apellido: string; email: string }
}

const TODOS_ESTADOS = ['PENDIENTE_PAGO','PAGADA','EN_PROCESO','ENVIADA','ENTREGADA','CANCELADA','DEVUELTA']
const ESTADOS_VENDEDOR = ['EN_PROCESO','ENVIADA']

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE_PAGO: 'bg-yellow-100 text-yellow-700', PAGADA: 'bg-blue-100 text-blue-700',
  EN_PROCESO: 'bg-purple-100 text-purple-700',     ENVIADA: 'bg-indigo-100 text-indigo-700',
  ENTREGADA: 'bg-green-100 text-green-700',         CANCELADA: 'bg-red-100 text-red-700',
  DEVUELTA: 'bg-gray-100 text-gray-700',
}
const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE_PAGO: '⏳ Pendiente', PAGADA: '💳 Pagada', EN_PROCESO: '⚙️ En proceso',
  ENVIADA: '📦 Enviada', ENTREGADA: '✅ Entregada', CANCELADA: '❌ Cancelada', DEVUELTA: '↩️ Devuelta',
}

const MOTIVOS_DEVOLUCION = [
  'Producto defectuoso',
  'Producto incorrecto',
  'No coincide con la descripción',
  'Llegó dañado',
  'El cliente cambió de opinión',
  'Talla/tamaño incorrecto',
  'Otro motivo',
]

export default function AdminOrders() {
  const { usuario } = useAuthStore()
  const roles = usuario?.roles ?? []

  const esVendedor         = roles.includes('VENDEDOR') && !roles.includes('ADMIN') && !roles.includes('GERENTE_VENTAS')
  const puedeCambiarEstado = roles.some((r) => ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'].includes(r))
  const estadosPermitidos  = esVendedor ? ESTADOS_VENDEDOR : TODOS_ESTADOS

  const [ordenes,       setOrdenes]       = useState<Orden[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [filtroEstado,  setFiltroEstado]  = useState('')
  const [filtroInicio,  setFiltroInicio]  = useState('')
  const [filtroFin,     setFiltroFin]     = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroOrden,   setFiltroOrden]   = useState('')
  const [pagina,        setPagina]        = useState(1)
  const [totalPags,     setTotalPags]     = useState(1)
  const [modalOrden,    setModalOrden]    = useState<Orden | null>(null)
  const [nuevoEstado,   setNuevoEstado]   = useState('')
  const [comentario,    setComentario]    = useState('')
  const [motivoDevolucion, setMotivoDevolucion] = useState('')
  const [actualizando,  setActualizando]  = useState(false)
  const [exportando,    setExportando]    = useState(false)

  const esDevolucion = nuevoEstado === 'DEVUELTA'
  const esCancelacion = nuevoEstado === 'CANCELADA'

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params: Record<string, string | number> = { pagina, porPagina: 15 }
      if (filtroEstado) params.estado = filtroEstado
      if (filtroInicio) params.inicio = filtroInicio
      if (filtroFin)    params.fin = filtroFin
      if (filtroCliente) params.cliente = filtroCliente
      if (filtroOrden)   params.numeroOrden = filtroOrden

      const { data } = await api.get('/orders/admin/all', { params })
      setOrdenes(data.ordenes)
      setTotalPags(data.meta.totalPaginas)
    } catch { toast.error('Error al cargar pedidos') }
    finally { setCargando(false) }
  }, [pagina, filtroEstado, filtroInicio, filtroFin, filtroCliente, filtroOrden])

  useEffect(() => { cargar() }, [cargar])

  const handleExportarExcel = async () => {
    setExportando(true)
    try {
      const params: Record<string, string> = {}
      if (filtroEstado) params.estado = filtroEstado
      if (filtroInicio) params.inicio = filtroInicio
      if (filtroFin)    params.fin = filtroFin
      if (filtroCliente) params.cliente = filtroCliente
      if (filtroOrden)   params.numeroOrden = filtroOrden

      const resp = await api.get('/orders/admin/export/excel', { params, responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([resp.data]))
      const a    = document.createElement('a')
      a.href = url; a.download = 'reporte-pedidos.xlsx'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exportado correctamente')
    } catch { toast.error('Error al exportar Excel') }
    finally { setExportando(false) }
  }

  const handleExportarPDF = async () => {
    try {
      const params: Record<string, string> = {}
      if (filtroEstado) params.estado = filtroEstado
      if (filtroInicio) params.inicio = filtroInicio
      if (filtroFin)    params.fin = filtroFin
      if (filtroCliente) params.cliente = filtroCliente
      if (filtroOrden)   params.numeroOrden = filtroOrden

      const resp = await api.get('/reports/orders', { params, responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a    = document.createElement('a')
      a.href = url; a.download = 'reporte-pedidos.pdf'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar PDF') }
  }

  const handleCambiarEstado = async () => {
    if (!modalOrden || !nuevoEstado) { toast.error('Selecciona un estado'); return }
    if (esDevolucion && !motivoDevolucion) { toast.error('El motivo de devolución es obligatorio'); return }

    const comentarioFinal = esDevolucion
      ? `DEVOLUCIÓN — Motivo: ${motivoDevolucion}${comentario ? `. ${comentario}` : ''}`
      : comentario

    setActualizando(true)
    try {
      await api.patch(`/orders/${modalOrden.id}/status`, { estado: nuevoEstado, comentario: comentarioFinal })
      toast.success('Estado actualizado')
      setModalOrden(null); setNuevoEstado(''); setComentario(''); setMotivoDevolucion('')
      cargar()
    } catch { /* manejado */ }
    finally { setActualizando(false) }
  }

  const handleFactura = async (ordenId: number, numero: string) => {
    try {
      const resp = await api.get(`/reports/invoice/${ordenId}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a    = document.createElement('a')
      a.href = url; a.download = `factura-${numero}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* manejado */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Pedidos</h1>
          {esVendedor && (
            <p className="text-xs text-gray-500 mt-1">👁️ Puedes cambiar estado a: En proceso y Enviada</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportarExcel} disabled={exportando} className="btn-secondary text-sm flex items-center gap-2">
            {exportando ? '⏳...' : '📊 Excel'}
          </button>
          <button onClick={handleExportarPDF} className="btn-secondary text-sm flex items-center gap-2">
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Estado</label>
            <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}
              className="input-field text-sm">
              <option value="">Todos los estados</option>
              {TODOS_ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Cliente</label>
            <input value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Nombre, email..." className="input-field text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">N° Orden</label>
            <input value={filtroOrden} onChange={(e) => setFiltroOrden(e.target.value)}
              placeholder="ORD-..." className="input-field text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Desde</label>
            <input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)}
              className="input-field text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Hasta</label>
            <input type="date" value={filtroFin} onChange={(e) => setFiltroFin(e.target.value)}
              className="input-field text-sm"/>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['N° Orden', 'Cliente', 'Estado', 'Total', 'Método Pago', 'Fecha', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                ))
              ) : ordenes.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{o.numeroOrden}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{o.usuario.nombre} {o.usuario.apellido}</div>
                    <div className="text-xs text-gray-400">{o.usuario.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ESTADO_COLORES[o.estado] || 'bg-gray-100 text-gray-700'}`}>
                      {ESTADO_LABELS[o.estado] || o.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">S/. {Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{o.metodoPago.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(o.createdAt).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {puedeCambiarEstado && (
                        <button onClick={() => { setModalOrden(o); setNuevoEstado(o.estado); setMotivoDevolucion('') }}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                          Cambiar estado
                        </button>
                      )}
                      <button onClick={() => handleFactura(o.id, o.numeroOrden)}
                        className="text-gray-500 hover:text-gray-700 text-xs font-medium">
                        Factura
                      </button>
                    </div>
                  </td>
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

      {/* Modal cambiar estado */}
      {modalOrden && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOrden(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            {/* Header */}
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {esDevolucion ? '↩️ Procesar Devolución' : 'Cambiar estado'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Orden: <span className="font-mono font-semibold text-primary-700">{modalOrden.numeroOrden}</span>
              <span className="ml-2 text-gray-400">— {modalOrden.usuario.nombre} {modalOrden.usuario.apellido}</span>
            </p>

            <div className="space-y-4">

              {/* Selector de estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo estado</label>
                <select value={nuevoEstado}
                  onChange={(e) => { setNuevoEstado(e.target.value); setMotivoDevolucion('') }}
                  className="input-field">
                  {estadosPermitidos.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                </select>
                {esVendedor && (
                  <p className="text-xs text-orange-500 mt-1">⚠️ Solo puedes cambiar a: En proceso o Enviada</p>
                )}
              </div>

              {/* Motivo devolución — solo si es DEVUELTA */}
              {esDevolucion && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">↩️ Información de devolución</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Motivo de devolución <span className="text-red-500">*</span>
                    </label>
                    <select value={motivoDevolucion}
                      onChange={(e) => setMotivoDevolucion(e.target.value)}
                      className="input-field text-sm">
                      <option value="">Selecciona el motivo...</option>
                      {MOTIVOS_DEVOLUCION.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Al procesar la devolución el estado cambiará a DEVUELTA y quedará registrado en el historial.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso cancelación */}
              {esCancelacion && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs text-red-700">
                    ❌ Al cancelar la orden el estado cambiará a CANCELADA permanentemente.
                  </p>
                </div>
              )}

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {esDevolucion ? 'Detalles adicionales (opcional)' : 'Comentario (opcional)'}
                </label>
                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder={esDevolucion
                    ? 'Ej: Cliente solicita reembolso completo...'
                    : 'Ej: Paquete enviado por Olva Courier, guía 12345...'}/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModalOrden(null); setMotivoDevolucion('') }}
                className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCambiarEstado} disabled={actualizando}
                className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-colors
                  ${esDevolucion ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}`}>
                {actualizando ? 'Guardando...' : esDevolucion ? '↩️ Procesar devolución' : 'Actualizar estado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}