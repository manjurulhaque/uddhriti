import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/security/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  adapter: PrismaPg | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    max: process.env.NODE_ENV === "production" ? 15 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

pool.on("error", (err) => {
  // Catch errors on idle clients so they get evicted from the pool cleanly without crashing
  console.warn("[pg:pool] Idle client disconnected:", err.message);
});

const adapter =
  globalForPrisma.adapter ??
  new PrismaPg(pool, {
    onPoolError: (err) => {
      console.warn("[PrismaPg] Pool error:", err.message);
    },
    onConnectionError: (err) => {
      console.warn("[PrismaPg] Connection error:", err.message);
    },
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
  globalForPrisma.adapter = adapter;
}
