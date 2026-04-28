// =============================================
// PÁGINA: CARRITO DE COMPRAS
// =============================================

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'

export default function CartPage() {
  const {
    carrito,
    obtenerCarrito,
    actualizarCantidad,
    eliminarItem,
    vaciarCarrito,
  } = useCartStore()

  const { usuario } = useAuthStore()
  const [actualizando, setActualizando] = useState<number | null>(null)
  const [validandoStock, setValidandoStock] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (usuario) obtenerCarrito()
  }, [usuario, obtenerCarrito])

  const handleCantidad = async (itemId: number, cantidad: number) => {
    setActualizando(itemId)

    try {
      await actualizarCantidad(itemId, cantidad)
    } catch {
      // El mensaje ya lo muestra el store con toast.error()
    } finally {
      setActualizando(null)
    }
  }

  const handleAumentarCantidad = async (item: any) => {
    const nuevaCantidad = item.cantidad + 1

    if (nuevaCantidad > item.producto.stock) {
      toast.error(`Stock insuficiente. Disponible: ${item.producto.stock}`)
      return
    }

    await handleCantidad(item.id, nuevaCantidad)
  }

  const handleDisminuirCantidad = async (item: any) => {
    const nuevaCantidad = item.cantidad - 1
    await handleCantidad(item.id, nuevaCantidad)
  }

  const handleEliminar = async (itemId: number) => {
    setActualizando(itemId)

    try {
      await eliminarItem(itemId)
    } catch {
      // El mensaje ya lo muestra el store
    } finally {
      setActualizando(null)
    }
  }

  const checkStockAntesDeCheckout = async () => {
    if (!carrito) return false

    setValidandoStock(true)

    try {
      const hayProblemas = carrito.items.some(
        (item) => item.cantidad > item.producto.stock
      )

      if (hayProblemas) {
        toast.error(
          'Algunos productos ya no tienen stock suficiente. Por favor revisa tu carrito.'
        )
        return false
      }

      return true
    } catch {
      toast.error('No se pudo validar el stock del carrito')
      return false
    } finally {
      setValidandoStock(false)
    }
  }

  const handleCheckout = async () => {
    if (!carrito || carrito.items.length === 0) {
      toast.error('Tu carrito está vacío')
      return
    }

    const hayProblemas = carrito.items.some(
      (item) => item.cantidad > item.producto.stock
    )

    if (hayProblemas) {
      toast.error(
        'Algunos productos ya no tienen stock suficiente. Por favor revisa tu carrito.'
      )
      return
    }

    const stockOk = await checkStockAntesDeCheckout()

    if (stockOk) {
      navigate('/checkout')
    }
  }

  if (!usuario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Necesitas iniciar sesión
        </h2>
        <p className="text-gray-500 mb-6">
          Para ver tu carrito debes estar autenticado
        </p>
        <Link to="/login" className="btn-primary">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Tu carrito está vacío
        </h2>
        <p className="text-gray-500 mb-6">
          Agrega productos para comenzar tu compra
        </p>
        <Link to="/products" className="btn-primary">
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Mi Carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {carrito.items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4"
            >
              {/* Imagen */}
              <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={
                    item.producto.imagen ||
                    'https://via.placeholder.com/80x80/e5e7eb/9ca3af?text=?'
                  }
                  alt={item.producto.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {item.producto.nombre}
                </h3>

                <p className="text-primary-600 font-bold mt-1">
                  S/. {item.precio.toFixed(2)}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  {/* Control de cantidad */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleDisminuirCantidad(item)}
                      disabled={actualizando === item.id}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition-colors disabled:opacity-40"
                    >
                      -
                    </button>

                    <span className="px-4 py-1.5 text-sm font-medium bg-white min-w-[2.5rem] text-center">
                      {actualizando === item.id ? '...' : item.cantidad}
                    </span>

                    <button
                      onClick={() => handleAumentarCantidad(item)}
                      disabled={actualizando === item.id}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition-colors disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm font-semibold text-gray-700">
                    = S/. {item.subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Mensaje visual de stock */}
                <div className="mt-2">
                  {item.producto.stock === 0 ? (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                      🚫 Sin stock disponible
                    </span>
                  ) : item.producto.stock < item.cantidad ? (
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                      ⚠️ Stock insuficiente. Disponible: {item.producto.stock}
                    </span>
                  ) : item.producto.stock <= 5 ? (
                    <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                      ⚡ ¡Últimas {item.producto.stock} unidades!
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                      Stock disponible: {item.producto.stock}
                    </span>
                  )}
                </div>
              </div>

              {/* Eliminar */}
              <button
                onClick={() => handleEliminar(item.id)}
                disabled={actualizando === item.id}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 self-start"
                title="Eliminar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}

          {/* Vaciar carrito */}
          <button
            onClick={vaciarCarrito}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            🗑️ Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-lg text-gray-900 mb-5">
              Resumen del pedido
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({carrito.resumen.cantidadItems} items)</span>
                <span>S/. {carrito.resumen.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>IGV (18%)</span>
                <span>S/. {carrito.resumen.impuesto.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="text-green-600">Gratis</span>
              </div>

              <hr className="border-gray-100" />

              <div className="flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span className="text-primary-700">
                  S/. {carrito.resumen.total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={validandoStock}
              className={`btn-primary w-full py-4 text-lg mt-6 shadow-lg shadow-primary-200 transition-all active:scale-[0.98] ${
                validandoStock ? 'opacity-50 cursor-not-allowed grayscale' : ''
              }`}
            >
              {validandoStock ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Validando stock...
                </span>
              ) : (
                'Proceder al pago →'
              )}
            </button>

            <Link
              to="/products"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              ← Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
