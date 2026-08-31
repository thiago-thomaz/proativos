import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGlobalKillSwitchActive } from "@/services/outreach-eligibility";

export async function GET(req: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: "Falha ao gerar overview administrativo", detail: error.message },
      { status: 500 }
    );
  }
}
