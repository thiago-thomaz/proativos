import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOrganizationRoi } from "@/services/revenue/roi-engine";
import { getPipelineSummary } from "@/services/revenue/crm-engine";
import { getRevenueAttributionReport } from "@/services/revenue/attribution-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const [roi, pipeline, attribution] = await Promise.all([
      calculateOrganizationRoi(org.id),
      getPipelineSummary(org.id),
      getRevenueAttributionReport(org.id),
    ]);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
