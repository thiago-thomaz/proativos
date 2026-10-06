import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nativeScheduler } from "@/services/automation";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:health");

export async function GET() {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    apiLogger.debug("Health check executado com sucesso: DB conectado");

    const schedulerStatus = nativeScheduler.getStatus();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        activeTimers: schedulerStatus.activeTimers,
        totalJobs: schedulerStatus.totalJobs,
        totalExecutions: schedulerStatus.totalExecutions,
      },
      uptime: process.uptime(),
      version: "2.0.0",
      architecture: "AUTONOMOUS_SRE_ZERO_N8N",
      coolifyReady: true,
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
