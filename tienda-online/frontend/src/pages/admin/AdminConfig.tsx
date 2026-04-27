// =============================================
// PÁGINA ADMIN: CONFIGURACIÓN DEL SISTEMA
// =============================================

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminConfig() {
  const [form, setForm] = useState({
    empresa:   'Mi Tienda Online',
    ruc:       '12345678901',
    direccion: 'Lima, Perú',
    telefono:  '999999999',
    email:     'contacto@mitienda.com',
    igv:       '18',
    moneda:    'S/.',
  })
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    setGuardando(true)
    // Simulamos guardado — en producción iría a un endpoint
    await new Promise((r) => setTimeout(r, 800))
    toast.success('Configuración guardada correctamente')
    setGuardando(false)
  }

  const campo = (
    key: keyof typeof form,
    label: string,
    placeholder = '',
    tipo = 'text'
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={tipo}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Datos de la empresa que aparecen en facturas y reportes PDF
        </p>
      </div>

      <div className="space-y-6">

        {/* Datos de empresa */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            🏢 Datos de la Empresa
          </h2>
          <div className="space-y-4">
            {campo('empresa',   'Nombre de la empresa',  'Mi Tienda Online')}
            {campo('ruc',       'RUC',                   '12345678901')}
            {campo('direccion', 'Dirección',             'Av. Principal 123, Lima')}
            {campo('telefono',  'Teléfono',              '+51 999 999 999')}
            {campo('email',     'Email de contacto',     'contacto@empresa.com', 'email')}
          </div>
        </div>

        {/* Configuración de ventas */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            💰 Configuración de Ventas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IGV (%)</label>
              <input
                type="number"
                value={form.igv}
                onChange={(e) => setForm((f) => ({ ...f, igv: e.target.value }))}
                className="input-field"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                className="input-field"
              >
                <option value="S/.">S/. — Sol peruano</option>
                <option value="$">$ — Dólar americano</option>
                <option value="€">€ — Euro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vista previa factura */}
        <div className="card border-2 border-dashed border-gray-200">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            📄 Vista previa en facturas
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-bold text-primary-700 text-lg">{form.empresa}</p>
                <p className="text-gray-500">{form.direccion}</p>
                <p className="text-gray-500">RUC: {form.ruc}</p>
                <p className="text-gray-500">{form.email}</p>
                <p className="text-gray-500">{form.telefono}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-700 text-2xl">FACTURA</p>
                <p className="text-gray-500">N°: ORD-20260101-00001</p>
                <p className="text-gray-500">IGV: {form.igv}%</p>
                <p className="text-gray-500">Moneda: {form.moneda}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="btn-primary px-8"
          >
            {guardando ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Guardando...
              </span>
            ) : '💾 Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}