// =============================================
// LAYOUT ADMINISTRATIVO - Menú por rol
// =============================================

import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import NotificationPanel from './NotificationPanel'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface NavItem {
  to:     string
  label:  string
  icono:  string
  exact?: boolean
  roles:  string[]
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icono: '📊', exact: true, roles: ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'] },
  { to: '/admin/products', label: 'Productos',  icono: '📦',              roles: ['ADMIN', 'GERENTE_INVENTARIO', 'VENDEDOR'] },
  { to: '/admin/orders',   label: 'Pedidos',    icono: '🧾',              roles: ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'] },
  { to: '/admin/users', label: 'Clientes', icono: '👥', roles: ['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR'] },
  { to: '/admin/payments/verifications', label: 'Caja y Verificación', icono: '🏦', roles: ['ADMIN', 'DUEÑO'] },
  { to: '/admin/reports', label: 'Reportes', icono: '📊', roles: ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'] },
  { to: '/admin/categories', label: 'Categorías', icono: '🏷️', roles: ['ADMIN', 'GERENTE_INVENTARIO'] },
  { to: '/admin/brands', label: 'Marcas', icono: '✨', roles: ['ADMIN', 'GERENTE_INVENTARIO'] },
  { to: '/admin/config', label: 'Configuración', icono: '⚙️', roles: ['ADMIN'] },
  { to: '/admin/cupones', label: 'Cupones', icono: '🎟️', roles: ['ADMIN', 'GERENTE_VENTAS'] },
  { to: '/admin/inventario', label: 'Inventario', icono: '🏭', roles: ['ADMIN', 'GERENTE_INVENTARIO'] },
  { to: '/admin/profile', label: 'Mi Perfil', icono: '👤', roles: ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR'] },
]

const ROL_LABELS: Record<string, string> = {
  ADMIN:              '👑 Administrador',
  GERENTE_VENTAS:     '📈 Gerente de Ventas',
  GERENTE_INVENTARIO: '📦 Gerente de Inventario',
  VENDEDOR:           '🛒 Vendedor',
}

export default function AdminLayout() {
  const { usuario } = useAuthStore()
  const roles = usuario?.roles ?? []

  const rolPrincipal = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR']
    .find((r) => roles.includes(r)) ?? ''

  const itemsVisibles   = navItems.filter((item) => item.roles.some((r) => roles.includes(r)))

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-60 bg-primary-800 text-white flex-shrink-0 flex flex-col">

        {/* Info usuario */}
        <div className="p-5 border-b border-primary-700">
          <p className="font-bold text-sm">Panel de Administración</p>
          <p className="text-xs text-primary-300 mt-0.5 truncate">{usuario?.email}</p>
          {rolPrincipal && (
            <span className="inline-block mt-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
              {ROL_LABELS[rolPrincipal]}
            </span>
          )}
        </div>

        {/* Navegación */}
        <nav className="p-3 space-y-1">
          {itemsVisibles.map(({ to, label, icono, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-700 hover:text-white'}`
              }
            >
              <span>{icono}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Info permisos — al fondo */}
        <div className="mt-auto p-4 border-t border-primary-700">
          <p className="text-xs text-primary-400">
            {roles.includes('ADMIN')
              ? '✅ Acceso total al sistema'
              : roles.includes('GERENTE_VENTAS')
              ? '📊 Acceso a ventas y reportes'
              : roles.includes('GERENTE_INVENTARIO')
              ? '📦 Acceso a inventario'
              : '👁️ Acceso de solo lectura'}
          </p>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-gray-500">
              Sistema de Gestión / <span className="text-gray-900 font-bold">Admin</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationPanel />
            <div className="h-8 w-px bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{usuario?.nombre} {usuario?.apellido}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{rolPrincipal}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                {usuario?.nombre[0]}{usuario?.apellido[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          <Outlet/>
        </div>
      </main>
    </div>
  )
}