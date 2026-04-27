// =============================================
// COMPONENTE: RUTA PROTEGIDA
// =============================================

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

interface Props {
  children:      React.ReactNode
  roles?:        string[]  // Si se especifica, al menos uno debe coincidir
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { usuario } = useAuthStore()
  const location    = useLocation()

  if (!usuario) {
    // Redirigir a login guardando la ruta actual
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.some((r) => usuario.roles.includes(r))) {
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
