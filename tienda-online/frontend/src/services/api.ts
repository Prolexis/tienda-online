// =============================================
// SERVICIO API - Axios con interceptores JWT
// =============================================

import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Obtener token actual ─────────────────────────────────────
function getAccessToken(): string | null {
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken')

  if (!token || token === 'undefined' || token === 'null') {
    return null
  }

  return token
}

// ─── Limpiar sesión ───────────────────────────────────────────
function clearAuthSession() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('token')
  localStorage.removeItem('authToken')
  localStorage.removeItem('usuario')
}

// ─── Inyectar token en cada request ───────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// ─── Manejar respuestas y refresh token ───────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
        try {
          const { data } = await axios.post(
            `${API_URL}/api/v1/auth/refresh-token`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )

          const newAccessToken =
            data?.data?.accessToken ||
            data?.data?.token ||
            data?.accessToken ||
            data?.token

          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken)
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            return api(originalRequest)
          }
        } catch {
          clearAuthSession()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      }

      clearAuthSession()
      window.location.href = '/login'
    }

    const mensaje =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Error de conexión con el servidor'

    if (error.response?.status !== 401) {
      toast.error(mensaje)
    }

    return Promise.reject(error)
  }
)

export default api
