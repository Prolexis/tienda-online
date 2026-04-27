import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface Notificacion {
  id:        number
  tipo:      string
  mensaje:   string
  leida:     boolean
  vinculo:   string | null
  createdAt: string
}

export default function NotificationPanel() {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const cargarNotificaciones = async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotificaciones(data.data)
      setNoLeidas(data.meta.totalNoLeidas)
    } catch (err) {
      console.error('Error al cargar notificaciones:', err)
    }
  }

  useEffect(() => {
    cargarNotificaciones()
    // Polling cada 30 segundos para nuevas alertas
    const interval = setInterval(cargarNotificaciones, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const marcarComoLeida = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      setNoLeidas(prev => Math.max(0, prev - 1))
    } catch (err) {
      toast.error('Error al marcar como leída')
    }
  }

  const marcarTodasComoLeidas = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
      setNoLeidas(0)
      toast.success('Todas marcadas como leídas')
    } catch (err) {
      toast.error('Error al marcar todas')
    }
  }

  const getIcono = (tipo: string) => {
    switch (tipo) {
      case 'alerta_stock': return '⚠️'
      case 'pedido_nuevo': return '📦'
      case 'pago_confirmado': return '💳'
      default: return '🔔'
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 text-primary-200 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
      >
        <span className="text-xl">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          </span>
        )}
      </button>

      {/* Panel Desplegable */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">Notificaciones</h3>
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasComoLeidas}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notificaciones.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {notificaciones.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.leida && marcarComoLeida(n.id)}
                      className={`p-4 flex gap-3 transition-colors cursor-pointer hover:bg-gray-50 
                        ${!n.leida ? 'bg-primary-50/30' : ''}`}
                    >
                      <div className="text-xl flex-shrink-0 mt-0.5">
                        {getIcono(n.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${!n.leida ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                          {n.mensaje}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-400">
                            {new Date(n.createdAt).toLocaleString('es-PE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {n.vinculo && (
                            <Link
                              to={n.vinculo}
                              onClick={() => setAbierto(false)}
                              className="text-[10px] font-bold text-primary-600 hover:underline"
                            >
                              Ver detalle →
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.leida && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm text-gray-500">No tienes notificaciones</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <Link
                to="/admin/notifications"
                onClick={() => setAbierto(false)}
                className="text-xs font-bold text-gray-500 hover:text-primary-600 transition-colors"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
