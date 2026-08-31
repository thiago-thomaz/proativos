import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLANS, subscribeOrganizationToPlan, syncSubscriptionPlans } from "@/services/revenue/billing-engine";

export async function GET(req: NextRequest) {
  try {
    await syncSubscriptionPlans();
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
    });

    return NextResponse.json({ success: true, count: plans.length, plans });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const result = await subscribeOrganizationToPlan(org.id, body.planSlug);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
