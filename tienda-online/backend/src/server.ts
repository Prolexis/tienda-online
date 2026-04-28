// =============================================
// SERVIDOR PRINCIPAL - Express + TypeScript
// =============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { cartRoutes } from './routes/cart.routes';
import { orderRoutes } from './routes/order.routes';
import { adminRoutes } from './routes/admin.routes';
import { reportRoutes } from './routes/report.routes';
import { addressRoutes } from './routes/address.routes';
import { wishlistRoutes } from './routes/wishlist.routes';
import { reviewRoutes } from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

// ─── Fix BigInt serialization PostgreSQL ──────────────────────
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export const app = express();
const PORT = process.env.PORT || 4000;

// ─── Seguridad ────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// ─── CORS dinámico para localhost + Vercel + dominios propios ──
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tienda-online-git-main-prolexis-projects.vercel.app',
  'https://tienda-online-p5kom7mhk-prolexis-projects.vercel.app',
];

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : []),
].filter(Boolean) as string[];

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins])
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permite solicitudes sin origin: Postman, Render health check, curl, etc.
    if (!origin) {
      return callback(null, true);
    }

    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Permite previews automáticos de Vercel del proyecto tienda-online
    const isVercelPreview =
      /^https:\/\/tienda-online-[a-zA-Z0-9-]+-prolexis-projects\.vercel\.app$/.test(
        origin
      );

    // Permite también el dominio git-main de Vercel
    const isVercelGitMain =
      /^https:\/\/tienda-online-git-[a-zA-Z0-9-]+-prolexis-projects\.vercel\.app$/.test(
        origin
      );

    if (isAllowedOrigin || isVercelPreview || isVercelGitMain) {
      return callback(null, true);
    }

    console.warn(`CORS bloqueado para origen: ${origin}`);

    return callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.',
  },
});

app.use('/api/', limiter);

// ─── Parsers y logging ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: {
      write: (msg) => logger.info(msg.trim()),
    },
  })
);

// ─── Swagger / Documentación de API ───────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tienda Online API',
      version: '1.0.0',
      description: 'API REST del sistema de carrito de compras',
    },
    servers: [
      {
        url: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/v1`
          : `http://localhost:${PORT}/api/v1`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Archivos estáticos: uploads ──────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── Ruta principal del Backend ───────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Backend funcionando correctamente',
    api: '/api/v1',
    health: '/api/health',
  });
});

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// ─── Rutas de la API ──────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/address', addressRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// ─── Manejo centralizado de errores ───────────────────────────
app.use(errorHandler);

// ─── Iniciar servidor ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
    logger.info(`📚 Documentación API disponible en /api/docs`);
  });
}

export default app;
