import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:health");

export async function GET() {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    apiLogger.debug("Health check executado com sucesso: DB conectado");

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime(),
      version: "1.0.2",
      phase: "FASE 8 - PRODUCTION REALITY AUDITED",
    });
  } catch (error) {
    apiLogger.error("Health check falhou: DB desconectado", { error: String(error) });
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: String(error),
      },
      { status: 503 }
    );
  }
}
