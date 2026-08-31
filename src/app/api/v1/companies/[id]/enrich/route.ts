import { NextRequest, NextResponse } from "next/server";
import { enrichCompanyContacts } from "@/services/contact-enrichment/enrichment-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider, forceRefresh, correlationId, dryRun, organizationId } = body;

    const enrichment = await enrichCompanyContacts(params.id, {
      providerName: provider,
      forceRefresh,
      correlationId,
      dryRun,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      message: dryRun ? "Simulação de enriquecimento concluída" : "Enriquecimento executado com sucesso",
      enrichment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao enriquecer empresa", detail: error.message },
      { status: 500 }
    );
  }
}
