import { NextRequest, NextResponse } from "next/server";
import { enrichCompanyContacts } from "@/services/contact-enrichment/enrichment-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:companies:enrich");

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider, forceRefresh, correlationId, dryRun, organizationId } = body;

    apiLogger.info("COMPANY_ENRICH_REQUEST", {
      companyId: params.id,
      provider,
      dryRun: Boolean(dryRun),
    }, { organizationId });

    const enrichment = await enrichCompanyContacts(params.id, {
      providerName: provider,
      forceRefresh,
      correlationId,
      dryRun,
      organizationId,
    });

    apiLogger.info("COMPANY_ENRICH_SUCCESS", {
      companyId: params.id,
      success: enrichment.success,
    }, { organizationId });

    return NextResponse.json({
      success: true,
      message: dryRun ? "Simulação de enriquecimento concluída" : "Enriquecimento executado com sucesso",
      enrichment,
    });
  } catch (error: any) {
    apiLogger.error("COMPANY_ENRICH_ERROR", error, { companyId: params.id });
    return NextResponse.json(
      { error: "Erro ao enriquecer empresa", detail: error.message },
      { status: 500 }
    );
  }
}
