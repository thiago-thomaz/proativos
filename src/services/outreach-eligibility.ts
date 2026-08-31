import { prisma } from "@/lib/prisma";
import { OutreachEligibilityResult } from "@/lib/types";

// Estado em memória para Kill Switch Global
let globalKillSwitchActive = false;

export function setGlobalKillSwitch(active: boolean) {
  globalKillSwitchActive = active;
}

export function isGlobalKillSwitchActive(): boolean {
  return globalKillSwitchActive;
}

export interface EligibilityCheckOptions {
  ignoreBusinessHoursForTesting?: boolean;
  simulationMode?: boolean;
}

/**
 * Validador Central de Elegibilidade de Outreach (Lead Gatekeeper - Fase 5)
 */
export async function checkOutreachEligibility(
  leadId: string,
  campaignId: string,
  options: EligibilityCheckOptions = {}
): Promise<OutreachEligibilityResult> {
  const reasons: string[] = [];
  const blockedReasons: string[] = [];

  // 1. Kill Switch Global
  if (globalKillSwitchActive && !options.simulationMode) {
    blockedReasons.push("Kill Switch Global ativo (todos os envios estão suspensos no sistema).");
  }

  // 2. Buscar Lead, Empresa, Contatos e Campanha
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: {
        include: {
          contacts: {
            where: { optOut: false },
            orderBy: [{ confidenceScore: "desc" }],
          },
        },
      },
      campaign: true,
      organization: {
        include: {
          creditAccount: true,
        },
      },
    },
  });

  if (!lead) {
    return {
      eligible: false,
      reasons: [],
      blockedReasons: ["Lead não encontrado."],
      recommendedChannel: null,
    };
  }

  const campaign =
    campaignId && campaignId !== lead.campaignId
      ? (await prisma.campaign.findUnique({ where: { id: campaignId } })) || lead.campaign
      : lead.campaign;

  // 3. Status da Campanha (Deve ser LIVE ou SIMULATION)
  if (campaign.status === "PAUSED") {
    blockedReasons.push("Campanha está pausada (Campaign Kill Switch).");
  } else if (campaign.status !== "LIVE" && campaign.status !== "SIMULATION" && !options.simulationMode) {
    blockedReasons.push(`Campanha em status '${campaign.status}' não permite envios.`);
  }

  // 4. Qualificação do Lead (ICP Score >= minScore)
  if (lead.score < campaign.minScore) {
    blockedReasons.push(`Score do Lead (${lead.score}) é inferior ao mínimo exigido pela campanha (${campaign.minScore}).`);
  } else {
    reasons.push(`✓ Lead qualificado com Score ${lead.score} >= ${campaign.minScore}.`);
  }

  // 5. Situação Cadastral da Empresa
  if (lead.company.situacao !== "ATIVA") {
    blockedReasons.push(`Empresa com situação cadastral '${lead.company.situacao}' (não ativa).`);
  } else {
    reasons.push("✓ Empresa com situação cadastral ATIVA.");
  }

  // 6. Verificação de Saldo de Créditos
  const creditBalance = lead.organization.creditAccount?.balance ?? 0;
  if (creditBalance <= 0 && !options.simulationMode) {
    blockedReasons.push("Saldo de créditos insuficiente para realizar outreach.");
  } else {
    reasons.push(`✓ Saldo de créditos disponível (${creditBalance} créditos).`);
  }

  // 7. Horário Comercial e Finais de Semana (Fuso America/Sao_Paulo)
  if (!options.ignoreBusinessHoursForTesting && !options.simulationMode) {
    const now = new Date();
    // Conversão para horário de Brasília
    const spTimeStr = now.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const spDay = now.toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" });

    const isWeekend = spDay === "Sat" || spDay === "Sun";
    if (isWeekend && ((spDay === "Sat" && !campaign.allowSaturday) || (spDay === "Sun" && !campaign.allowSunday))) {
      blockedReasons.push(`Envio bloqueado no final de semana (${spDay}) conforme configuração da campanha.`);
    }

    const startHour = campaign.sendTimeStart || "09:00";
    const endHour = campaign.sendTimeEnd || "18:00";

    if (spTimeStr < startHour || spTimeStr > endHour) {
      blockedReasons.push(`Fora do horário comercial permitido (${startHour} às ${endHour} em America/Sao_Paulo). Hora atual: ${spTimeStr}.`);
    } else {
      reasons.push(`✓ Dentro da janela de horário comercial (${spTimeStr}).`);
    }
  }

  // 8. Limite Diário da Campanha
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const messagesToday = await prisma.outreachMessage.count({
    where: {
      campaignId: campaign.id,
      createdAt: { gte: today },
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
  });

  if (messagesToday >= campaign.dailyMessageLimit && !options.simulationMode) {
    blockedReasons.push(`Limite diário da campanha atingido (${messagesToday}/${campaign.dailyMessageLimit} mensagens hoje).`);
  }

  // 9. Contatos e Supressão
  const contacts = lead.company.contacts;
  if (contacts.length === 0) {
    blockedReasons.push("Empresa não possui contatos ativos cadastrados.");
  }

  // Identificar melhor contato e melhor canal
  let targetContact = contacts.find((c) => c.tipo === "DECISION_MAKER") || contacts[0];
  let recommendedChannel: "EMAIL" | "WHATSAPP" | null = null;

  if (targetContact) {
    // Checar se contato está na SuppressionList da organização
    const suppressed = await prisma.suppressionList.findFirst({
      where: {
        organizationId: lead.organizationId,
        identifier: { in: [targetContact.email || "", targetContact.telefone || ""].filter(Boolean) },
      },
    });

    if (suppressed) {
      blockedReasons.push(`Contato '${targetContact.nome}' está na lista de supressão (Opt-Out).`);
    }

    const hasVerifiedWhatsApp = targetContact.whatsappStatus === "VERIFIED" || (targetContact.telefone && targetContact.telefone.length === 11 && targetContact.telefone[2] === "9");
    const hasValidEmail = Boolean(targetContact.email && targetContact.email.includes("@") && targetContact.emailStatus !== "INVALID");

    const strategy = campaign.channelStrategy || "BOTH";
    const priority = campaign.channelPriority || "WHATSAPP_FIRST";

    if (strategy === "WHATSAPP" || (strategy === "BOTH" && priority === "WHATSAPP_FIRST")) {
      if (hasVerifiedWhatsApp) {
        recommendedChannel = "WHATSAPP";
      } else if (hasValidEmail && strategy === "BOTH") {
        recommendedChannel = "EMAIL";
      } else {
        blockedReasons.push("WhatsApp não verificado/indisponível para o contato.");
      }
    } else if (strategy === "EMAIL" || (strategy === "BOTH" && priority === "EMAIL_FIRST")) {
      if (hasValidEmail) {
        recommendedChannel = "EMAIL";
      } else if (hasVerifiedWhatsApp && strategy === "BOTH") {
        recommendedChannel = "WHATSAPP";
      } else {
        blockedReasons.push("E-mail corporativo inválido/indisponível para o contato.");
      }
    }

    if (recommendedChannel) {
      reasons.push(`✓ Canal recomendado definido: ${recommendedChannel} para ${targetContact.nome}.`);
    }
  }

  // 10. Frequência de Contato (Intervalo Mínimo)
  const lastMessage = await prisma.outreachMessage.findFirst({
    where: {
      leadId: lead.id,
      status: { in: ["SENT", "DELIVERED", "OPENED", "REPLIED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastMessage && !options.simulationMode) {
    const daysSinceLast = (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const minInterval = campaign.minContactIntervalDays || 3;
    if (daysSinceLast < minInterval) {
      blockedReasons.push(`Intervalo mínimo entre abordagens não atingido (${daysSinceLast.toFixed(1)} dias < ${minInterval} dias).`);
    }
  }

  const eligible = blockedReasons.length === 0 && recommendedChannel !== null;

  return {
    eligible,
    reasons,
    blockedReasons,
    recommendedChannel,
    targetContact: targetContact
      ? {
          id: targetContact.id,
          nome: targetContact.nome,
          cargo: targetContact.cargo,
          tipo: targetContact.tipo as any,
          telefone: targetContact.telefone,
          email: targetContact.email,
          whatsappStatus: targetContact.whatsappStatus as any,
          emailStatus: targetContact.emailStatus as any,
        }
      : null,
  };
}
