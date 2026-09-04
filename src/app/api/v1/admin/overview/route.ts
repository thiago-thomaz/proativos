import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGlobalKillSwitchActive } from "@/services/outreach-eligibility";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:admin:overview");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Gerando overview administrativo global");
    const [
      totalCompanies,
      totalLeads,
      totalContacts,
      totalCampaigns,
      totalOutreach,
      dlqPendingCount,
      providers,
      recentExecutions,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.lead.count(),
      prisma.contact.count(),
      prisma.campaign.count(),
      prisma.outreachMessage.count(),
      prisma.deadLetterMessage.count({ where: { status: "PENDING" } }),
      prisma.providerConfig.findMany(),
      prisma.n8nExecutionAudit.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const leadStatusSummary = await prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    apiLogger.info("Overview administrativo consolidado", {
      totalCompanies,
      totalLeads,
      totalContacts,
      totalCampaigns,
      dlqPendingCount,
    });

    return NextResponse.json({
      success: true,
      system: {
        globalKillSwitch: isGlobalKillSwitchActive(),
        status: "OPERATIONAL",
        timestamp: new Date(),
      },
      counts: {
        totalCompanies,
        totalLeads,
        totalContacts,
        totalCampaigns,
        totalOutreach,
        dlqPendingCount,
      },
      providers,
      recentExecutions,
      leadStatusSummary,
    });
  } catch (error: any) {
    apiLogger.error("Falha ao gerar overview administrativo", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao gerar overview administrativo", detail: error.message },
      { status: 500 }
    );
  }
}
