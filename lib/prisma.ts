import { PrismaClient } from '@/lib/generated/prisma'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // Connection pooling configuration for serverless environments
    // Ensure your DATABASE_URL uses connection pooler:
    // postgresql://user:pass@pooler.supabase.co:6543/postgres?pgbouncer=true
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
