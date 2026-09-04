import { prisma } from "@/lib/prisma";
import { AttributionTouchType } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const attrLogger = new AppLogger("attribution");

export interface AttributeRevenueParams {
  organizationId: string;
  dealId: string;
  totalRevenue: number;
  model?: AttributionTouchType;
}

/**
 * Motor de Atribuição de Receita (Fase 7)
 * Rastreia a receita fechada de volta para campanhas, mensagens de outreach e canais
 */
export async function attributeDealRevenue(params: AttributeRevenueParams) {
  const { organizationId, dealId, totalRevenue, model = "LAST_TOUCH" } = params;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      lead: {
        include: {
          outreachMessages: {
            where: { status: { in: ["SENT", "DELIVERED", "REPLIED"] } },
            orderBy: { createdAt: "asc" },
          },
          campaign: true,
        },
      },
    },
  });

  if (!deal || !deal.lead) {
    throw new Error("Deal ou Lead não encontrado para atribuição.");
  }

  const messages = deal.lead.outreachMessages;
  const attributions: any[] = [];

  if (messages.length === 0) {
    // Atribuição direta para a campanha ou marketplace
    const directAttr = await prisma.revenueAttribution.create({
      data: {
        organizationId,
        dealId: deal.id,
        leadId: deal.leadId,
        campaignId: deal.campaignId,
        channel: "DIRECT",
        touchType: "LAST_TOUCH",
        attributedValue: totalRevenue,
        percentage: 100.0,
        metadata: JSON.stringify({ reason: "Venda direta sem mensagens registradas" }),
      },
    });
    attributions.push(directAttr);
    attrLogger.info("REVENUE_ATTRIBUTED_DIRECT", {
      dealId: deal.id,
      totalRevenue,
      model,
    }, { organizationId });
    return { dealId, totalRevenue, attributions };
  }

  if (model === "LAST_TOUCH") {
    const lastMsg = messages[messages.length - 1];
    const attr = await prisma.revenueAttribution.create({
      data: {
        organizationId,
        dealId: deal.id,
        leadId: deal.leadId,
        campaignId: deal.campaignId,
        channel: lastMsg.channel,
        touchType: "LAST_TOUCH",
        attributedValue: totalRevenue,
        percentage: 100.0,
        metadata: JSON.stringify({ messageId: lastMsg.id, channel: lastMsg.channel }),
      },
    });
    attributions.push(attr);
  } else if (model === "FIRST_TOUCH") {
    const firstMsg = messages[0];
    const attr = await prisma.revenueAttribution.create({
      data: {
        organizationId,
        dealId: deal.id,
        leadId: deal.leadId,
        campaignId: deal.campaignId,
        channel: firstMsg.channel,
        touchType: "FIRST_TOUCH",
        attributedValue: totalRevenue,
        percentage: 100.0,
        metadata: JSON.stringify({ messageId: firstMsg.id, channel: firstMsg.channel }),
      },
    });
    attributions.push(attr);
  } else {
    // Linear (Multi-Touch)
    const perTouchVal = totalRevenue / messages.length;
    const perTouchPct = 100.0 / messages.length;

    for (const msg of messages) {
      const attr = await prisma.revenueAttribution.create({
        data: {
          organizationId,
          dealId: deal.id,
          leadId: deal.leadId,
          campaignId: deal.campaignId,
          channel: msg.channel,
          touchType: "ASSISTED",
          attributedValue: perTouchVal,
          percentage: perTouchPct,
          metadata: JSON.stringify({ messageId: msg.id, channel: msg.channel }),
        },
      });
      attributions.push(attr);
    }
  }

  attrLogger.info("REVENUE_ATTRIBUTED", {
    dealId: deal.id,
    totalRevenue,
    model,
    touchesCount: messages.length,
  }, { organizationId });

  return {
    dealId,
    totalRevenue,
    model,
    touchesCount: messages.length,
    attributions,
  };
}

/**
 * Consulta performance de receita agrupada por Campanha, Canal e Vendedor
 */
export async function getRevenueAttributionReport(organizationId: string) {
  const attributions = await prisma.revenueAttribution.findMany({
    where: { organizationId },
    include: { campaign: true, deal: { include: { owner: true } } },
  });

  const byCampaign: Record<string, { name: string; revenue: number; count: number }> = {};
  const byChannel: Record<string, { channel: string; revenue: number; count: number }> = {};
  const byOwner: Record<string, { name: string; revenue: number; count: number }> = {};

  let totalAttributed = 0;

  for (const attr of attributions) {
    totalAttributed += attr.attributedValue;

    // Por Campanha
    const campId = attr.campaignId || "DIRECT";
    const campName = attr.campaign?.name || "Direto / Marketplace";
    if (!byCampaign[campId]) byCampaign[campId] = { name: campName, revenue: 0, count: 0 };
    byCampaign[campId].revenue += attr.attributedValue;
    byCampaign[campId].count++;

    // Por Canal
    const ch = attr.channel;
    if (!byChannel[ch]) byChannel[ch] = { channel: ch, revenue: 0, count: 0 };
    byChannel[ch].revenue += attr.attributedValue;
    byChannel[ch].count++;

    // Por Vendedor
    const ownerName = attr.deal?.owner?.name || "Não atribuído";
    if (!byOwner[ownerName]) byOwner[ownerName] = { name: ownerName, revenue: 0, count: 0 };
    byOwner[ownerName].revenue += attr.attributedValue;
    byOwner[ownerName].count++;
  }

  return {
    totalAttributed,
    campaigns: Object.values(byCampaign),
    channels: Object.values(byChannel),
    owners: Object.values(byOwner),
  };
}
