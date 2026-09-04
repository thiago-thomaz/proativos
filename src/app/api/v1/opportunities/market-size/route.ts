import { NextRequest, NextResponse } from "next/server";
import { calculateMarketSizeAndFunnel } from "@/services/opportunity-intelligence";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:opportunities:market-size");

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
    apiLogger.info("Calculando tamanho de mercado e funil", { organizationId, campaignId });

    const metrics = await calculateMarketSizeAndFunnel(organizationId, campaignId);
    apiLogger.info("Métricas de mercado calculadas", { organizationId, universeCount: metrics.universeCount, readyCount: metrics.readyCount });

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao calcular tamanho de mercado", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao calcular tamanho de mercado" },
      { status: 500 }
    );
  }
}
