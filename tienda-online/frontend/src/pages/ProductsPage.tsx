// =============================================
// PÁGINA: CARRITO DE COMPRAS
// =============================================

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'

type CartItem = {
  id: number
  cantidad: number
  precio: number
  subtotal: number
  producto: {
    id: number
    nombre: string
    imagen: string | null
    precioVenta: number
    stock: number
  }
}

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

  const formatMoney = (value: number) => {
    return `S/. ${Number(value || 0).toFixed(2)}`
  }

  const getImageSrc = (imagen?: string | null) => {
    return imagen || 'https://placehold.co/120x120/e5e7eb/6b7280?text=Producto'
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://placehold.co/120x120/e5e7eb/6b7280?text=Producto'
  }

  const handleCantidad = async (itemId: number, cantidad: number) => {
    setActualizando(itemId)

    try {
      await actualizarCantidad(itemId, cantidad)
    } catch {
      // El store ya muestra el toast.error correspondiente.
    } finally {
      setActualizando(null)
    }
  }

  const handleAumentarCantidad = async (item: CartItem) => {
    const nuevaCantidad = item.cantidad + 1

    if (nuevaCantidad > item.producto.stock) {
      toast.error(
        `Ya alcanzaste el stock máximo disponible: ${item.producto.stock} unidades.`,
        {
          id: `stock-max-${item.id}`,
          duration: 3500,
        }
      )
      return
    }

    await handleCantidad(item.id, nuevaCantidad)
  }

  const handleDisminuirCantidad = async (item: CartItem) => {
    const nuevaCantidad = item.cantidad - 1
    await handleCantidad(item.id, nuevaCantidad)
  }

  const handleEliminar = async (itemId: number) => {
    setActualizando(itemId)

    try {
      await eliminarItem(itemId)
    } catch {
      // El store ya muestra el error si ocurre.
    } finally {
      setActualizando(null)
    }
  }

  const handleVaciarCarrito = async () => {
    if (!carrito || carrito.items.length === 0) return

    const confirmar = window.confirm('¿Deseas vaciar todo el carrito?')

    if (!confirmar) return

    await vaciarCarrito()
  }

  const hayProblemasStock = () => {
    if (!carrito) return false
    return carrito.items.some((item) => item.cantidad > item.producto.stock)
  }

  const checkStockAntesDeCheckout = async () => {
    if (!carrito) return false

    setValidandoStock(true)

    try {
      const problema = carrito.items.find(
        (item) => item.cantidad > item.producto.stock
      )

      if (problema) {
        toast.error(
          `Stock insuficiente para "${problema.producto.nombre}". Disponible: ${problema.producto.stock} unidades.`,
          {
            id: `checkout-stock-${problema.id}`,
            duration: 4500,
          }
        )
        return false
      }

      return true
    } catch {
      toast.error('No se pudo validar el stock del carrito.')
      return false
    } finally {
      setValidandoStock(false)
    }
  }

  const handleCheckout = async () => {
    if (!carrito || carrito.items.length === 0) {
      toast.error('Tu carrito está vacío.')
      return
    }

    const stockOk = await checkStockAntesDeCheckout()

    if (stockOk) {
      navigate('/checkout')
    }
  }

  if (!usuario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Necesitas iniciar sesión
          </h2>
          <p className="text-gray-500 mb-7">
            Para ver tu carrito debes estar autenticado.
          </p>
          <Link to="/login" className="btn-primary">
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (!carrito || carrito.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10">
          <p className="text-6xl mb-4">🛒</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-500 mb-7">
            Agrega productos para comenzar tu compra.
          </p>
          <Link to="/products" className="btn-primary">
            Ver productos
          </Link>
        </div>
      </div>
    )
  }

  const stockConProblemas = hayProblemasStock()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
              Carrito de compras
            </p>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-1">
              Mi Carrito
            </h1>
            <p className="text-gray-500 mt-2">
              Revisa tus productos, cantidades disponibles y el resumen de tu pedido.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Continuar comprando
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {carrito.items.map((item) => {
            const estaActualizando = actualizando === item.id
            const stockMaximoAlcanzado = item.cantidad >= item.producto.stock
            const sinStock = item.producto.stock === 0
            const stockBajo = item.producto.stock > 0 && item.producto.stock <= 5
            const stockInsuficiente = item.cantidad > item.producto.stock

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  stockInsuficiente
                    ? 'border-orange-200 ring-2 ring-orange-50'
                    : 'border-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex gap-4">
                  {/* Imagen */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                    <img
                      src={getImageSrc(item.producto.imagen)}
                      alt={item.producto.nombre}
                      onError={handleImageError}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          {item.producto.nombre}
                        </h3>

                        <p className="text-primary-700 font-extrabold mt-1">
                          {formatMoney(item.precio)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleEliminar(item.id)}
                        disabled={estaActualizando}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Eliminar producto"
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

                    {/* Stock badge */}
                    <div className="mt-3">
                      {sinStock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                          🚫 Sin stock disponible
                        </span>
                      ) : stockInsuficiente ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                          ⚠️ Stock insuficiente. Disponible: {item.producto.stock}
                        </span>
                      ) : stockMaximoAlcanzado ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                          ⚠️ Máximo disponible alcanzado: {item.producto.stock}
                        </span>
                      ) : stockBajo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                          ⚡ Últimas {item.producto.stock} unidades disponibles
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                          ✅ Stock disponible: {item.producto.stock}
                        </span>
                      )}
                    </div>

                    {/* Cantidad y subtotal */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <button
                            onClick={() => handleDisminuirCantidad(item)}
                            disabled={estaActualizando}
                            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold transition-colors disabled:opacity-40"
                            title="Disminuir cantidad"
                          >
                            -
                          </button>

                          <span className="w-14 h-10 flex items-center justify-center text-sm font-bold bg-white text-gray-900">
                            {estaActualizando ? '...' : item.cantidad}
                          </span>

                          <button
                            onClick={() => handleAumentarCantidad(item)}
                            disabled={estaActualizando}
                            title={
                              stockMaximoAlcanzado
                                ? `Stock máximo disponible: ${item.producto.stock}`
                                : 'Aumentar cantidad'
                            }
                            className={`w-10 h-10 font-bold transition-colors disabled:opacity-40 ${
                              stockMaximoAlcanzado
                                ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            +
                          </button>
                        </div>

                        <span className="text-xs text-gray-500">
                          Cantidad seleccionada
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-500">Subtotal</p>
                        <p className="text-lg font-extrabold text-gray-900">
                          {formatMoney(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={handleVaciarCarrito}
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            🗑️ Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/70 p-6 sticky top-24">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-extrabold text-xl text-gray-900">
                  Resumen del pedido
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Total actualizado automáticamente
                </p>
              </div>
              <span className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-xl">
                🧾
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({carrito.resumen.cantidadItems} items)</span>
                <span className="font-semibold text-gray-800">
                  {formatMoney(carrito.resumen.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>IGV (18%)</span>
                <span className="font-semibold text-gray-800">
                  {formatMoney(carrito.resumen.impuesto)}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="font-bold text-emerald-600">Gratis</span>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-lg text-gray-900">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold text-primary-700">
                    {formatMoney(carrito.resumen.total)}
                  </span>
                </div>
              </div>
            </div>

            {stockConProblemas && (
              <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm font-bold text-orange-700">
                  ⚠️ Revisa el stock
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Algunos productos superan la disponibilidad actual.
                </p>
              </div>
            )}

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
              className="block text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4"
            >
              ← Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
