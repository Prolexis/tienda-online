// =============================================
// PÁGINA: CHECKOUT - Simulación de Pago
// =============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'

type MetodoPago = 'tarjeta' | 'transferencia' | 'contra_entrega'
type Paso = 1 | 2 | 3

interface FormDireccion {
  id?: number; nombre: string; apellido: string; direccion: string
  ciudad: string; departamento: string; telefono: string
}

export default function CheckoutPage() {
  const { carrito, obtenerCarrito } = useCartStore()
  const [paso, setPaso]             = useState<Paso>(1)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta')
  const [procesando, setProcesando] = useState(false)
  const [ordenCreada, setOrdenCreada] = useState<{ numeroOrden: string; total: number } | null>(null)
  
  // Estado para simulación de tarjeta
  const [datosTarjeta, setDatosTarjeta] = useState({ numero: '', nombre: '', expiracion: '', cvv: '' })

  const [direccionesGuardadas, setDireccionesGuardadas] = useState<FormDireccion[]>([])
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<number | 'nueva' | null>(null)
  
  const [direccion, setDireccion]   = useState<FormDireccion>({
    nombre: '', apellido: '', direccion: '', ciudad: 'Lima', departamento: 'Lima', telefono: ''
  })
  const [erroresDireccion, setErroresDireccion] = useState<Partial<FormDireccion>>({})

  useEffect(() => { 
    obtenerCarrito()
    api.get('/address').then(({ data }) => {
      setDireccionesGuardadas(data.data)
      const principal = data.data.find((d: any) => d.esPrincipal)
      if (principal) {
        setDireccionSeleccionada(principal.id)
      } else if (data.data.length > 0) {
        setDireccionSeleccionada(data.data[0].id)
      } else {
        setDireccionSeleccionada('nueva')
      }
    })
  }, [obtenerCarrito])

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-bold mb-4">Tu carrito está vacío</h2>
        <Link to="/products" className="btn-primary">Ver productos</Link>
      </div>
    )
  }

  const validarDireccion = () => {
    if (direccionSeleccionada !== 'nueva') return true
    const e: Partial<FormDireccion> = {}
    if (!direccion.nombre)    e.nombre    = 'Requerido'
    if (!direccion.apellido)  e.apellido  = 'Requerido'
    if (!direccion.direccion) e.direccion = 'Requerido'
    if (!direccion.ciudad)    e.ciudad    = 'Requerido'
    if (!direccion.telefono)  e.telefono  = 'Requerido'
    setErroresDireccion(e)
    return Object.keys(e).length === 0
  }

  const validarPago = () => {
    if (metodoPago !== 'tarjeta') return true
    if (datosTarjeta.numero.length < 16) return false
    if (!datosTarjeta.nombre) return false
    if (!datosTarjeta.expiracion) return false
    if (datosTarjeta.cvv.length < 3) return false
    return true
  }

  const handleConfirmar = async () => {
    if (!validarDireccion()) { toast.error('Completa todos los campos de envío'); return }
    if (!validarPago()) { toast.error('Completa los datos de pago correctamente'); return }
    
    setProcesando(true)
    
    // Simular latencia de pasarela de pago
    if (metodoPago === 'tarjeta') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    try {
      const payload: any = {
        carritoId:    carrito.id,
        metodoPago,
      }

      if (direccionSeleccionada === 'nueva') {
        payload.direccionNueva = direccion
      } else {
        payload.direccionId = direccionSeleccionada
      }

      const { data } = await api.post('/orders', payload)
      setOrdenCreada({ numeroOrden: data.data.numeroOrden, total: Number(data.data.total) })
      setPaso(3)
      await obtenerCarrito() 
    } catch { /* manejado */ }
    finally { setProcesando(false) }
  }

  // Paso 3: Confirmación exitosa
  if (paso === 3 && ordenCreada) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Compra realizada!</h1>
          <p className="text-gray-500 mb-6">Tu pedido ha sido procesado exitosamente</p>
          <div className="bg-green-50 rounded-xl p-5 mb-6">
            <p className="text-sm text-gray-600">Número de orden</p>
            <p className="text-xl font-bold text-primary-700">{ordenCreada.numeroOrden}</p>
            <p className="text-sm text-gray-600 mt-2">Total pagado</p>
            <p className="text-2xl font-bold text-gray-900">S/. {ordenCreada.total.toFixed(2)}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/orders" className="btn-primary flex-1">Ver mis pedidos</Link>
            <Link to="/products" className="btn-secondary flex-1">Seguir comprando</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Finalizar compra</h1>

      {/* Pasos */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <button
              onClick={() => n < paso && setPaso(n as Paso)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${paso >= n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}
            >{n}</button>
            <span className={`text-sm font-medium ${paso >= n ? 'text-primary-700' : 'text-gray-400'}`}>
              {n === 1 ? 'Dirección' : 'Pago'}
            </span>
            {n < 2 && <div className={`h-px w-8 ${paso > n ? 'bg-primary-600' : 'bg-gray-200'}`}/>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2">
          {/* Paso 1: Dirección */}
          {paso === 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5">📍 Dirección de envío</h2>
              
              {/* Selección de direcciones guardadas */}
              {direccionesGuardadas.length > 0 && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {direccionesGuardadas.map((dir) => (
                    <label key={dir.id} 
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${direccionSeleccionada === dir.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="radio" checked={direccionSeleccionada === dir.id} onChange={() => setDireccionSeleccionada(dir.id!)} className="sr-only" />
                        <span className="font-bold text-xs text-gray-900">{(dir as any).alias}</span>
                        {(dir as any).esPrincipal && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">Principal</span>}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">{dir.direccion}</p>
                      <p className="text-[11px] text-gray-500">{dir.ciudad}, {dir.departamento}</p>
                    </label>
                  ))}
                  <label 
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center
                      ${direccionSeleccionada === 'nueva' ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <input type="radio" checked={direccionSeleccionada === 'nueva'} onChange={() => setDireccionSeleccionada('nueva')} className="sr-only" />
                    <span className="font-bold text-xs text-primary-600">+ Usar otra dirección</span>
                  </label>
                </div>
              )}

              {/* Formulario de nueva dirección */}
              {direccionSeleccionada === 'nueva' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  {(['nombre', 'apellido'] as const).map((campo) => (
                    <div key={campo}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{campo}</label>
                      <input
                        value={direccion[campo]}
                        onChange={(e) => setDireccion((d) => ({ ...d, [campo]: e.target.value }))}
                        className={`input-field ${erroresDireccion[campo] ? 'border-red-400' : ''}`}
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input
                      value={direccion.direccion}
                      onChange={(e) => setDireccion((d) => ({ ...d, direccion: e.target.value }))}
                      className={`input-field ${erroresDireccion.direccion ? 'border-red-400' : ''}`}
                      placeholder="Av. Ejemplo 123, Dpto 4B"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                    <input value={direccion.ciudad} onChange={(e) => setDireccion((d) => ({ ...d, ciudad: e.target.value }))} className="input-field"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                    <select value={direccion.departamento} onChange={(e) => setDireccion((d) => ({ ...d, departamento: e.target.value }))} className="input-field">
                      {['Lima', 'Arequipa', 'Cusco', 'Piura', 'La Libertad', 'Lambayeque', 'Ica', 'Junín', 'Ancash', 'Puno', 'Cajamarca', 'Loreto', 'Tacna', 'Huánuco', 'Moquegua'].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input value={direccion.telefono} onChange={(e) => setDireccion((d) => ({ ...d, telefono: e.target.value }))} className={`input-field ${erroresDireccion.telefono ? 'border-red-400' : ''}`} placeholder="999 888 777"/>
                  </div>
                </div>
              )}
              
              <button onClick={() => { if (validarDireccion()) setPaso(2) }} className="btn-primary mt-6 px-8">
                Continuar al pago →
              </button>
            </div>
          )}

          {/* Paso 2: Método de pago */}
          {paso === 2 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5">💳 Método de pago</h2>
              <div className="space-y-3">
                {([
                  { valor: 'tarjeta',         icono: '💳', titulo: 'Tarjeta de crédito/débito',  desc: 'Visa, Mastercard, American Express' },
                  { valor: 'transferencia',   icono: '🏦', titulo: 'Transferencia bancaria',      desc: 'BCP, BBVA, Interbank, Scotiabank' },
                  { valor: 'contra_entrega',  icono: '🤝', titulo: 'Pago contra entrega',         desc: 'Paga cuando recibas tu pedido' },
                ] as const).map(({ valor, icono, titulo, desc }) => (
                  <label key={valor}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${metodoPago === valor ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input type="radio" value={valor} checked={metodoPago === valor} onChange={() => setMetodoPago(valor)} className="sr-only"/>
                    <span className="text-2xl">{icono}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{titulo}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    {metodoPago === valor && (
                      <svg className="w-5 h-5 text-primary-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </label>
                ))}
              </div>

              {/* Formulario de tarjeta (Simulado) */}
              {metodoPago === 'tarjeta' && (
                <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Datos de la tarjeta</h3>
                    <div className="flex gap-1 text-2xl opacity-50">
                      <span>💳</span><span>🏦</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Número de tarjeta</label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="0000 0000 0000 0000"
                        className="input-field font-mono"
                        value={datosTarjeta.numero}
                        onChange={(e) => setDatosTarjeta({ ...datosTarjeta, numero: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nombre en la tarjeta</label>
                      <input
                        type="text"
                        placeholder="JUAN PEREZ"
                        className="input-field"
                        value={datosTarjeta.nombre}
                        onChange={(e) => setDatosTarjeta({ ...datosTarjeta, nombre: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Exp.</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            maxLength={5}
                            className="input-field text-center"
                            value={datosTarjeta.expiracion}
                            onChange={(e) => setDatosTarjeta({ ...datosTarjeta, expiracion: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">CVV</label>
                          <input
                            type="password"
                            maxLength={3}
                            placeholder="***"
                            className="input-field text-center"
                            value={datosTarjeta.cvv}
                            onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cvv: e.target.value.replace(/\D/g, '') })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 4.946-2.597 9.181-6.5 11.5a11.954 11.954 0 01-11.5-11.5c0-.68.056-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Pago encriptado y seguro con SSL de 256 bits
                  </div>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setPaso(1)}
                  disabled={procesando}
                  className="btn-secondary px-6"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={procesando}
                  className="btn-primary flex-1 py-3 text-lg relative overflow-hidden"
                >
                  {procesando ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Procesando pago...
                    </div>
                  ) : (
                    `Pagar S/. ${carrito.resumen.total.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumen lateral */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Tu pedido</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {carrito.items.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img src={item.producto.imagen || ''} alt={item.producto.nombre} className="w-full h-full object-cover"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-gray-800">{item.producto.nombre}</p>
                    <p className="text-gray-500">x{item.cantidad}</p>
                  </div>
                  <span className="font-semibold text-gray-800 flex-shrink-0">S/. {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <hr className="my-4 border-gray-100"/>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>S/. {carrito.resumen.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>IGV (18%)</span><span>S/. {carrito.resumen.impuesto.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Envío</span><span className="text-green-600">Gratis</span></div>
            </div>
            <div className="flex justify-between font-bold text-lg mt-3 text-gray-900">
              <span>Total</span>
              <span className="text-primary-700">S/. {carrito.resumen.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
