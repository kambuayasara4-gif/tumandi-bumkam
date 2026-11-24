// lib/prisma.js
// Singleton PrismaClient instance untuk mencegah duplikasi koneksi database pada Next.js

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
