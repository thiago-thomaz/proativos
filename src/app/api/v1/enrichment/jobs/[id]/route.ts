import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.enrichmentJob.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: { id: true, cnpj: true, razaoSocial: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Enrichment Job não encontrado" },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { error: "Erro ao buscar job de enriquecimento", detail: error.message },
      { status: 500 }
    );
  }
}
