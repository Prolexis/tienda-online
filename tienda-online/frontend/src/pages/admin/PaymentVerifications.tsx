import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

interface Verificacion {
  id: number
  pagoId: number
  estado: 'PENDIENTE_VERIFICACION' | 'VERIFICADO' | 'RECHAZADO' | 'REVERSADO'
  requiere2FA: boolean
  fechaMarcado: string
  fechaVerificado?: string
  notas?: string
  pago: {
    monto: string
    metodo: string
    referencia?: string
    orden: {
      numeroOrden: string
    }
  }
  marcadoPor: { nombre: string; apellido: string }
  verificadoPor?: { nombre: string; apellido: string }
}

export default function PaymentVerifications() {
  const { usuario } = useAuthStore()
  const esDueno = usuario?.roles.includes('DUEÑO') || usuario?.roles.includes('ADMIN')
  
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [modalReverso, setModalReverso] = useState<number | null>(null)
  const [motivoReverso, setMotivoReverso] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/payments/verifications', {
        params: filtro ? { estado: filtro } : {}
      })
      setVerificaciones(data.data)
    } catch {
      toast.error('Error al cargar verificaciones')
    } finally {
      setCargando(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const handleConfirmar = async (id: number, requiere2FA: boolean) => {
    let token2FA = ''
    if (requiere2FA) {
      token2FA = window.prompt('Este monto supera el umbral de seguridad. Ingrese el código de verificación 2FA:') || ''
      if (!token2FA) return
    }

    try {
      await api.post(`/admin/payments/verifications/${id}/confirm`, { token2FA })
      toast.success('Pago verificado y confirmado')
      cargar()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al confirmar')
    }
  }

  const handleReversar = async () => {
    if (!modalReverso || motivoReverso.length < 10) {
      toast.error('Debe proporcionar un motivo válido (mín. 10 caracteres)')
      return
    }
    try {
      await api.post(`/admin/payments/verifications/${modalReverso}/reverse`, { motivo: motivoReverso })
      toast.success('Verificación reversada')
      setModalReverso(null)
      setMotivoReverso('')
      cargar()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al reversar')
    }
  }

  const exportarExcel = () => {
    const data = verificaciones.map(v => ({
      Orden: v.pago.orden.numeroOrden,
      Monto: `S/. ${v.pago.monto}`,
      Metodo: v.pago.metodo,
      Estado: v.estado,
      'Admin Marcado': v.marcadoPor.nombre,
      'Fecha Marcado': new Date(v.fechaMarcado).toLocaleString(),
      'Dueño Verificado': v.verificadoPor?.nombre || 'N/A',
      'Fecha Verificado': v.fechaVerificado ? new Date(v.fechaVerificado).toLocaleString() : 'N/A'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Verificaciones')
    XLSX.writeFile(wb, `Reporte_Verificaciones_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    doc.text('Historial de Verificación de Pagos', 14, 15)
    const tableData = verificaciones.map(v => [
      v.pago.orden.numeroOrden,
      `S/. ${v.pago.monto}`,
      v.estado,
      v.marcadoPor.nombre,
      v.verificadoPor?.nombre || '-'
    ])
    ;(doc as any).autoTable({
      head: [['Orden', 'Monto', 'Estado', 'Admin', 'Dueño']],
      body: tableData,
      startY: 20
    })
    doc.save(`Reporte_Verificaciones_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verificación de Pagos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Solo el Dueño puede realizar la confirmación final de los fondos.
          </p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)}
            className="input-field py-2"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE_VERIFICACION">Pendientes</option>
            <option value="VERIFICADO">Verificados</option>
            <option value="REVERSADO">Reversados</option>
          </select>
          <button onClick={exportarExcel} className="btn-secondary py-2">📊 Excel</button>
          <button onClick={exportarPDF} className="btn-secondary py-2">📄 PDF</button>
          <button onClick={cargar} className="btn-secondary py-2">🔄 Actualizar</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Orden</th>
              <th className="px-6 py-4">Monto</th>
              <th className="px-6 py-4">Admin (Recepción)</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Dueño (Verificación)</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center animate-pulse">Cargando datos...</td></tr>
            ) : verificaciones.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No hay verificaciones pendientes</td></tr>
            ) : verificaciones.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">#{v.pago.orden.numeroOrden}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">S/. {v.pago.monto}</span>
                    <span className="text-xs text-gray-500">{v.pago.metodo}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-xs">
                    <span className="text-gray-900">{v.marcadoPor.nombre}</span>
                    <span className="text-gray-500">{new Date(v.fechaMarcado).toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${
                    v.estado === 'VERIFICADO' ? 'bg-green-100 text-green-700' :
                    v.estado === 'PENDIENTE_VERIFICACION' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {v.estado.replace('_', ' ')}
                  </span>
                  {v.requiere2FA && (
                    <span className="ml-1 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">2FA</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {v.verificadoPor ? (
                    <div className="flex flex-col text-xs">
                      <span className="text-gray-900">{v.verificadoPor.nombre}</span>
                      <span className="text-gray-500">{new Date(v.fechaVerificado!).toLocaleString()}</span>
                    </div>
                  ) : <span className="text-gray-400 italic">Esperando dueño...</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {v.estado === 'PENDIENTE_VERIFICACION' && esDueno && (
                      <button 
                        onClick={() => handleConfirmar(v.id, v.requiere2FA)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Confirmar
                      </button>
                    )}
                    {v.estado === 'VERIFICADO' && esDueno && (
                      <button 
                        onClick={() => setModalReverso(v.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                      >
                        Reversar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Reverso */}
      {modalReverso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Autorizar Reverso</h2>
            <p className="text-sm text-gray-500 mb-5">Esta acción es irreversible y requiere una justificación detallada.</p>
            <textarea 
              className="input-field w-full h-32 text-sm"
              placeholder="Escriba el motivo del reverso..."
              value={motivoReverso}
              onChange={(e) => setMotivoReverso(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalReverso(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleReversar} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">Confirmar Reverso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
