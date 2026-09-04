import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:enrichment:job-detail");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    apiLogger.info("Buscando status do job de enriquecimento", { jobId: params.id });
    const job = await prisma.enrichmentJob.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: { id: true, cnpj: true, razaoSocial: true },
        },
      },
    });

    if (!job) {
      apiLogger.warn("Job de enriquecimento não encontrado", { jobId: params.id });
      return NextResponse.json(
        { error: "Enrichment Job não encontrado" },
        { status: 404 }
      );
    }

    apiLogger.info("Status do job de enriquecimento recuperado", { jobId: job.id, status: job.status, provider: job.provider });
    return NextResponse.json({
      jobId: job.id,
      company: job.company,
      provider: job.provider,
      status: job.status,
      fieldsRequested: JSON.parse(job.fieldsRequested || "[]"),
      fieldsFound: JSON.parse(job.fieldsFound || "[]"),
      confidence: job.confidence,
      creditsUsed: job.creditsUsed,
      errorMessage: job.errorMessage,
      correlationId: job.correlationId,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao buscar job de enriquecimento", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Erro ao buscar job de enriquecimento", detail: error.message },
      { status: 500 }
    );
  }
}
