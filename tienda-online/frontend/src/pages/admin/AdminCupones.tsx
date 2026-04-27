// =============================================
// PÁGINA ADMIN: GESTIÓN DE CUPONES
// =============================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Cupon {
  id: number; codigo: string; descripcion: string | null
  tipo: string; valor: number; minimo: number
  usos: number; usosMaximos: number; activo: boolean
  fechaInicio: string; fechaFin: string
}

const VACIO = {
  codigo: '', descripcion: '', tipo: 'porcentaje',
  valor: '', minimo: '0', usosMaximos: '100',
  fechaInicio: '', fechaFin: '',
}

export default function AdminCupones() {
  const [cupones,   setCupones]   = useState<Cupon[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<Cupon | null>(null)
  const [form,      setForm]      = useState({ ...VACIO })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/cupones')
      setCupones(data.data)
    } catch { toast.error('Error al cargar cupones') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...VACIO })
    setModal(true)
  }

  const abrirEditar = (c: Cupon) => {
    setEditando(c)
    setForm({
      codigo:      c.codigo,
      descripcion: c.descripcion || '',
      tipo:        c.tipo,
      valor:       c.valor.toString(),
      minimo:      c.minimo.toString(),
      usosMaximos: c.usosMaximos.toString(),
      fechaInicio: new Date(c.fechaInicio).toISOString().split('T')[0],
      fechaFin:    new Date(c.fechaFin).toISOString().split('T')[0],
    })
    setModal(true)
  }

  const handleGuardar = async () => {
    if (!form.codigo || !form.valor || !form.fechaInicio || !form.fechaFin) {
      toast.error('Completa todos los campos requeridos'); return
    }
    if (new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
      toast.error('La fecha fin debe ser mayor a la fecha inicio'); return
    }
    setGuardando(true)
    try {
      const payload = {
        codigo:      form.codigo.toUpperCase(),
        descripcion: form.descripcion || undefined,
        tipo:        form.tipo,
        valor:       Number(form.valor),
        minimo:      Number(form.minimo),
        usosMaximos: Number(form.usosMaximos),
        fechaInicio: form.fechaInicio,
        fechaFin:    form.fechaFin,
        activo:      true,
      }
      if (editando) {
        await api.put(`/admin/cupones/${editando.id}`, payload)
        toast.success('Cupón actualizado')
      } else {
        await api.post('/admin/cupones', payload)
        toast.success('Cupón creado')
      }
      setModal(false); cargar()
    } catch { /* manejado */ }
    finally { setGuardando(false) }
  }

  const handleDesactivar = async (id: number, codigo: string) => {
    if (!window.confirm(`¿Desactivar el cupón "${codigo}"?`)) return
    try {
      await api.delete(`/admin/cupones/${id}`)
      toast.success('Cupón desactivado')
      cargar()
    } catch { /* manejado */ }
  }

  const estaVigente = (c: Cupon) => {
    const ahora = new Date()
    return c.activo && new Date(c.fechaInicio) <= ahora && new Date(c.fechaFin) >= ahora
  }

  const estadoCupon = (c: Cupon) => {
    if (!c.activo) return { label: 'Inactivo', color: 'bg-gray-100 text-gray-500' }
    if (c.usos >= c.usosMaximos) return { label: 'Agotado', color: 'bg-red-100 text-red-600' }
    if (new Date() < new Date(c.fechaInicio)) return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' }
    if (new Date() > new Date(c.fechaFin)) return { label: 'Expirado', color: 'bg-red-100 text-red-600' }
    return { label: 'Vigente', color: 'bg-green-100 text-green-700' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Cupones</h1>
          <p className="text-sm text-gray-500 mt-1">{cupones.filter(estaVigente).length} cupones vigentes</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary text-sm">+ Nuevo cupón</button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Código', 'Descuento', 'Mínimo', 'Usos', 'Vigencia', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse"/></td></tr>
                ))
              ) : cupones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay cupones creados aún
                  </td>
                </tr>
              ) : cupones.map((c) => {
                const estado = estadoCupon(c)
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-primary-700 text-sm">{c.codigo}</div>
                      {c.descripcion && <div className="text-xs text-gray-400 mt-0.5">{c.descripcion}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        {c.tipo === 'porcentaje'
                          ? `${Number(c.valor)}% OFF`
                          : `S/. ${Number(c.valor).toFixed(2)} OFF`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {Number(c.minimo) > 0 ? `S/. ${Number(c.minimo).toFixed(2)}` : 'Sin mínimo'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{c.usos} / {c.usosMaximos}</div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min((c.usos / c.usosMaximos) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{new Date(c.fechaInicio).toLocaleDateString('es-PE')}</div>
                      <div>→ {new Date(c.fechaFin).toLocaleDateString('es-PE')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${estado.color}`}>{estado.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(c)}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                          Editar
                        </button>
                        {c.activo && (
                          <button onClick={() => handleDesactivar(c.id, c.codigo)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editando ? 'Editar cupón' : 'Nuevo cupón'}
            </h2>
            <div className="space-y-4">

              {/* Código */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  disabled={!!editando}
                  className="input-field text-sm font-mono uppercase disabled:bg-gray-50"
                  placeholder="VERANO20"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="Ej: Descuento de verano 20%"
                />
              </div>

              {/* Tipo y valor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    className="input-field text-sm">
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto_fijo">Monto fijo (S/.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Valor <span className="text-red-500">*</span>
                    <span className="text-gray-400 ml-1">({form.tipo === 'porcentaje' ? '%' : 'S/.'})</span>
                  </label>
                  <input type="number" value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                    className="input-field text-sm" placeholder="20" min="0"
                    max={form.tipo === 'porcentaje' ? '100' : undefined}/>
                </div>
              </div>

              {/* Mínimo y usos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Compra mínima (S/.)</label>
                  <input type="number" value={form.minimo}
                    onChange={(e) => setForm((f) => ({ ...f, minimo: e.target.value }))}
                    className="input-field text-sm" placeholder="0" min="0"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Usos máximos</label>
                  <input type="number" value={form.usosMaximos}
                    onChange={(e) => setForm((f) => ({ ...f, usosMaximos: e.target.value }))}
                    className="input-field text-sm" placeholder="100" min="1"/>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha inicio <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={form.fechaInicio}
                    onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                    className="input-field text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha fin <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={form.fechaFin}
                    onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                    className="input-field text-sm"/>
                </div>
              </div>

              {/* Preview */}
              {form.codigo && form.valor && (
                <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                  <p className="text-xs text-primary-600 font-medium mb-1">Vista previa:</p>
                  <p className="font-mono font-bold text-primary-700 text-lg">{form.codigo}</p>
                  <p className="text-sm text-primary-600">
                    {form.tipo === 'porcentaje'
                      ? `${form.valor}% de descuento`
                      : `S/. ${form.valor} de descuento`}
                    {Number(form.minimo) > 0 && ` en compras mayores a S/. ${form.minimo}`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear cupón'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}