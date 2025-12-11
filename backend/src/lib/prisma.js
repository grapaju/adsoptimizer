// =============================================================================
// PRISMA CLIENT - Singleton para conexão com o banco
// =============================================================================

import { PrismaClient } from '@prisma/client';

// Criar instância única do Prisma Client
// Em desenvolvimento, evita criar múltiplas conexões com hot reload
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
