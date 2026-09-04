import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { subscribeOrganizationToPlan, syncSubscriptionPlans } from "@/services/revenue/billing-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:billing:plans");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Sincronizando e listando planos de assinatura");
    await syncSubscriptionPlans();
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
    });

    apiLogger.info("Planos de assinatura recuperados", { count: plans.length });
    return NextResponse.json({ success: true, count: plans.length, plans });
  } catch (error: any) {
    apiLogger.error("Erro ao listar planos de assinatura", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na contratação de plano");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planSlug } = body;
    apiLogger.info("Contratando plano de assinatura", { organizationId: user.organizationId, planSlug });

    if (!planSlug) {
      apiLogger.warn("planSlug ausente na requisição");
      return NextResponse.json({ error: "planSlug é obrigatório" }, { status: 400 });
    }

    const result = await subscribeOrganizationToPlan(user.organizationId, planSlug);
    apiLogger.info("Plano assinado com sucesso", { organizationId: user.organizationId, planSlug });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    apiLogger.error("Erro ao assinar plano", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
