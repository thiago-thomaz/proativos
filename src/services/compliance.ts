import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const complianceLogger = new AppLogger("compliance");

export interface ComplianceCheckResult {
  allowed: boolean;
  blockedReason?: string;
  checkDetails: {
    checkName: string;
    passed: boolean;
    reason: string;
  }[];
}

export async function validateOutreachCompliance(params: {
  organizationId: string;
  campaignId: string;
  leadId: string;
  channel: "EMAIL" | "WHATSAPP";
  identifier: string; // email address or phone number
}): Promise<ComplianceCheckResult> {
  const checks: ComplianceCheckResult["checkDetails"] = [];

  // 1. Obter Lead, Campanha e Empresa
  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    include: {
      campaign: true,
      company: true,
    },
  });

  if (!lead || lead.organizationId !== params.organizationId) {
    return {
      allowed: false,
      blockedReason: "Lead não encontrado ou não pertence a esta organização.",
      checkDetails: [{ checkName: "Validação de Lead", passed: false, reason: "Lead inválido" }],
    };
  }

  // CHECK 1: Lead pertence ao ICP? (Score >= minScore)
  const isIcpValid = lead.score >= lead.campaign.minScore;
  checks.push({
    checkName: "Check 1: ICP Fit Score",
    passed: isIcpValid,
    reason: isIcpValid ? `Score (${lead.score}) >= Mínimo (${lead.campaign.minScore})` : `Score insuficiente (${lead.score} < ${lead.campaign.minScore})`,
  });

  // CHECK 2: Empresa está ativa?
  const isCompanyActive = lead.company.situacao.toUpperCase() === "ATIVA";
  checks.push({
    checkName: "Check 2: Situação Cadastral Ativa",
    passed: isCompanyActive,
    reason: isCompanyActive ? "Empresa com situação cadastral ATIVA" : `Empresa com situação: ${lead.company.situacao}`,
  });

  // CHECK 3 & 4: Verificação de Opt-out e Bloqueio na SuppressionList
  const suppression = await prisma.suppressionList.findFirst({
    where: {
      organizationId: params.organizationId,
      identifier: params.identifier,
      channel: { in: [params.channel, "ALL"] },
    },
  });
  const isSuppressed = !!suppression;
  checks.push({
    checkName: "Check 3 & 4: Opt-Out & Suppression List",
    passed: !isSuppressed,
    reason: !isSuppressed ? "Contato não consta em listas de supressão ou opt-out" : `Bloqueado por opt-out prévio: ${suppression?.reason || "Solicitação expressa"}`,
  });

  // CHECK 5: Não houve contato recente (janela de 7 dias)
  let contactRecent = false;
  if (lead.contactedAt) {
    const daysSinceLastContact = (new Date().getTime() - new Date(lead.contactedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastContact < 3) {
      contactRecent = true;
    }
  }
  checks.push({
    checkName: "Check 5: Controle de Frequência",
    passed: !contactRecent,
    reason: !contactRecent ? "Sem contatos repetidos recentes" : "Contato recente realizado nos últimos 3 dias",
  });

  // CHECK 6: Canal permitido na campanha?
  const allowedChannels = lead.campaign.allowedChannels.split(",");
  const isChannelAllowed = allowedChannels.includes(params.channel);
  checks.push({
    checkName: "Check 6: Canal Permitido",
    passed: isChannelAllowed,
    reason: isChannelAllowed ? `Canal ${params.channel} habilitado na campanha` : `Canal ${params.channel} não permitido`,
  });

  // CHECK 7: Status da Campanha (Deve ser LIVE ou SIMULATION)
  const isCampaignLive = lead.campaign.status === "LIVE" || lead.campaign.status === "SIMULATION";
  checks.push({
    checkName: "Check 7: Status da Campanha",
    passed: isCampaignLive,
    reason: isCampaignLive ? `Campanha em modo ${lead.campaign.status}` : `Campanha pausada ou em rascunho (${lead.campaign.status})`,
  });

  // CHECK 8: Limite diário disponível
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const contactsToday = await prisma.lead.count({
    where: {
      campaignId: lead.campaignId,
      contactedAt: { gte: today },
    },
  });
  const isWithinDailyLimit = contactsToday < lead.campaign.dailyMessageLimit;
  checks.push({
    checkName: "Check 8: Limite Diário de Disparos",
    passed: isWithinDailyLimit,
    reason: isWithinDailyLimit ? `Disparos hoje: ${contactsToday}/${lead.campaign.dailyMessageLimit}` : `Limite diário de ${lead.campaign.dailyMessageLimit} atingido`,
  });

  // CHECK 9: Horário comercial permitido
  const now = new Date();
  const currentHour = now.getHours();
  const [startH] = lead.campaign.sendTimeStart.split(":").map(Number);
  const [endH] = lead.campaign.sendTimeEnd.split(":").map(Number);
  const isWithinBusinessHours = currentHour >= (startH || 8) && currentHour < (endH || 19);
  checks.push({
    checkName: "Check 9: Janela de Horário Comercial",
    passed: isWithinBusinessHours,
    reason: isWithinBusinessHours ? `Horário atual (${currentHour}h) dentro da janela (${lead.campaign.sendTimeStart}-${lead.campaign.sendTimeEnd})` : `Fora da janela de envio (${currentHour}h)`,
  });

  const allPassed = checks.every(c => c.passed);
  const failedCheck = checks.find(c => !c.passed);

  complianceLogger.info("COMPLIANCE_VALIDATED", {
    leadId: params.leadId,
    channel: params.channel,
    allowed: allPassed,
    blockedReason: failedCheck ? `${failedCheck.checkName}: ${failedCheck.reason}` : undefined,
  }, { organizationId: params.organizationId });

  return {
    allowed: allPassed,
    blockedReason: failedCheck ? `${failedCheck.checkName}: ${failedCheck.reason}` : undefined,
    checkDetails: checks,
  };
}
