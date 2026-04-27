// =============================================
// COMPONENTE: NAVBAR
// =============================================

import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'
import { useCartStore } from '../../store/cart.store'

export default function Navbar() {
  const { usuario, logout, esCliente } = useAuthStore()
  const { totalItems }                          = useCartStore()
  const navigate                                = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🛍️</span>
            <span className="text-xl font-bold text-primary-700">TiendaOnline</span>
          </Link>

          {/* Navegación */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Inicio
            </Link>
            <Link to="/products" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Productos
            </Link>
            {usuario && !esCliente() && (
              <Link to="/admin" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                ⚙️ Admin
              </Link>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">

            {/* Carrito — solo para clientes */}
            {usuario && esCliente() && (
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {totalItems()}
                  </span>
                )}
              </Link>
            )}

            {/* Usuario */}
            {usuario ? (
              <div className="flex items-center gap-2">

                {/* Links para todos los autenticados */}
                <div className="hidden sm:flex items-center gap-3 mr-2 border-r border-gray-100 pr-3">
                  {esCliente() && (
                    <>
                      <Link to="/wishlist"
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                        Favoritos
                      </Link>
                      <Link to="/orders"
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                        Mis Pedidos
                      </Link>
                    </>
                  )}
                  <Link to="/profile"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                    Mi Perfil
                  </Link>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {usuario.nombre[0]}{usuario.apellido[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {usuario.nombre}
                  </span>
                </div>
                <button onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors p-1">
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="btn-secondary text-sm">Ingresar</Link>
                <Link to="/register" className="btn-primary  text-sm">Registrarse</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}