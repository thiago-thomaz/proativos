import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [orgs, subscriptions, totalLeads, totalMessages, dlqCount] = await Promise.all([
      prisma.organization.findMany({ include: { subscription: { include: { plan: true } } } }),
      prisma.organizationSubscription.findMany({ include: { plan: true } }),
      prisma.lead.count(),
      prisma.outreachMessage.count(),
      prisma.deadLetterMessage.count({ where: { status: "PENDING" } }),
    ]);

    let mrr = 0;
    let arr = 0;
    const planCounts: Record<string, number> = { FREE: 0, STARTER: 0, PRO: 0, ENTERPRISE: 0 };

    for (const sub of subscriptions) {
      if (sub.status === "ACTIVE" && sub.plan) {
        mrr += sub.plan.priceMonthly;
        arr += sub.plan.priceAnnual || sub.plan.priceMonthly * 12;
        const key = sub.plan.slug.toUpperCase();
        planCounts[key] = (planCounts[key] || 0) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      saasMetrics: {
        totalOrganizations: orgs.length,
        activeOrganizations: orgs.filter((o) => o.active).length,
        mrr,
        arr,
        planDistribution: planCounts,
        totalLeadsProcessed: totalLeads,
        totalMessagesDispatched: totalMessages,
        pendingDlqMessages: dlqCount,
        infrastructureHealth: "HEALTHY",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
