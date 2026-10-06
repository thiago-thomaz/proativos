import { NextRequest, NextResponse } from "next/server";
import { nativeScheduler, NATIVE_JOBS } from "@/services/automation";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:automation:scheduler");

export async function GET(req: NextRequest) {
  try {
    const status = nativeScheduler.getStatus();
    return NextResponse.json({
      success: true,
      engine: "Native Autonomous Scheduler (Zero n8n)",
      status,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao obter status do scheduler", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, jobId } = body;

    if (action === "START") {
      nativeScheduler.start();
      return NextResponse.json({ success: true, message: "Scheduler iniciado com sucesso." });
    }

    if (action === "STOP") {
      nativeScheduler.stop();
      return NextResponse.json({ success: true, message: "Scheduler pausado com sucesso." });
    }

    if (action === "RUN_JOB") {
      if (!jobId) {
        return NextResponse.json({ error: "jobId é obrigatório para RUN_JOB." }, { status: 400 });
      }
      const result = await nativeScheduler.runJob(jobId);
      return NextResponse.json({ success: true, result });
    }

    if (action === "RUN_ALL") {
      const results = await nativeScheduler.runAllJobs();
      return NextResponse.json({ success: true, total: results.length, results });
    }

    return NextResponse.json(
      { error: "Ação não suportada. Use: START, STOP, RUN_JOB ou RUN_ALL." },
      { status: 400 }
    );
  } catch (error: any) {
    apiLogger.error("Erro ao processar comando do scheduler", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
