// =============================================
// PÁGINA: REGISTRO DE USUARIO
// =============================================

import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth.store'
import { useCartStore } from '../store/cart.store'

export default function RegisterPage() {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirmar: '' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const { register, cargando }  = useAuthStore()
  const { obtenerCarrito }      = useCartStore()
  const navigate                = useNavigate()

  const actualizar = (campo: string, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores((prev) => { const n = { ...prev }; delete n[campo]; return n })
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.nombre   || form.nombre.length < 2)   e.nombre   = 'Mínimo 2 caracteres'
    if (!form.apellido || form.apellido.length < 2)  e.apellido = 'Mínimo 2 caracteres'
    if (!form.email    || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (!form.password || form.password.length < 8)  e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmar)            e.confirmar = 'Las contraseñas no coinciden'
    return e
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length > 0) { setErrores(e2); return }
    setErrores({})

    try {
      await register({ nombre: form.nombre, apellido: form.apellido, email: form.email, password: form.password })
      await obtenerCarrito()
      toast.success('¡Cuenta creada exitosamente!')
      navigate('/')
    } catch { /* manejado en interceptor */ }
  }

  const campoTexto = (campo: keyof typeof form, label: string, tipo = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={tipo}
        value={form[campo]}
        onChange={(e) => actualizar(campo, e.target.value)}
        className={`input-field ${errores[campo] ? 'border-red-400 focus:ring-red-400' : ''}`}
        placeholder={placeholder}
      />
      {errores[campo] && <p className="text-red-500 text-xs mt-1">{errores[campo]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <span className="text-5xl">👤</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">Crear cuenta</h1>
            <p className="text-gray-500 text-sm mt-1">Únete a nuestra tienda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              {campoTexto('nombre',   'Nombre',   'text', 'Juan')}
              {campoTexto('apellido', 'Apellido', 'text', 'Pérez')}
            </div>
            {campoTexto('email',    'Correo electrónico', 'email',    'tu@email.com')}
            {campoTexto('password', 'Contraseña',         'password', '••••••••')}
            {campoTexto('confirmar','Confirmar contraseña','password', '••••••••')}

            <button type="submit" disabled={cargando} className="btn-primary w-full py-2.5 mt-2">
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
