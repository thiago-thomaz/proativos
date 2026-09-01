import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { subscribeOrganizationToPlan, syncSubscriptionPlans } from "@/services/revenue/billing-engine";

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
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planSlug } = body;

    if (!planSlug) {
      return NextResponse.json({ error: "planSlug é obrigatório" }, { status: 400 });
    }

    const result = await subscribeOrganizationToPlan(user.organizationId, planSlug);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
