import { prisma } from "@/lib/prisma";
import { resolveOpeningDateRange } from "@/lib/date-utils";
import { OpeningDateFilter } from "@/lib/types";
import { MockSandboxProvider } from "./data-providers/mock-sandbox-provider";
import { processCompanyBatch } from "./data-ingestion/ingestion-engine";
import { evaluateCompanyAgainstICP } from "./icp-engine";

export interface RunDiscoveryOptions {
  campaignId?: string;
  organizationId?: string;
  limit?: number;
  executionId?: string;
  resumeFromCheckpoint?: boolean;
}

export interface DiscoveryResult {
  executionId: string;
  companiesDiscovered: number;
  companiesCreated: number;
  companiesUpdated: number;
  companiesSkipped: number;
  leadsCreated: number;
  checkpointId?: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
}

/**
 * Motor de Descoberta Contínua de Empresas com Checkpoints e Resiliência (Fase 6)
 */
export async function runCompanyDiscovery(
  options: RunDiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const executionId = options.executionId || `disc-exec-${Date.now()}`;
  const limit = options.limit || 50;

  // 1. Carregar Campanhas Ativas (ou Campanha Específica)
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: { in: ["LIVE", "SIMULATION"] },
      ...(options.campaignId ? { id: options.campaignId } : {}),
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    },
  });

  let totalDiscovered = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalLeadsCreated = 0;

  // 2. Verificar se existe Checkpoint anterior para retomar
  let previousCheckpoint = null;
  if (options.resumeFromCheckpoint && options.campaignId) {
    previousCheckpoint = await prisma.discoveryCheckpoint.findFirst({
      where: {
        campaignId: options.campaignId,
        status: { in: ["RUNNING", "PARTIAL"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const startPage = previousCheckpoint ? previousCheckpoint.page + 1 : 1;

  // Criar novo Checkpoint de execução
  const checkpoint = await prisma.discoveryCheckpoint.create({
    data: {
      organizationId: options.organizationId || null,
      campaignId: options.campaignId || null,
      provider: "MOCK_SANDBOX",
      page: startPage,
      executionId,
      status: "RUNNING",
    },
  });

  // 3. Executar Descoberta para cada Campanha
  for (const campaign of campaigns) {
    let openingDateFilter: OpeningDateFilter = { mode: "PRESET", preset: "LAST_30_DAYS" };
    try {
      const parsedFilters = JSON.parse(campaign.icpFilters || "{}");
      if (parsedFilters.openingDate) {
        openingDateFilter = parsedFilters.openingDate;
      }
    } catch {}

    const resolvedDates = resolveOpeningDateRange(openingDateFilter);

    // Buscar empresas do provedor
    const provider = new MockSandboxProvider();
    const discoveryRes = await provider.discoverCompanies({
      fromDate: resolvedDates.from || undefined,
      toDate: resolvedDates.to || undefined,
      limit,
      page: startPage,
    });
    const rawBatch = discoveryRes.records;

    totalDiscovered += rawBatch.length;

    // 4. Ingestão e Deduplicação via Data Ingestion Engine
    const ingestionResult = await processCompanyBatch(
      rawBatch,
      {
        providerName: "MOCK_SANDBOX",
        mode: "INCREMENTAL",
        correlationId: executionId,
      }
    );

    totalCreated += ingestionResult.recordsCreated;
    totalUpdated += ingestionResult.recordsUpdated;
    totalSkipped += ingestionResult.recordsSkipped;

    // 5. Avaliação de ICP e Criação de Leads para a Campanha
    const ingestedCnpjs = rawBatch.map((r) => r.cnpj.replace(/\D/g, ""));
    const companies = await prisma.company.findMany({
      where: { cnpj: { in: ingestedCnpjs } },
      include: { contacts: true },
    });

    for (const comp of companies) {
      const icpResult = evaluateCompanyAgainstICP(
        {
          cnpj: comp.cnpj,
          razaoSocial: comp.razaoSocial,
          nomeFantasia: comp.nomeFantasia,
          cnaePrincipal: comp.cnaePrincipal,
          cnaesSecundarios: comp.cnaesSecundarios ? JSON.parse(comp.cnaesSecundarios) : [],
          municipio: comp.municipio,
          uf: comp.uf,
          porte: comp.porte || "ME",
          capitalSocial: comp.capitalSocial || 10000,
          dataAbertura: comp.dataAbertura,
          situacao: comp.situacao,
          telefone: comp.telefone,
          email: comp.email,
        },
        campaign.icpFilters ? JSON.parse(campaign.icpFilters) : {}
      );

      if (icpResult.matched && icpResult.score >= campaign.minScore) {
        // Criar ou atualizar Lead de forma idempotente
        const lead = await prisma.lead.upsert({
          where: {
            organizationId_campaignId_companyId: {
              organizationId: campaign.organizationId,
              campaignId: campaign.id,
              companyId: comp.id,
            },
          },
          create: {
            organizationId: campaign.organizationId,
            campaignId: campaign.id,
            companyId: comp.id,
            score: icpResult.score,
            status: "QUALIFIED",
            qualificationReason: JSON.stringify(icpResult.reasons),
          },
          update: {
            score: icpResult.score,
            qualificationReason: JSON.stringify(icpResult.reasons),
          },
        });

        if (lead) {
          totalLeadsCreated++;
        }
      }
    }
  }

  // 6. Atualizar Checkpoint com status COMPLETED
  await prisma.discoveryCheckpoint.update({
    where: { id: checkpoint.id },
    data: {
      status: "COMPLETED",
      recordsProcessed: totalDiscovered,
    },
  });

  return {
    executionId,
    companiesDiscovered: totalDiscovered,
    companiesCreated: totalCreated,
    companiesUpdated: totalUpdated,
    companiesSkipped: totalSkipped,
    leadsCreated: totalLeadsCreated,
    checkpointId: checkpoint.id,
    status: "COMPLETED",
  };
}
