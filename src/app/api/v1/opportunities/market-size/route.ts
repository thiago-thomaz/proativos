import { NextRequest, NextResponse } from "next/server";
import { calculateMarketSizeAndFunnel } from "@/services/opportunity-intelligence";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/opportunities/market-size
 * Retorna métricas de tamanho de mercado e taxas de conversão do funil de 10 etapas
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || "default-org";
    const campaignId = searchParams.get("campaignId") || undefined;

    const metrics = await calculateMarketSizeAndFunnel(organizationId, campaignId);

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao calcular tamanho de mercado" },
      { status: 500 }
    );
  }
}
