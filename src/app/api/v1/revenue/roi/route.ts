import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOrganizationRoi } from "@/services/revenue/roi-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:revenue:roi");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Calculando métricas de ROI");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para cálculo de ROI");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const metrics = await calculateOrganizationRoi(org.id);
    apiLogger.info("Métricas de ROI calculadas", {
      orgId: org.id,
      roiPercentage: metrics.roiPercentage,
      totalRevenue: metrics.totalRevenue,
    });
    return NextResponse.json({ success: true, ...metrics });
  } catch (error: any) {
    apiLogger.error("Erro ao calcular ROI", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
