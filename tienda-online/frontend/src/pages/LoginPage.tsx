// =============================================
// PÁGINA: INICIO DE SESIÓN
// =============================================

import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore }  from '../store/auth.store'
import { useCartStore }  from '../store/cart.store'

export default function LoginPage() {
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [errores,   setErrores]   = useState<Record<string, string>>({})
  const { login, cargando }       = useAuthStore()
  const { obtenerCarrito }        = useCartStore()
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const validar = () => {
    const e: Record<string, string> = {}
    if (!email)              e.email    = 'El email es requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email inválido'
    if (!password)           e.password = 'La contraseña es requerida'
    return e
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length > 0) { setErrores(e2); return }
    setErrores({})

    try {
      await login(email, password)
      await obtenerCarrito()
      toast.success('¡Bienvenido de vuelta!')
      navigate(from, { replace: true })
    } catch {
      // El error se maneja en el interceptor de axios
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <span className="text-5xl">🛍️</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">Iniciar sesión</h1>
            <p className="text-gray-500 text-sm mt-1">Accede a tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${errores.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="tu@email.com"
                autoComplete="email"
              />
              {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${errores.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errores.password && <p className="text-red-500 text-xs mt-1">{errores.password}</p>}
            </div>

            <button type="submit" disabled={cargando} className="btn-primary w-full py-2.5">
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-semibold mb-1">🔑 Credenciales de prueba:</p>
            <p>Admin: <strong>admin@tienda.com</strong> / <strong>admin123</strong></p>
            <p>Cliente: <strong>cliente@tienda.com</strong> / <strong>cliente123</strong></p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
