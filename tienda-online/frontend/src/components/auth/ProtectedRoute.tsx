// =============================================
// COMPONENTE: RUTA PROTEGIDA
// =============================================

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

interface Props {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { usuario } = useAuthStore()
  const location = useLocation()

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Normalizar roles del usuario
  const rolesUsuario = (usuario.roles || []).map((rol: any) => {
    if (typeof rol === 'string') return rol.toUpperCase()
    if (rol?.nombre) return rol.nombre.toUpperCase()
    if (rol?.rol?.nombre) return rol.rol.nombre.toUpperCase()
    return ''
  })

  // Normalizar roles requeridos
  const rolesPermitidos = (roles || []).map((rol) => rol.toUpperCase())

  // Si no se especifican roles, basta con estar autenticado
  if (!roles || roles.length === 0) {
    return <>{children}</>
  }

  // Validar si el usuario tiene algún rol permitido
  const tieneAcceso = rolesPermitidos.some((rol) => rolesUsuario.includes(rol))

  if (!tieneAcceso) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso denegado</h2>
          <p className="text-gray-500">No tienes permisos para ver esta página.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
