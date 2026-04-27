// =============================================
// PÁGINA: MIS ÓRDENES (HISTORIAL)
// =============================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { Link } from 'react-router-dom'

interface Orden {
  id: number
  numeroOrden: string
  estado: string
  total: number
  createdAt: string
  metodoPago: string
  items: Array<{
    id: number
    nombreProducto: string
    cantidad: number
    precioUnitario: number
    subtotal: number
  }>
}

const ESTADO_COLORES: Record<string, string> = {
  PENDIENTE_PAGO: 'bg-yellow-100 text-yellow-700',
  PAGADA:         'bg-blue-100 text-blue-700',
  EN_PROCESO:     'bg-indigo-100 text-indigo-700',
  ENVIADA:        'bg-purple-100 text-purple-700',
  ENTREGADA:      'bg-green-100 text-green-700',
  CANCELADA:      'bg-red-100 text-red-700',
  DEVUELTA:       'bg-gray-100 text-gray-700',
}

export default function OrdersPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarOrdenes = async () => {
    try {
      setCargando(true)
      const { data } = await api.get('/orders')
      // Ajustar para obtener 'ordenes' de la respuesta correcta
      const lista = data?.ordenes || data?.data || []
      setOrdenes(Array.isArray(lista) ? lista : [])
    } catch (err) {
      console.error('Error al cargar órdenes:', err)
      toast.error('Error al cargar historial de órdenes')
      setOrdenes([]) 
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarOrdenes() }, [])

  const descargarFactura = async (id: number, numero: string) => {
    try {
      toast.loading('Generando factura...', { id: 'pdf' })
      const response = await api.get(`/reports/invoice/${id}`, { responseType: 'blob' })
      if (!response.data) throw new Error('No se recibió contenido para el PDF')
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `factura-${numero}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url) // Limpiar memoria
      toast.success('Factura descargada', { id: 'pdf' })
    } catch (err) {
      console.error('Error al descargar factura:', err)
      toast.error('Error al descargar factura', { id: 'pdf' })
    }
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600">
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
        <Link to="/products" className="text-primary-600 hover:underline text-sm font-medium">
          ← Seguir comprando
        </Link>
      </div>

      {(!ordenes || ordenes.length === 0) ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-gray-900">Aún no tienes pedidos</h3>
          <p className="text-gray-500 mt-1 mb-6">Tus compras aparecerán aquí.</p>
          <Link to="/products" className="btn-primary">Ver productos</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {ordenes.map((orden) => (
            <div key={orden.id} className="card overflow-hidden">
              {/* Encabezado de la orden */}
              <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Fecha</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(orden.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                    <p className="text-sm font-bold text-gray-900">S/. {Number(orden.total).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Nº Orden</p>
                    <p className="text-sm font-medium text-gray-600">{orden.numeroOrden}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge text-xs font-bold px-3 py-1 ${ESTADO_COLORES[orden.estado]}`}>
                    {orden.estado.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => descargarFactura(orden.id, orden.numeroOrden)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-2"
                  >
                    📄 Factura PDF
                  </button>
                </div>
              </div>

              {/* Items de la orden */}
              <div className="mt-6 space-y-4">
                {orden.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        📦
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.nombreProducto}</p>
                        <p className="text-xs text-gray-500">Cantidad: {item.cantidad}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">S/. {Number(item.subtotal || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">S/. {Number(item.precioUnitario || 0).toFixed(2)} c/u</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones adicionales */}
              {orden.estado === 'ENTREGADA' && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                  <Link
                    to={`/products`}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
                  >
                    Volver a comprar
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
