// A single shared Prisma client for the whole app.
//
// Why the global trick below? In development, Next.js hot-reloads your code on
// every save. Without this guard, each reload would create a NEW database
// connection, and you'd quickly exhaust connections ("too many clients").
// Caching the client on `globalThis` reuses one instance across reloads.
import { PrismaClient } from "@prisma/client";

// `globalThis` is the same object across reloads, so we stash the client there.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log queries in dev so you can SEE the SQL Prisma generates — great for learning.
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// In production each server start is fresh, so we only cache in development.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
