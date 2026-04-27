// =============================================
// CLIENTE PRISMA - Singleton para toda la app
// =============================================

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// En desarrollo, evitar múltiples instancias por hot-reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
    ],
  });

(prisma as any).$on('error', (e: any) => {
  logger.error('Prisma error:', e);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
