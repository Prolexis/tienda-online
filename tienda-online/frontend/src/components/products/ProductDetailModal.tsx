
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Producto {
  id:          number
  sku:         string
  nombre:      string
  descripcion: string | null
  imagenes:    { url: string; esPrincipal: boolean; orden: number }[]
  precioVenta: number
  precioOferta: number | null
  stock:       number
  categoria:   { id: number; nombre: string }
}

interface Props {
  producto: Producto
  onClose: () => void
  onAgregar: () => void
}

export default function ProductDetailModal({ producto, onClose, onAgregar }: Props) {
  const [imgActiva, setImgActiva] = useState(
    producto.imagenes.find(img => img.esPrincipal)?.url || 
    producto.imagenes[0]?.url || 
    'https://placehold.co/600x600/e5e7eb/9ca3af?text=Sin+imagen'
  )
  const [zoom, setZoom] = useState({ x: 0, y: 0, show: false })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    const x = ((e.pageX - left - window.scrollX) / width) * 100
    const y = ((e.pageY - top - window.scrollY) / height) * 100
    setZoom({ x, y, show: true })
  }

  const precioFinal = Number(producto.precioOferta ?? producto.precioVenta)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
      >
        {/* Galería e Imagen Principal */}
        <div className="md:w-1/2 p-6 flex flex-col gap-4">
          <div 
            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoom(z => ({ ...z, show: false }))}
          >
            <img 
              src={imgActiva} 
              alt={producto.nombre}
              className="w-full h-full object-cover"
            />
            {/* Efecto Zoom */}
            {zoom.show && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${imgActiva})`,
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                  backgroundSize: '250%',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}
          </div>

          {/* Miniaturas */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {producto.imagenes.sort((a,b) => a.orden - b.orden).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setImgActiva(img.url)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all
                  ${imgActiva === img.url ? 'border-primary-500 ring-2 ring-primary-100' : 'border-transparent hover:border-gray-300'}`}
              >
                <img src={img.url} alt="Miniatura" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Información del Producto */}
        <div className="md:w-1/2 p-8 flex flex-col relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1">
            <span className="text-xs font-bold text-primary-600 tracking-wider uppercase bg-primary-50 px-3 py-1 rounded-full">
              {producto.categoria.nombre}
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mt-4 leading-tight">{producto.nombre}</h2>
            <p className="text-sm text-gray-400 mt-2">SKU: {producto.sku}</p>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-4xl font-extrabold text-primary-700">S/. {precioFinal.toFixed(2)}</span>
              {producto.precioOferta && (
                <span className="text-xl text-gray-300 line-through">S/. {Number(producto.precioVenta).toFixed(2)}</span>
              )}
            </div>

            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 mb-2">Descripción</h4>
              <p className="text-gray-600 leading-relaxed">
                {producto.descripcion || 'Sin descripción disponible para este producto.'}
              </p>
            </div>

            <div className={`mt-8 p-4 rounded-2xl flex items-center gap-4 ${
              producto.stock === 0 ? 'bg-red-50' : 
              producto.stock <= 5 ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                producto.stock === 0 ? 'bg-red-500 animate-pulse' : 
                producto.stock <= 5 ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  producto.stock === 0 ? 'text-red-700' : 
                  producto.stock <= 5 ? 'text-orange-700' : 'text-green-700'
                }`}>
                  {producto.stock === 0 ? 'Agotado' : producto.stock <= 5 ? '¡Stock Crítico!' : 'En Stock'}
                </p>
                <p className={`text-xs ${
                  producto.stock === 0 ? 'text-red-500' : 
                  producto.stock <= 5 ? 'text-orange-500' : 'text-green-500'
                }`}>
                  {producto.stock === 0 ? 'No disponible por el momento' : 
                   producto.stock <= 5 ? `¡Corre! Solo quedan ${producto.stock} unidades` : 
                   `${producto.stock} unidades disponibles`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => { onAgregar(); onClose(); }}
              disabled={producto.stock === 0}
              className="flex-1 btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
            >
              🛒 Agregar al Carrito
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
