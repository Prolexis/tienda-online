// =============================================
// PÁGINA ADMIN: GESTIÓN DE INVENTARIO
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Producto {
  id: number; sku: string; nombre: string; stock: number; stockMinimo: number;
  categoria: { nombre: string };
  marca?: { nombre: string } | null;
  ultimaSalida?: string;
  esCritico?: boolean;
}

interface Movimiento {
  id: number; tipo: string; cantidad: number; stockAntes: number; stockDespues: number
  motivo: string; createdAt: string
  producto: { nombre: string; sku: string }
  usuario: { nombre: string; apellido: string } | null
}

interface Resumen {
  totalProductos: number; sinStock: number; bajoStock: number; stockNormal: number
}

const TIPO_COLORES: Record<string, string> = {
  entrada: 'bg-green-100 text-green-700',
  salida:  'bg-red-100 text-red-700',
  ajuste:  'bg-blue-100 text-blue-700',
}

const TIPO_ICONOS: Record<string, string> = {
  entrada: '📥', salida: '📤', ajuste: '🔧',
}

export default function AdminInventario() {
  const [vista,       setVista]       = useState<'stock' | 'movimientos' | 'critico'>('stock')
  const [productos,   setProductos]   = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [resumen,     setResumen]     = useState<Resumen | null>(null)
  const [cargando,    setCargando]    = useState(true)
  const [modal,       setModal]       = useState(false)
  const [pagina,      setPagina]      = useState(1)
  const [totalPags,   setTotalPags]   = useState(1)
  const [busqueda,    setBusqueda]    = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState<string>('')
  const [marcas,      setMarcas]      = useState<{id: number, nombre: string}[]>([])
  const [form,        setForm]        = useState({
    productoId: 0, tipo: 'entrada', cantidad: '', motivo: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState(false)

  const handleExportar = async (formato: 'pdf' | 'excel') => {
    setExportando(true)
    try {
      const endpoint = formato === 'pdf' ? '/reports/inventory' : '/reports/inventory/excel'
      const response = await api.get(endpoint, { responseType: 'blob' })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte-inventario.${formato === 'pdf' ? 'pdf' : 'xlsx'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success(`Reporte ${formato.toUpperCase()} generado`)
    } catch {
      toast.error('Error al exportar inventario')
    } finally {
      setExportando(false)
    }
  }

  const cargarStock = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/inventory/stock')
      setProductos(data.data)
      setResumen(data.resumen)
    } catch { toast.error('Error al cargar inventario') }
    finally { setCargando(false) }
  }, [])

  const cargarMovimientos = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/inventory/movements', {
        params: { pagina, porPagina: 20 }
      })
      setMovimientos(data.data)
      setTotalPags(data.meta.totalPaginas)
    } catch { toast.error('Error al cargar movimientos') }
    finally { setCargando(false) }
  }, [pagina])

  useEffect(() => {
    if (vista === 'stock') cargarStock()
    else cargarMovimientos()
  }, [vista, cargarStock, cargarMovimientos])

  useEffect(() => {
    api.get('/products/brands').then(({ data }) => setMarcas(data.data))
  }, [])

  const handleGuardar = async () => {
    if (!form.productoId || !form.cantidad || !form.motivo) {
      toast.error('Completa todos los campos'); return
    }
    setGuardando(true)
    try {
      await api.post('/admin/inventory/movements', {
        productoId: form.productoId,
        tipo:       form.tipo,
        cantidad:   Number(form.cantidad),
        motivo:     form.motivo,
      })
      toast.success('Movimiento registrado correctamente')
      setModal(false)
      setForm({ productoId: 0, tipo: 'entrada', cantidad: '', motivo: '' })
      cargarStock()
      if (vista === 'movimientos') cargarMovimientos()
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = busqueda
      ? `${p.nombre} ${p.sku}`.toLowerCase().includes(busqueda.toLowerCase())
      : true
    const coincideMarca = marcaFiltro
      ? p.marca?.nombre === marcaFiltro
      : true
    return coincideBusqueda && coincideMarca
  })

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock y movimientos</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button 
               onClick={() => handleExportar('pdf')} 
               disabled={exportando}
               className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border-r border-gray-200 flex items-center gap-2"
               title="Exportar a PDF"
             >
               {exportando ? (
                 <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
               ) : (
                 <>📄 PDF</>
               )}
             </button>
            <button 
              onClick={() => handleExportar('excel')} 
              disabled={exportando}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              title="Exportar a Excel"
            >
              {exportando ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>📊 Excel</>
              )}
            </button>
          </div>
          <button onClick={() => setModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <span>+</span> Registrar movimiento
          </button>
        </div>
      </div>

      {/* KPIs de inventario */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total productos', valor: resumen.totalProductos, icono: '📦', color: 'bg-blue-50 text-blue-700' },
            { label: 'Sin stock',       valor: resumen.sinStock,       icono: '🚫', color: 'bg-red-50 text-red-700' },
            { label: 'Bajo stock',      valor: resumen.bajoStock,      icono: '⚠️', color: 'bg-orange-50 text-orange-700' },
            { label: 'Stock normal',    valor: resumen.stockNormal,    icono: '✅', color: 'bg-green-50 text-green-700' },
          ].map(({ label, valor, icono, color }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color.split(' ')[0]}`}>
                {icono}
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{valor}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setVista('stock')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${vista === 'stock' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          📦 Stock actual
        </button>
        <button onClick={() => setVista('critico')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${vista === 'critico' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          🚨 Stock Crítico
        </button>
        <button onClick={() => setVista('movimientos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${vista === 'movimientos' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          📋 Movimientos
        </button>
      </div>

      {/* Vista Stock / Crítico */}
      {(vista === 'stock' || vista === 'critico') && (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o SKU..." className="input-field max-w-sm"/>
            
            <select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}
              className="input-field max-w-[200px]">
              <option value="">Todas las marcas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {vista === 'critico' && productosFiltrados.filter(p => p.stock <= p.stockMinimo).length === 0 && !cargando ? (
                <div className="p-20 text-center">
                  <p className="text-5xl mb-4">✅</p>
                  <p className="text-xl font-bold text-gray-900">¡Excelente!</p>
                  <p className="text-gray-500">No hay productos con stock crítico en este momento.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['SKU', 'Producto', 'Categoría', 'Marca', 'Stock', 'Mínimo', 'Últ. Mov.', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cargando ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                    ))
                  ) : productosFiltrados.filter(p => vista === 'critico' ? (p.stock <= p.stockMinimo) : true).map((p) => {
                    const sinStock   = p.stock === 0
                    const bajoStock  = p.stock > 0 && p.stock <= p.stockMinimo
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${sinStock ? 'bg-red-50' : bajoStock ? 'bg-orange-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.nombre}</td>
                        <td className="px-4 py-3 text-gray-500">{p.categoria.nombre}</td>
                        <td className="px-4 py-3 text-gray-500">{p.marca?.nombre || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-lg font-bold ${sinStock ? 'text-red-600' : bajoStock ? 'text-orange-500' : 'text-gray-900'}`}>
                              {p.stock}
                            </span>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  sinStock ? 'bg-red-500 w-0' : 
                                  bajoStock ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ 
                                  width: `${Math.min((p.stock / (p.stockMinimo * 2)) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.stockMinimo}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {p.ultimaSalida ? new Date(p.ultimaSalida).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {sinStock ? (
                            <span className="badge bg-red-100 text-red-700">🚫 Sin stock</span>
                          ) : bajoStock ? (
                            <span className="badge bg-orange-100 text-orange-700">⚠️ Bajo stock</span>
                          ) : (
                            <span className="badge bg-green-100 text-green-700">✅ Normal</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => {
                              setForm({ ...form, productoId: p.id, tipo: 'entrada' });
                              setModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-800 text-xs font-bold bg-primary-50 px-2 py-1 rounded"
                          >
                            Reabastecer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Vista Movimientos */}
      {vista === 'movimientos' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Producto', 'Tipo', 'Cantidad', 'Stock antes', 'Stock después', 'Motivo', 'Usuario', 'Fecha'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cargando ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                  ))
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay movimientos registrados</td></tr>
                ) : movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[150px]">{m.producto.nombre}</div>
                      <div className="text-xs text-gray-400 font-mono">{m.producto.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${TIPO_COLORES[m.tipo]}`}>
                        {TIPO_ICONOS[m.tipo]} {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '-' : '='}{m.cantidad}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{m.stockAntes}</td>
                    <td className="px-4 py-3 font-semibold text-primary-700">{m.stockDespues}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{m.motivo}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(m.createdAt).toLocaleDateString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPags > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary px-3 py-1.5 text-sm">←</button>
              <span className="flex items-center px-3 text-sm text-gray-600">{pagina} / {totalPags}</span>
              <button onClick={() => setPagina((p) => Math.min(totalPags, p + 1))} disabled={pagina === totalPags} className="btn-secondary px-3 py-1.5 text-sm">→</button>
            </div>
          )}
        </div>
      )}

      {/* Modal registrar movimiento */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Registrar movimiento de inventario</h2>
            <div className="space-y-4">

              {/* Producto */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Producto <span className="text-red-500">*</span>
                </label>
                <select value={form.productoId}
                  onChange={(e) => setForm((f) => ({ ...f, productoId: Number(e.target.value) }))}
                  className="input-field text-sm">
                  <option value={0}>Selecciona un producto</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.nombre} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { valor: 'entrada', label: '📥 Entrada', desc: 'Agregar stock' },
                    { valor: 'salida',  label: '📤 Salida',  desc: 'Reducir stock' },
                    { valor: 'ajuste',  label: '🔧 Ajuste',  desc: 'Fijar cantidad' },
                  ].map(({ valor, label, desc }) => (
                    <label key={valor}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all text-center
                        ${form.tipo === valor ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" value={valor} checked={form.tipo === valor}
                        onChange={() => setForm((f) => ({ ...f, tipo: valor }))} className="sr-only"/>
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {form.tipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'} <span className="text-red-500">*</span>
                </label>
                <input type="number" value={form.cantidad}
                  onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                  className="input-field text-sm" placeholder="0" min="1"/>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <input value={form.motivo}
                  onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="Ej: Recepción de mercadería, proveedor XYZ"/>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Registrando...' : 'Registrar movimiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}