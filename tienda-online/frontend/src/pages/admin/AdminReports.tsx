import { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'

interface ReportCardProps {
  titulo: string
  descripcion: string
  icono: string
  endpoint: string
  roles: string[]
  color: string
  gestion?: boolean
}

export default function AdminReports() {
  const { usuario } = useAuthStore()
  const roles = usuario?.roles ?? []
  const [generando, setGenerando] = useState<string | null>(null)

  const handleDownload = async (endpoint: string, titulo: string) => {
    setGenerando(endpoint)
    try {
      const resp = await api.get(endpoint, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Reporte generado correctamente')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el reporte')
    } finally {
      setGenerando(null)
    }
  }

  const reportesOperacionales: ReportCardProps[] = [
    { titulo: 'Órdenes del Período', descripcion: 'Listado detallado de órdenes, productos y estados.', icono: '🧾', endpoint: '/reports/orders', roles: ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'], color: 'border-blue-500 text-blue-600' },
    { titulo: 'Inventario Valorizado', descripcion: 'Valor actual del inventario desglosado por categoría.', icono: '💰', endpoint: '/reports/inventory', roles: ['ADMIN', 'GERENTE_INVENTARIO'], color: 'border-green-500 text-green-600' },
    { titulo: 'Movimientos de Stock', descripcion: 'Entradas y salidas de productos en un rango de fechas.', icono: '🔄', endpoint: '/reports/inventory-movements', roles: ['ADMIN', 'GERENTE_INVENTARIO'], color: 'border-purple-500 text-purple-600' },
    { titulo: 'Stock Bajo / Agotado', descripcion: 'Productos con existencia crítica que requieren reposición.', icono: '⚠️', endpoint: '/reports/low-stock', roles: ['ADMIN', 'GERENTE_INVENTARIO', 'VENDEDOR'], color: 'border-orange-500 text-orange-600' },
    { titulo: 'Pagos Recibidos', descripcion: 'Resumen de transacciones y métodos de pago utilizados.', icono: '💳', endpoint: '/reports/payments', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-emerald-500 text-emerald-600' },
    { titulo: 'Devoluciones', descripcion: 'Listado de productos devueltos con motivo y estado.', icono: '↩️', endpoint: '/reports/returns', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-red-500 text-red-600' },
  ]

  const reportesGestion: ReportCardProps[] = [
    { titulo: 'Rentabilidad por Producto', descripcion: 'Análisis de márgenes de ganancia y productos estrella.', icono: '📈', endpoint: '/reports/management/profitability', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-indigo-500 text-indigo-600', gestion: true },
    { titulo: 'Ventas por Categoría', descripcion: 'Comparativa mensual y tendencias de ventas por rubro.', icono: '📊', endpoint: '/reports/management/sales-by-category', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-cyan-500 text-cyan-600', gestion: true },
    { titulo: 'Comportamiento de Carritos', descripcion: 'Tasa de abandono, conversión y ticket promedio.', icono: '🛒', endpoint: '/reports/management/cart-behavior', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-pink-500 text-pink-600', gestion: true },
    { titulo: 'Análisis de Clientes', descripcion: 'Segmentación VIP, recurrentes y nuevos clientes.', icono: '👥', endpoint: '/reports/management/customers', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-amber-500 text-amber-600', gestion: true },
    { titulo: 'Rotación de Inventario', descripcion: 'Velocidad de movimiento de stock por categoría.', icono: '♻️', endpoint: '/reports/management/inventory-turnover', roles: ['ADMIN', 'GERENTE_INVENTARIO'], color: 'border-teal-500 text-teal-600', gestion: true },
    { titulo: 'Ingresos vs Costos', descripcion: 'Balance financiero y utilidad bruta de los últimos meses.', icono: '⚖️', endpoint: '/reports/management/income-vs-cost', roles: ['ADMIN', 'GERENTE_VENTAS'], color: 'border-slate-500 text-slate-600', gestion: true },
  ]

  const renderCards = (list: ReportCardProps[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {list
        .filter(r => r.roles.some(role => roles.includes(role)))
        .map((reporte) => (
          <div key={reporte.endpoint} className={`card border-l-4 ${reporte.color} hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{reporte.icono}</span>
                  <h3 className="font-bold text-gray-900">{reporte.titulo}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6">{reporte.descripcion}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(reporte.endpoint, reporte.titulo)}
              disabled={generando === reporte.endpoint}
              className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                ${reporte.gestion 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                disabled:opacity-50`}
            >
              {generando === reporte.endpoint ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <span className="text-lg">📥</span>
                  Descargar PDF
                </>
              )}
            </button>
          </div>
        ))}
    </div>
  )

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
        <p className="text-gray-500 text-sm mt-1">Genera y descarga informes detallados del sistema.</p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-800">Reportes Operacionales</h2>
        </div>
        {renderCards(reportesOperacionales)}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-6 w-1 bg-primary-600 rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-800">Reportes de Gestión Estratégica</h2>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Puppeteer</span>
        </div>
        {renderCards(reportesGestion)}
      </section>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800">
        <span className="text-xl">💡</span>
        <p className="text-sm">
          <strong>Nota:</strong> Los reportes de gestión incluyen gráficos comparativos y análisis de tendencias. 
          El tiempo de generación puede ser mayor debido al procesamiento de datos históricos.
        </p>
      </div>
    </div>
  )
}
