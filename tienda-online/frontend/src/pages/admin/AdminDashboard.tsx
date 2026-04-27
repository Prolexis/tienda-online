// =============================================
// PÁGINA: DASHBOARD ADMINISTRATIVO
// =============================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'

// ── Tipos ─────────────────────────────────────────────────────

interface DashboardData {
  kpis: {
    ventasMes:          string
    ordenesMes:         number
    ticketPromedio:     string
    variacionVentas:    string
    ordenesHoy:         number
    productosBajoStock: number
    productosAgotados:  number
    clientesNuevosMes:  number
  }
  graficos: {
    ordenesPorEstado:   Array<{ estado: string; _count: { id: number } }>
    topProductos:       Array<{ nombreProducto: string; _sum: { cantidad: number; subtotal: number } }>
    ventasPorCategoria: Array<{ nombre: string; total: number }>
    ventasDiarias:      Array<{ fecha: string; total: number; cantidad: number }>
  }
}

interface StockResumen {
  totalProductos: number
  sinStock:       number
  bajoStock:      number
  stockNormal:    number
}

interface ProductoStock {
  id:          number
  sku:         string
  nombre:      string
  stock:       number
  stockMinimo: number
  categoria:   { nombre: string }
  marca?:      { nombre: string } | null
}

// ── Constantes ────────────────────────────────────────────────

const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente', PAGADA: 'Pagada',      EN_PROCESO: 'En proceso',
  ENVIADA: 'Enviada',          ENTREGADA: 'Entregada', CANCELADA: 'Cancelada',
  DEVUELTA: 'Devuelta',
}

// ── Spinner ───────────────────────────────────────────────────

function Spinner({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-gray-500 mt-3">{texto}</p>
      </div>
    </div>
  )
}

// ── Vista: Vendedor (órdenes del día + stock crítico, solo lectura) ────────────

function DashboardVendedor() {
  const [datos,    setDatos]    = useState<DashboardData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => {
        if (data.success) {
          setDatos(data.data)
        } else {
          setError(data.message || 'Error al cargar datos')
        }
      })
      .catch((err) => {
        console.error('Error dashboard vendedor:', err)
        setError('No se pudo conectar con el servidor')
        toast.error('Error al cargar el dashboard')
      })
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <Spinner texto="Cargando..." />
  if (error) return (
    <div className="card p-8 text-center">
      <p className="text-red-500 font-medium">{error}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-4">Reintentar</button>
    </div>
  )
  if (!datos)   return null

  const { kpis = {} as DashboardData['kpis'], graficos = {} as DashboardData['graficos'] } = datos

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de operaciones del día</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-blue-600 text-white border-none shadow-blue-200">
          <p className="text-blue-100 text-sm font-medium">Órdenes hoy</p>
          <p className="text-4xl font-bold mt-2">{kpis?.ordenesHoy ?? 0}</p>
        </div>
        <div className="card bg-orange-500 text-white border-none shadow-orange-200">
          <p className="text-orange-100 text-sm font-medium">Bajo stock</p>
          <p className="text-4xl font-bold mt-2">{kpis?.productosBajoStock ?? 0}</p>
        </div>
        <div className="card bg-red-600 text-white border-none shadow-red-200">
          <p className="text-red-100 text-sm font-medium">Agotados</p>
          <p className="text-4xl font-bold mt-2">{kpis?.productosAgotados ?? 0}</p>
        </div>
      </div>

      {/* Órdenes por estado */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-5">Estado de órdenes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {graficos.ordenesPorEstado.map((o, i) => (
            <div key={o.estado} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: COLORES[i % COLORES.length] }}>
                {o._count.id}
              </p>
              <p className="text-xs text-gray-500 mt-1">{ESTADO_LABEL[o.estado] || o.estado}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Vista: Gerente de Inventario (stock + alertas, solo lectura estadísticas) ──

function DashboardInventario() {
  const [resumen,   setResumen]   = useState<StockResumen | null>(null)
  const [productos, setProductos] = useState<ProductoStock[]>([])
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    api.get('/admin/inventory/stock')
      .then(({ data }) => { setResumen(data.resumen); setProductos(data.data) })
      .catch(() => toast.error('Error al cargar inventario'))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) return <Spinner texto="Cargando inventario..." />

  const criticos = productos
    .filter((p) => p.stock === 0 || p.stock <= p.stockMinimo)
    .slice(0, 10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de inventario</p>
      </div>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        <span className="text-lg">ℹ️</span>
        <span>Estás viendo estadísticas de inventario. Las métricas financieras son visibles solo para Administradores y Gerentes de Ventas.</span>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total productos', valor: resumen.totalProductos, icono: '📦', color: 'bg-blue-50 text-blue-700' },
            { label: 'Sin stock',       valor: resumen.sinStock,       icono: '🚫', color: 'bg-red-50 text-red-700' },
            { label: 'Bajo stock',      valor: resumen.bajoStock,      icono: '⚠️', color: 'bg-orange-50 text-orange-700' },
            { label: 'Stock normal',    valor: resumen.stockNormal,    icono: '✅', color: 'bg-green-50 text-green-700' },
          ].map(({ label, valor, icono, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color.split(' ')[0]}`}>
                {icono}
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{valor}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {criticos.length > 0 ? (
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">🚨 Productos que requieren atención ({criticos.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['SKU', 'Producto', 'Marca', 'Categoría', 'Stock actual', 'Mínimo', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {criticos.map((p) => {
                  const sinStock = p.stock === 0
                  return (
                    <tr key={p.id} className={sinStock ? 'bg-red-50' : 'bg-orange-50'}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.sku}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nombre}</td>
                      <td className="px-4 py-2 text-gray-500">{p.marca?.nombre || '-'}</td>
                      <td className="px-4 py-2 text-gray-500">{p.categoria.nombre}</td>
                      <td className="px-4 py-2">
                        <span className={`font-bold text-lg ${sinStock ? 'text-red-600' : 'text-orange-500'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{p.stockMinimo}</td>
                      <td className="px-4 py-2">
                        {sinStock
                          ? <span className="badge bg-red-100 text-red-700">🚫 Sin stock</span>
                          : <span className="badge bg-orange-100 text-orange-700">⚠️ Bajo stock</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-gray-800">Todo el inventario está en niveles normales</p>
          <p className="text-sm text-gray-500 mt-1">No hay productos sin stock ni bajo el mínimo.</p>
        </div>
      )}
    </div>
  )
}

// ── Vista: Admin / Gerente de Ventas (dashboard completo) ─────

function DashboardCompleto({ roles }: { roles: string[] }) {
  const [datos,    setDatos]    = useState<DashboardData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => {
        if (data.success) {
          setDatos(data.data)
        } else {
          setError(data.message || 'Error al cargar datos del dashboard')
        }
      })
      .catch((err) => {
        console.error('Error dashboard completo:', err)
        setError('No se pudo establecer conexión con el servidor de estadísticas')
        toast.error('Error al cargar el dashboard')
      })
      .finally(() => setCargando(false))
  }, [])

  const handleReporte = async (tipo: string) => {
    try {
      const resp = await api.get(`/reports/${tipo}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch { /* manejado por interceptor */ }
  }

  if (cargando) return <Spinner texto="Cargando dashboard..." />
  if (error) return (
    <div className="card p-10 text-center border-red-100 bg-red-50/30">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-bold text-gray-900">Error de Carga</h3>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">{error}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-6">
        Intentar nuevamente
      </button>
    </div>
  )
  if (!datos) return null

  const { kpis = {} as DashboardData['kpis'], graficos = {} as DashboardData['graficos'] } = datos

  const kpiCards = [
    {
      titulo: 'Ventas del mes',
      valor:  `S/. ${Number(kpis?.ventasMes || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      icono: '💰',
      cambio: `${parseFloat(kpis?.variacionVentas || '0') >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(kpis?.variacionVentas || '0')).toFixed(1)}% vs mes ant.`,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      titulo: 'Órdenes del mes',
      valor:  (kpis?.ordenesMes ?? 0).toString(),
      icono: '📦',
      cambio: `${kpis?.ordenesHoy ?? 0} hoy`,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      titulo: 'Ticket promedio',
      valor:  `S/. ${kpis?.ticketPromedio || '0.00'}`,
      icono: '🧾',
      cambio: 'Por orden',
      color: 'bg-green-50 text-green-700',
    },
    {
      titulo: 'Clientes nuevos',
      valor:  (kpis?.clientesNuevosMes ?? 0).toString(),
      icono: '👥',
      cambio: 'Este mes',
      color: 'bg-yellow-50 text-yellow-700',
    },
    {
      titulo: 'Bajo stock',
      valor:  (kpis?.productosBajoStock ?? 0).toString(),
      icono: '⚠️',
      cambio: 'Productos críticos',
      color: 'bg-orange-50 text-orange-700',
    },
    {
      titulo: 'Sin stock',
      valor:  (kpis?.productosAgotados ?? 0).toString(),
      icono: '🚫',
      cambio: 'Requieren reposición',
      color: 'bg-red-50 text-red-700',
    },
  ]

  const ventasDiariasFormateadas = (graficos?.ventasDiarias || []).map((v) => ({
    fecha:   v.fecha ? new Date(v.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '---',
    ventas:  Number(v.total || 0),
    ordenes: Number(v.cantidad || 0),
  }))

  const topProductosFormateados = (graficos?.topProductos || []).map((p) => ({
    nombre:   (p.nombreProducto || 'Desconocido').length > 20 ? p.nombreProducto.slice(0, 20) + '…' : (p.nombreProducto || 'Desconocido'),
    cantidad: p._sum?.cantidad || 0,
  }))

  const ordenesPorEstadoData = (graficos?.ordenesPorEstado || []).map((o) => ({
    name:  ESTADO_LABEL[o.estado] || o.estado || 'Otros',
    value: o._count?.id || 0,
  }))

  const ventasPorCategoriaData = (graficos?.ventasPorCategoria || []).map((v) => ({
    nombre: v.nombre || 'Sin categoría',
    total:  Number(v.total || 0),
  }))

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen ejecutivo del e-commerce</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {roles.some((r) => ['ADMIN', 'GERENTE_VENTAS'].includes(r)) && (
            <button onClick={() => handleReporte('orders')} className="btn-secondary text-sm">
              📄 Reporte Órdenes
            </button>
          )}
          {roles.some((r) => ['ADMIN', 'GERENTE_INVENTARIO', 'GERENTE_VENTAS'].includes(r)) && (
            <button onClick={() => handleReporte('inventory')} className="btn-secondary text-sm">
              📦 Reporte Inventario
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${kpi.color.split(' ')[0]}`}>
              {kpi.icono}
            </div>
            <div>
              <p className="text-sm text-gray-500">{kpi.titulo}</p>
              <p className={`text-2xl font-bold ${kpi.color.split(' ')[1]}`}>{kpi.valor}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.cambio}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-gray-900 mb-5">Ventas diarias (últimos 30 días)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ventasDiariasFormateadas}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/.${v}`}/>
              <Tooltip formatter={(v: number) => [`S/. ${v.toFixed(2)}`, 'Ventas']}/>
              <Area type="monotone" dataKey="ventas" stroke="#3b82f6"
                fill="url(#colorVentas)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 mb-5">Órdenes por estado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ordenesPorEstadoData}
                cx="50%" cy="50%" outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {ordenesPorEstadoData.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]}/>
                ))}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-5">Top 5 productos más vendidos</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProductosFormateados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{ fontSize: 11 }}/>
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 10 }}/>
              <Tooltip/>
              <Bar dataKey="cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]}
                label={{ position: 'right', fontSize: 11 }}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 mb-5">Ventas por categoría (S/.)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ventasPorCategoriaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }}/>
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/.${v}`}/>
              <Tooltip formatter={(v: number) => [`S/. ${v.toFixed(2)}`, 'Ventas']}/>
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {ventasPorCategoriaData.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function AdminDashboard() {
  const { usuario } = useAuthStore()
  const navigate    = useNavigate()
  const roles       = usuario?.roles ?? []

  const esAdmin         = roles.includes('ADMIN')
  const esGerenteVentas = roles.includes('GERENTE_VENTAS')
  const esGerenteInv    = roles.includes('GERENTE_INVENTARIO')
  const esVendedor      = roles.includes('VENDEDOR')

  useEffect(() => {
    if (!esAdmin && !esGerenteVentas && !esGerenteInv && !esVendedor) {
      navigate('/', { replace: true })
    }
  }, [esAdmin, esGerenteVentas, esGerenteInv, esVendedor, navigate])

  // GERENTE_INVENTARIO sin otros roles superiores → dashboard de inventario
  if (esGerenteInv && !esAdmin && !esGerenteVentas) {
    return <DashboardInventario />
  }

  // VENDEDOR sin otros roles superiores → dashboard operativo
  if (esVendedor && !esAdmin && !esGerenteVentas && !esGerenteInv) {
    return <DashboardVendedor />
  }

  // ADMIN y GERENTE_VENTAS → dashboard completo
  return <DashboardCompleto roles={roles} />
}
