// =============================================
// APP.TSX - Router principal de la aplicación
// =============================================

import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import ErrorBoundary from './components/common/ErrorBoundary'

// Páginas públicas
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Páginas de cliente autenticado
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/admin/ProfilePage'
import WishlistPage from './pages/WishlistPage'

// Páginas de administración
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCategories from './pages/admin/AdminCategories'
import AdminBrands from './pages/admin/AdminBrands'
import AdminConfig from './pages/admin/AdminConfig'
import AdminCupones from './pages/admin/AdminCupones'
import AdminInventario from './pages/admin/AdminInventario'
import AdminReports from './pages/admin/AdminReports'
import PaymentVerifications from './pages/admin/PaymentVerifications'

const ADMIN_ROLES = [
  'ADMIN',
  'GERENTE_VENTAS',
  'GERENTE_INVENTARIO',
  'VENDEDOR',
  'DUEÑO',
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Notificaciones globales profesionales */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 18,
          right: 18,
        }}
        toastOptions={{
          duration: 3800,
          style: {
            background: '#ffffff',
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '16px',
            padding: '14px 18px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
            maxWidth: '420px',
          },
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '5px solid #16a34a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '5px solid #ef4444',
            },
          },
          loading: {
            iconTheme: {
              primary: '#2563eb',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '5px solid #2563eb',
            },
          },
        }}
      />

      <Navbar />

      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            {/* ── Rutas públicas ──────────────────────────────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<ProductsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Rutas de cliente autenticado ────────────────── */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* ── Rutas de administración ─────────────────────── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />

              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />

              <Route
                path="inventario"
                element={
                  <ProtectedRoute roles={['ADMIN', 'GERENTE_INVENTARIO']}>
                    <AdminInventario />
                  </ProtectedRoute>
                }
              />

              <Route
                path="reports"
                element={
                  <ProtectedRoute
                    roles={[
                      'ADMIN',
                      'GERENTE_VENTAS',
                      'GERENTE_INVENTARIO',
                      'VENDEDOR',
                    ]}
                  >
                    <AdminReports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="cupones"
                element={
                  <ProtectedRoute roles={['ADMIN', 'GERENTE_VENTAS']}>
                    <AdminCupones />
                  </ProtectedRoute>
                }
              />

              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['ADMIN', 'GERENTE_VENTAS', 'VENDEDOR']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="payments/verifications"
                element={
                  <ProtectedRoute roles={['ADMIN', 'DUEÑO']}>
                    <PaymentVerifications />
                  </ProtectedRoute>
                }
              />

              <Route
                path="config"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminConfig />
                  </ProtectedRoute>
                }
              />

              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* ── 404 ─────────────────────────────────────────── */}
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 max-w-md">
                    <p className="text-7xl mb-4">404</p>

                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      Página no encontrada
                    </h2>

                    <p className="text-gray-500 mb-6">
                      La página que buscas no existe o fue movida.
                    </p>

                    <a href="/" className="btn-primary">
                      Volver al inicio
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-xl">🛍️</span>
            <span className="font-semibold">TiendaOnline</span>
          </div>

          <p className="text-sm text-gray-400 text-center sm:text-right">
            © {new Date().getFullYear()} TiendaOnline. Sistema de E-Commerce — React + Node.js + PostgreSQL
          </p>
        </div>
      </footer>
    </div>
  )
}
