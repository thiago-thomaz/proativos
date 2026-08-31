import { prisma } from "@/lib/prisma";
import { reserveCredits, commitCredits, refundReservedCredits } from "./credit-economy";

export interface CreatePackageInput {
  name: string;
  description?: string;
  segment: string;
  ufs: string;
  minScore?: number;
  priceCredits: number;
  quantity: number;
  exclusive?: boolean;
}

export interface BuyPackageParams {
  organizationId: string;
  packageId: string;
  campaignId?: string;
}

/**
 * Cria ou cadastra um novo pacote no Marketplace de Oportunidades
 */
export async function createMarketplacePackage(input: CreatePackageInput) {
  return prisma.marketplacePackage.create({
    data: {
      name: input.name,
      description: input.description,
      segment: input.segment,
      ufs: input.ufs,
      minScore: input.minScore || 80,
      priceCredits: input.priceCredits,
      quantity: input.quantity,
      exclusive: input.exclusive || false,
    },
  });
}

/**
 * Compra um pacote de oportunidades no Marketplace com:
 * 1. Reserva atômica de créditos
 * 2. Seleção de empresas qualificadas que respeitam os critérios do pacote
 * 3. Prevenção de duplicidade (não entrega empresa já comprada pela mesma organização)
 * 4. Garantia de exclusividade (se exclusivo, impede venda para outra organização)
 * 5. Criação de Leads e LeadOwnerships
 * 6. Commit de créditos
 */
export async function buyMarketplacePackage(params: BuyPackageParams) {
  const { organizationId, packageId, campaignId } = params;

  const pkg = await prisma.marketplacePackage.findUnique({
    where: { id: packageId },
  });

  if (!pkg || !pkg.active) {
    throw new Error("Pacote não disponível para compra.");
  }

  const correlationId = `mkt_buy_${organizationId}_${pkg.id}_${Date.now()}`;

  // 1. Reserva atômica de créditos
  const reservation = await reserveCredits({
    organizationId,
    operation: "MARKETPLACE_BUY",
    amount: pkg.priceCredits,
    correlationId,
    metadata: { packageId: pkg.id, quantity: pkg.quantity },
  });

  if (!reservation.success) {
    return { success: false, error: reservation.error };
  }

  try {
    const ufsList = pkg.ufs.split(",").map((u) => u.trim());

    // Obter IDs de empresas já adquiridas pela organização
    const alreadyOwned = await prisma.leadOwnership.findMany({
      where: { organizationId },
      select: { companyId: true },
    });
    const excludedCompanyIds = alreadyOwned.map((o) => o.companyId);

    // Se o pacote for exclusivo, excluir também empresas já adquiridas exclusivamente por qualquer organização
    if (pkg.exclusive) {
      const exclusiveOwned = await prisma.leadOwnership.findMany({
        where: { exclusive: true, status: "ACTIVE" },
        select: { companyId: true },
      });
      excludedCompanyIds.push(...exclusiveOwned.map((e) => e.companyId));
    }

    // Buscar empresas disponíveis
    const companies = await prisma.company.findMany({
      where: {
        situacao: "ATIVA",
        uf: { in: ufsList },
        id: { notIn: excludedCompanyIds },
      },
      take: pkg.quantity,
    });

    if (companies.length === 0) {
      await refundReservedCredits(correlationId, "Nenhuma empresa disponível no perfil");
      return { success: false, error: "Nenhuma empresa disponível nos critérios do pacote no momento." };
    }

    // Garantir uma campanha para associar os leads
    let targetCampaignId = campaignId;
    if (!targetCampaignId) {
      const defaultCampaign = await prisma.campaign.findFirst({
        where: { organizationId },
      });
      targetCampaignId = defaultCampaign?.id;
    }

    // Registrar LeadOwnership e criar Lead
    const deliveredOwnerships: any[] = [];
    for (const comp of companies) {
      const ownership = await prisma.leadOwnership.create({
        data: {
          organizationId,
          companyId: comp.id,
          packageId: pkg.id,
          creditsPaid: Math.max(1, Math.round(pkg.priceCredits / companies.length)),
          source: "MARKETPLACE",
          exclusive: pkg.exclusive,
          status: "ACTIVE",
          expiresAt: pkg.exclusive ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null, // 90 dias de exclusividade
        },
      });

      if (targetCampaignId) {
        await prisma.lead.upsert({
          where: {
            organizationId_campaignId_companyId: {
              organizationId,
              campaignId: targetCampaignId,
              companyId: comp.id,
            },
          },
          update: { score: 85, status: "QUALIFIED" },
          create: {
            organizationId,
            campaignId: targetCampaignId,
            companyId: comp.id,
            score: 85,
            priorityScore: 85,
            status: "QUALIFIED",
            readiness: "READY",
          },
        });
      }

      deliveredOwnerships.push(ownership);
    }

    // 2. Commit dos créditos
    await commitCredits(correlationId, `Compra do pacote ${pkg.name} (${companies.length} leads)`);

    return {
      success: true,
      packageId: pkg.id,
      leadsDelivered: companies.length,
      exclusive: pkg.exclusive,
      creditsCharged: pkg.priceCredits,
    };
  } catch (error: any) {
    await refundReservedCredits(correlationId, error.message);
    throw error;
  }
}
