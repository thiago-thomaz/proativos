import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MockSandboxProvider } from "@/services/data-providers/mock-sandbox-provider";
import { processCompanyBatch } from "@/services/data-ingestion/ingestion-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:admin:data-engine");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Buscando métricas e histórico de ingestão do data-engine");
    const jobs = await prisma.ingestionJob.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      include: {
        _count: { select: { events: true } },
      },
    });

    const enrichmentJobs = await prisma.enrichmentJob.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      include: {
        company: {
          select: { id: true, cnpj: true, razaoSocial: true },
        },
      },
    });

    const providers = await prisma.providerConfig.findMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const companiesToday = await prisma.company.count({
      where: { createdAt: { gte: today } },
    });

    const totalCompanies = await prisma.company.count();

    const eventsToday = await prisma.companyEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: today } },
      _count: { id: true },
    });

    // Métricas de Enriquecimento (Fase 4)
    const enrichmentsToday = await prisma.enrichmentJob.count({
      where: { startedAt: { gte: today } },
    });
    const completedEnrichments = await prisma.enrichmentJob.count({
      where: { status: "COMPLETED" },
    });
    const failedEnrichments = await prisma.enrichmentJob.count({
      where: { status: "FAILED" },
    });

    const totalContacts = await prisma.contact.count();
    const verifiedWhatsapps = await prisma.contact.count({
      where: { whatsappStatus: "VERIFIED" },
    });
    const decisionMakers = await prisma.contact.count({
      where: { tipo: "DECISION_MAKER" },
    });
    const verifiedEmails = await prisma.contact.count({
      where: { emailStatus: { in: ["VERIFIED", "FORMAT_VALID"] } },
    });

    apiLogger.info("Métricas de data-engine recuperadas com sucesso", {
      totalCompanies,
      companiesToday,
      totalContacts,
      completedEnrichments,
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalCompanies,
        companiesToday,
        activeProviders: providers.length > 0 ? providers.length : 2,
        eventsToday,
        // Fase 4
        enrichmentsToday,
        completedEnrichments,
        failedEnrichments,
        totalContacts,
        verifiedWhatsapps,
        decisionMakers,
        verifiedEmails,
        estimatedCost: (completedEnrichments * 0.05).toFixed(2),
      },
      providers: providers.length > 0 ? providers : [
        {
          providerName: "RECEITA_FEDERAL",
          healthStatus: "HEALTHY",
          lastSyncAt: new Date().toISOString(),
          lastLatencyMs: 42,
        },
        {
          providerName: "MOCK_SANDBOX",
          healthStatus: "HEALTHY",
          lastSyncAt: new Date().toISOString(),
          lastLatencyMs: 12,
        },
        {
          providerName: "RECEITA_QSA_ENRICHMENT",
          healthStatus: "HEALTHY",
          lastSyncAt: new Date().toISOString(),
          lastLatencyMs: 25,
        },
      ],
      recentJobs: jobs,
      recentEnrichmentJobs: enrichmentJobs,
    });
  } catch (error) {
    apiLogger.error("Falha ao buscar métricas de ingestão", { error: String(error) });
    return NextResponse.json(
      { error: "Falha ao buscar métricas de ingestão", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider = "MOCK_SANDBOX", mode = "INCREMENTAL", limit = 100, dryRun = false } = body;
    apiLogger.info("Executando job de ingestão manual", { provider, mode, limit, dryRun });

    let records: any[] = [];

    if (provider === "MOCK_SANDBOX") {
      const mock = new MockSandboxProvider();
      const discovery = await mock.discoverCompanies({ mode, limit });
      records = discovery.records;
    } else if (Array.isArray(body.records)) {
      records = body.records;
    }

    const summary = await processCompanyBatch(records, {
      providerName: provider,
      mode,
      dryRun,
    });

    apiLogger.info("Job de ingestão concluído", { provider, recordsRead: summary.recordsRead, recordsCreated: summary.recordsCreated, recordsFailed: summary.recordsFailed });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    apiLogger.error("Falha ao executar job de ingestão", { error: String(error) });
    return NextResponse.json(
      { error: "Falha ao executar job de ingestão", details: String(error) },
      { status: 500 }
    );
  }
}
