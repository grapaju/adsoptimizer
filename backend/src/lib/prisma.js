// =============================================================================
// PRISMA CLIENT - Singleton para conexão com o banco
// =============================================================================

const { PrismaClient } = require('@prisma/client');

// Criar instância única do Prisma Client
// Em desenvolvimento, evita criar múltiplas conexões com hot reload
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
