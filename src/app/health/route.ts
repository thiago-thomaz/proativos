import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nativeScheduler } from "@/services/automation";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const scheduler = nativeScheduler.getStatus();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      scheduler: scheduler.isRunning ? "running" : "idle",
      uptime: process.uptime(),
      coolify: "ready",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message,
      },
      { status: 503 }
    );
  }
}
