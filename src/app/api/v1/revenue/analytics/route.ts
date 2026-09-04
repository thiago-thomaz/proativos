import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOrganizationRoi } from "@/services/revenue/roi-engine";
import { getPipelineSummary } from "@/services/revenue/crm-engine";
import { getRevenueAttributionReport } from "@/services/revenue/attribution-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:revenue:analytics");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Obtendo métricas de analytics de receita");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Nenhuma organização encontrada para analytics de receita");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const [roi, pipeline, attribution] = await Promise.all([
      calculateOrganizationRoi(org.id),
      getPipelineSummary(org.id),
      getRevenueAttributionReport(org.id),
    ]);

    apiLogger.info("Métricas de receita consolidadas", {
      orgId: org.id,
      totalRevenue: roi.totalRevenue,
      pipelineValue: pipeline.totalPipelineValue,
      wonValue: pipeline.totalWonValue,
    });

    return NextResponse.json({
      success: true,
      revenueSummary: {
        totalRevenue: roi.totalRevenue,
        pipelineValue: pipeline.totalPipelineValue,
        wonValue: pipeline.totalWonValue,
        roiPercentage: roi.roiPercentage,
        cac: roi.cac,
        ltv: roi.ltv,
        roas: roi.roas,
      },
      roi,
      pipeline,
      attribution,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao obter analytics de receita", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
