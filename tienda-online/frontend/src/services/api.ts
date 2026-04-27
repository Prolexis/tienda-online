// =============================================
// SERVICIO API - Axios con interceptores JWT
// =============================================

import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Inyectar token en cada request ─────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Manejar respuestas y refresh token ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Token expirado: intentar refrescar
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh-token', { refreshToken })
          localStorage.setItem('accessToken', data.data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`
          return api(originalRequest)
        } catch {
          // Refresh falló: limpiar sesión
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }

    // Mostrar error al usuario
    const mensaje = error.response?.data?.message || 'Error de conexión con el servidor'
    if (error.response?.status !== 401) toast.error(mensaje)

    return Promise.reject(error)
  }
)

export default api
