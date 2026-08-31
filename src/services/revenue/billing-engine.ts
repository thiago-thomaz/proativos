import { prisma } from "@/lib/prisma";

export interface PlanDefinition {
  name: string;
  slug: string;
  priceMonthly: number;
  priceAnnual: number;
  monthlyCredits: number;
  maxCampaigns: number;
  maxUsers: number;
  features: string[];
}

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    name: "Free",
    slug: "free",
    priceMonthly: 0,
    priceAnnual: 0,
    monthlyCredits: 50,
    maxCampaigns: 1,
    maxUsers: 1,
    features: ["SIMULATION", "BASIC_CRM", "DISCOVERY_LIMITED"],
  },
  {
    name: "Starter",
    slug: "starter",
    priceMonthly: 297,
    priceAnnual: 2970,
    monthlyCredits: 500,
    maxCampaigns: 5,
    maxUsers: 3,
    features: ["OUTREACH_LIVE", "ENRICHMENT_BASIC", "CRM_PIPELINE", "ANALYTICS_BASIC"],
  },
  {
    name: "Pro",
    slug: "pro",
    priceMonthly: 797,
    priceAnnual: 7970,
    monthlyCredits: 2000,
    maxCampaigns: 20,
    maxUsers: 10,
    features: ["AB_TESTING", "PUBLIC_API", "MARKETPLACE_ACCESS", "SMART_ROUTING", "CUSTOM_WEBHOOKS"],
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    priceMonthly: 1997,
    priceAnnual: 19970,
    monthlyCredits: 10000,
    maxCampaigns: 100,
    maxUsers: 50,
    features: ["WHITE_LABEL", "UNLIMITED_API", "EXCLUSIVE_MARKETPLACE", "DEDICATED_SUPPORT", "CUSTOM_LIMITS"],
  },
];

/**
 * Inicializa ou sincroniza os planos do SaaS no banco
 */
export async function syncSubscriptionPlans() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        monthlyCredits: plan.monthlyCredits,
        maxCampaigns: plan.maxCampaigns,
        maxUsers: plan.maxUsers,
        features: JSON.stringify(plan.features),
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        monthlyCredits: plan.monthlyCredits,
        maxCampaigns: plan.maxCampaigns,
        maxUsers: plan.maxUsers,
        features: JSON.stringify(plan.features),
      },
    });
  }
}

/**
 * Assina ou altera o plano de uma organização com concessão proporcional de créditos
 */
export async function subscribeOrganizationToPlan(
  organizationId: string,
  planSlug: string
) {
  await syncSubscriptionPlans();

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: planSlug.toLowerCase() },
  });

  if (!plan) {
    throw new Error(`Plano '${planSlug}' não encontrado.`);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sub = await prisma.organizationSubscription.upsert({
    where: { organizationId },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    create: {
      organizationId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Atualizar campo plan na organização
  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: plan.slug.toUpperCase() },
  });

  // Conceder créditos mensais do plano na conta
  const creditAccount = await prisma.creditAccount.upsert({
    where: { organizationId },
    update: { balance: { increment: plan.monthlyCredits } },
    create: { organizationId, balance: plan.monthlyCredits },
  });

  await prisma.creditTransaction.create({
    data: {
      accountId: creditAccount.id,
      amount: plan.monthlyCredits,
      type: "PLAN_GRANT",
      description: `Créditos mensais do plano ${plan.name}`,
    },
  });

  return { sub, plan, currentBalance: creditAccount.balance };
}

/**
 * Verifica limites e features ativas da organização
 */
export async function checkPlanLimits(
  organizationId: string,
  featureKey: string
): Promise<{ allowed: boolean; plan: string; reason?: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: { include: { plan: true } },
    },
  });

  if (!org) return { allowed: false, plan: "FREE", reason: "Organização não encontrada" };

  const currentPlan = org.subscription?.plan || (await prisma.subscriptionPlan.findFirst({ where: { slug: "free" } }));
  const features: string[] = currentPlan?.features ? JSON.parse(currentPlan.features) : [];

  if (features.includes(featureKey) || currentPlan?.slug === "enterprise") {
    return { allowed: true, plan: currentPlan?.slug || "starter" };
  }

  return {
    allowed: false,
    plan: currentPlan?.slug || "free",
    reason: `Recurso '${featureKey}' requer upgrade de plano.`,
  };
}
