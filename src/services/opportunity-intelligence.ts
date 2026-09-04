import { prisma } from "@/lib/prisma";
import {
  OpportunityScoreResult,
  OpportunityPriority,
  RecommendedAction,
  FinancialPotentialConfig,
  MarketSizeMetrics,
  LeadReadiness,
  EventTriggerType,
  AutopilotMode,
} from "@/lib/types";
import { evaluateCompanyAgainstICP } from "./icp-engine";
import { calculateContactabilityScore } from "./contactability";
import { AppLogger } from "@/lib/logger";

const oppLogger = new AppLogger("opportunity");

export interface CompanyOpportunityInput {
  id?: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  dataAbertura: Date | string;
  situacao: string;
  cnaePrincipal: string;
  cnaesSecundarios?: string[] | string | null;
  municipio: string;
  uf: string;
  porte?: string | null;
  capitalSocial?: number | null;
  telefone?: string | null;
  email?: string | null;
  contacts?: Array<{
    id?: string;
    nome: string;
    cargo?: string | null;
    tipo: string;
    email?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    whatsappStatus?: string;
    emailStatus?: string;
    phoneStatus?: string;
    optOut?: boolean;
  }>;
}

export interface OpportunityEvaluationContext {
  organizationId: string;
  campaignId?: string;
  icpFilters?: any;
  campaignStatus?: string;
  financialConfig?: FinancialPotentialConfig;
  leadId?: string;
  leadStatus?: string;
  cadenceStatus?: string;
  isSuppressed?: boolean;
  hasInboundReply?: boolean;
  inboundIntent?: string;
  reactivationAt?: Date | null;
  now?: Date;
}

export const CALCULATION_VERSION = "v1.0";

/**
 * Classifica a Prioridade da Oportunidade com base no Opportunity Score (0 a 100)
 */
export function classifyOpportunityPriority(score: number): OpportunityPriority {
  if (score >= 90) return "VERY_HIGH";
  if (score >= 75) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "LOW";
  return "DISQUALIFIED";
}

/**
 * Motor Central de Cálculo Determinístico do Opportunity Score (0 a 100)
 */
export function calculateOpportunityScore(
  company: CompanyOpportunityInput,
  context: OpportunityEvaluationContext
): OpportunityScoreResult {
  const now = context.now || new Date();
  const reasons: string[] = [];
  const warnings: string[] = [];

  const contactsList = company.contacts || [];
  const hasWhatsapp = contactsList.some((c) => c.whatsappStatus === "VERIFIED" || c.whatsapp);
  const hasDecisionMaker = contactsList.some((c) => c.tipo === "DECISION_MAKER");

  // =========================================================================
  // 1. ICP FIT (0 a 30 pontos)
  // =========================================================================
  let icpScore = 0;
  if (context.icpFilters) {
    const icpResult = evaluateCompanyAgainstICP(
      {
        cnpj: company.cnpj,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        cnaePrincipal: company.cnaePrincipal,
        cnaesSecundarios: company.cnaesSecundarios,
        municipio: company.municipio,
        uf: company.uf,
        porte: company.porte,
        capitalSocial: company.capitalSocial,
        dataAbertura: company.dataAbertura,
        situacao: company.situacao,
        telefone: company.telefone,
        email: company.email,
        hasWhatsapp,
        hasDecisionMaker,
      },
      context.icpFilters,
      now
    );
    icpScore = icpResult.score;
    if (icpResult.reasons.length > 0) {
      reasons.push(...icpResult.reasons.slice(0, 2));
    }
  } else {
    icpScore = company.situacao === "ATIVA" ? 70 : 0;
  }

  const icpFitPoints = Math.round((Math.max(0, Math.min(100, icpScore)) / 100) * 30);
  if (icpFitPoints >= 25) {
    reasons.push(`Excelente compatibilidade de ICP (${icpScore}%)`);
  } else if (icpFitPoints < 15) {
    warnings.push(`Baixo alinhamento com os critérios do ICP (${icpScore}%)`);
  }

  // =========================================================================
  // 2. RECÊNCIA DE ABERTURA (0 a 15 pontos)
  // =========================================================================
  const openDate =
    typeof company.dataAbertura === "string"
      ? new Date(company.dataAbertura)
      : company.dataAbertura;
  const diffDays = Math.max(0, Math.floor((now.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24)));

  let recencyPoints = 1;
  if (diffDays <= 3) {
    recencyPoints = 15;
    reasons.push(`Empresa recém-aberta há ${diffDays} dias (Timing Ideal)`);
  } else if (diffDays <= 7) {
    recencyPoints = 14;
    reasons.push(`Empresa aberta há ${diffDays} dias (Primeira Semana)`);
  } else if (diffDays <= 15) {
    recencyPoints = 12;
    reasons.push(`Empresa aberta há ${diffDays} dias`);
  } else if (diffDays <= 30) {
    recencyPoints = 10;
    reasons.push(`Empresa aberta no último mês (${diffDays} dias)`);
  } else if (diffDays <= 60) {
    recencyPoints = 6;
  } else if (diffDays <= 90) {
    recencyPoints = 3;
  } else {
    recencyPoints = 1;
    warnings.push(`Empresa aberta há mais de 90 dias (${diffDays} dias)`);
  }

  // =========================================================================
  // 3. CONTATABILIDADE (0 a 15 pontos)
  // =========================================================================
  const contactability = calculateContactabilityScore(
    contactsList.map((c) => ({
      nome: c.nome,
      cargo: c.cargo,
      tipo: c.tipo,
      email: c.email,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      whatsappStatus: c.whatsappStatus || "UNKNOWN",
      emailStatus: c.emailStatus || "UNKNOWN",
      phoneStatus: c.phoneStatus || "UNKNOWN",
      optOut: c.optOut || context.isSuppressed,
      confidenceScore: 80,
    })),
    icpScore
  );

  let contactabilityPoints = Math.round((contactability.contactabilityScore / 100) * 15);
  if (contactability.hasVerifiedWhatsApp && contactability.hasValidEmail && contactability.hasDecisionMaker) {
    contactabilityPoints = 15;
  }
  if (contactability.hasVerifiedWhatsApp) {
    reasons.push("WhatsApp verificado do decisor disponível");
  }
  if (contactability.hasValidEmail) {
    reasons.push("E-mail corporativo válido disponível");
  }
  if (contactability.contactabilityScore < 40) {
    warnings.push("Canais de contato escassos ou não verificados");
  }

  // =========================================================================
  // 4. LOCALIZAÇÃO PRIORITÁRIA (0 a 10 pontos)
  // =========================================================================
  let locationPoints = 6; // Default match
  if (context.icpFilters?.location?.cities?.includes(company.municipio)) {
    locationPoints = 10;
    reasons.push(`Localização exata na cidade foco (${company.municipio} - ${company.uf})`);
  } else if (context.icpFilters?.location?.ufs?.includes(company.uf)) {
    locationPoints = 8;
    reasons.push(`Localização no estado prioritário (${company.uf})`);
  } else if (company.uf) {
    locationPoints = 5;
  }

  // =========================================================================
  // 5. PORTE EMPRESARIAL (0 a 10 pontos)
  // =========================================================================
  let portePoints = 5;
  const porte = (company.porte || "ME").toUpperCase();
  if (["ME", "EPP"].includes(porte)) {
    portePoints = 10;
    reasons.push(`Porte comercial ideal (${porte})`);
  } else if (porte === "MEI") {
    portePoints = 7;
  } else {
    portePoints = 6;
  }

  // =========================================================================
  // 6. CAPITAL SOCIAL (0 a 5 pontos)
  // =========================================================================
  let capitalPoints = 3;
  const cap = company.capitalSocial || 0;
  if (cap >= 10000 && cap <= 500000) {
    capitalPoints = 5;
    reasons.push(`Capital social estruturado (R$ ${cap.toLocaleString("pt-BR")})`);
  } else if (cap > 500000) {
    capitalPoints = 4;
  } else if (cap > 0) {
    capitalPoints = 2;
    warnings.push("Capital social reduzido");
  } else {
    capitalPoints = 1;
    warnings.push("Capital social não informado");
  }

  // =========================================================================
  // 7. SINAIS DE OPORTUNIDADE & TIMING (0 a 10 pontos)
  // =========================================================================
  let opportunitySignalsPoints = 0;
  if (company.situacao === "ATIVA") {
    opportunitySignalsPoints += 5;
    if (contactability.hasDecisionMaker) {
      opportunitySignalsPoints += 5;
      reasons.push("Sócio Administrador identificado no QSA");
    } else {
      opportunitySignalsPoints += 2;
    }
  } else {
    warnings.push(`Empresa com situação cadastral ${company.situacao}`);
  }

  // =========================================================================
  // 8. HISTÓRICO / ENGAGEMENT (0 a 5 pontos)
  // =========================================================================
  let engagementPoints = 3;
  if (context.hasInboundReply) {
    if (["MEETING_REQUEST", "PRICE_REQUEST", "INTERESTED"].includes(context.inboundIntent || "")) {
      engagementPoints = 5;
      reasons.push(`Resposta de alto interesse recebida (${context.inboundIntent})`);
    } else if (["OPT_OUT", "UNSUBSCRIBE"].includes(context.inboundIntent || "")) {
      engagementPoints = 0;
      warnings.push("Lead solicitou Opt-Out");
    } else {
      engagementPoints = 2;
    }
  } else if (!context.leadStatus || context.leadStatus === "NEW" || context.leadStatus === "QUALIFIED") {
    engagementPoints = 5;
    reasons.push("Oportunidade inédita (nunca contatada)");
  }

  // =========================================================================
  // CÁLCULO FINAL TOTAL DETERMINÍSTICO (0 A 100)
  // =========================================================================
  let totalScore =
    icpFitPoints +
    recencyPoints +
    contactabilityPoints +
    locationPoints +
    portePoints +
    capitalPoints +
    opportunitySignalsPoints +
    engagementPoints;

  // Penalidade total se a empresa estiver BAIXADA/INATIVA ou com Opt-Out
  if (company.situacao !== "ATIVA" || context.isSuppressed) {
    totalScore = Math.min(totalScore, 20);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));
  const priority = classifyOpportunityPriority(finalScore);

  // =========================================================================
  // RECOMMENDED ACTION (Determinístico, respeitando Lead Gatekeeper)
  // =========================================================================
  const recommendedAction = determineRecommendedAction({
    opportunityScore: finalScore,
    priority,
    leadReadiness: contactability.leadReadiness,
    contactabilityScore: contactability.contactabilityScore,
    isSuppressed: Boolean(context.isSuppressed),
    isCompanyActive: company.situacao === "ATIVA",
    leadStatus: context.leadStatus,
    cadenceStatus: context.cadenceStatus,
    campaignStatus: context.campaignStatus,
    hasInboundReply: Boolean(context.hasInboundReply),
    inboundIntent: context.inboundIntent,
    reactivationAt: context.reactivationAt,
    now,
  });

  // =========================================================================
  // POTENCIAL FINANCEIRO ESTIMADO
  // =========================================================================
  const financial = calculateFinancialPotential(finalScore, context.financialConfig);

  return {
    opportunityScore: finalScore,
    priority,
    recommendedAction,
    reasons,
    warnings,
    breakdown: {
      icpFitPoints,
      recencyPoints,
      contactabilityPoints,
      locationPoints,
      portePoints,
      capitalPoints,
      opportunitySignalsPoints,
      engagementPoints,
    },
    financial,
    calculationVersion: CALCULATION_VERSION,
    calculatedAt: now,
  };
}

/**
 * Determina a Ação Comercial Recomendada com Respeito Absoluto ao Lead Gatekeeper
 */
export function determineRecommendedAction(params: {
  opportunityScore: number;
  priority: OpportunityPriority;
  leadReadiness: LeadReadiness;
  contactabilityScore: number;
  isSuppressed: boolean;
  isCompanyActive: boolean;
  leadStatus?: string;
  cadenceStatus?: string;
  campaignStatus?: string;
  hasInboundReply?: boolean;
  inboundIntent?: string;
  reactivationAt?: Date | null;
  now?: Date;
}): RecommendedAction {
  const now = params.now || new Date();

  // 1. Regra Absoluta de Supressão / Empresa Inativa
  if (params.isSuppressed || !params.isCompanyActive || params.leadStatus === "OPTED_OUT") {
    return "DO_NOT_CONTACT";
  }

  // 2. Resposta Inbound de Interesse Aguardando Vendedor
  if (
    params.hasInboundReply &&
    ["MEETING_REQUEST", "PRICE_REQUEST", "INTERESTED", "QUESTION"].includes(params.inboundIntent || "")
  ) {
    return "HUMAN_REVIEW";
  }

  // 3. Reativação Futura (NOT_NOW / NOT_INTERESTED)
  if (
    (params.leadStatus === "NOT_NOW" || params.leadStatus === "NOT_INTERESTED") &&
    params.reactivationAt &&
    params.reactivationAt > now
  ) {
    return "REACTIVATE_LATER";
  }

  // 4. Falta de Dados de Contato / Baixa Contatabilidade
  if (params.contactabilityScore < 40 || params.leadReadiness === "NOT_READY") {
    return "ENRICH_FIRST";
  }

  // 5. Alta Oportunidade Pronta para Abordagem Imediata
  if (
    params.opportunityScore >= 75 &&
    params.leadReadiness === "READY" &&
    (!params.campaignStatus || params.campaignStatus === "LIVE")
  ) {
    return "CONTACT_NOW";
  }

  // 6. Oportunidade Média / Alta para o dia
  if (params.opportunityScore >= 60) {
    return "CONTACT_TODAY";
  }

  // 7. Padrão
  return "WAIT";
}

/**
 * Calcula Projeção Financeira (MRR, ARR, Valor Total)
 */
export function calculateFinancialPotential(
  opportunityScore: number,
  config?: FinancialPotentialConfig
): { estimatedValue: number; estimatedMRR: number; estimatedARR: number } {
  const price = config?.productPrice || 500;
  const periodicity = config?.periodicity || "MONTHLY";
  const baseConversionRate = config?.estimatedConversionRate || 0.05;

  // Ajuste multiplicador proporcional ao score
  const scoreMultiplier = opportunityScore >= 90 ? 1.5 : opportunityScore >= 75 ? 1.2 : opportunityScore >= 60 ? 1.0 : 0.5;
  const effectiveConversion = baseConversionRate * scoreMultiplier;

  let estimatedMRR = 0;
  let estimatedARR = 0;
  let estimatedValue = 0;

  if (periodicity === "MONTHLY") {
    estimatedMRR = Math.round(price * effectiveConversion * 100) / 100;
    estimatedARR = Math.round(estimatedMRR * 12 * 100) / 100;
    estimatedValue = estimatedARR;
  } else if (periodicity === "ANNUAL") {
    estimatedARR = Math.round(price * effectiveConversion * 100) / 100;
    estimatedMRR = Math.round((estimatedARR / 12) * 100) / 100;
    estimatedValue = estimatedARR;
  } else {
    // ONE_TIME
    estimatedValue = Math.round(price * effectiveConversion * 100) / 100;
    estimatedMRR = 0;
    estimatedARR = estimatedValue;
  }

  return { estimatedValue, estimatedMRR, estimatedARR };
}

/**
 * Calcula Métricas de Tamanho de Mercado e Funil de 10 Etapas
 */
export async function calculateMarketSizeAndFunnel(
  organizationId: string,
  campaignId?: string
): Promise<MarketSizeMetrics> {
  const whereCampaign = campaignId ? { campaignId } : {};

  const [
    universeCount,
    icpMatchedCount,
    readyCount,
    opportunityHighPlusCount,
    neverContactedCount,
    contactedCount,
    respondedCount,
    interestedCount,
    meetingCount,
    convertedCount,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, score: { gte: 70 } } }),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, readiness: "READY" } }),
    prisma.opportunityScore.count({
      where: { organizationId, ...(campaignId ? { campaignId } : {}), opportunityScore: { gte: 75 } },
    }),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, status: { in: ["NEW", "QUALIFIED"] } } }),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, contactedAt: { not: null } } }),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, respondedAt: { not: null } } }),
    prisma.inboundMessage.count({
      where: { organizationId, intentClassification: { in: ["INTERESTED", "PRICE_REQUEST"] } },
    }),
    prisma.inboundMessage.count({
      where: { organizationId, intentClassification: "MEETING_REQUEST" },
    }),
    prisma.lead.count({ where: { organizationId, ...whereCampaign, status: "CONVERTED" } }),
  ]);

  const contactableCount = Math.round(readyCount * 1.2);
  const estimatedTotalMRR = opportunityHighPlusCount * 150;
  const estimatedTotalARR = estimatedTotalMRR * 12;

  const safeRate = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

  return {
    universeCount: universeCount || 100,
    icpMatchedCount,
    contactableCount,
    readyCount,
    opportunityHighPlusCount,
    neverContactedCount,
    contactedCount,
    respondedCount,
    interestedCount,
    meetingCount,
    convertedCount,
    estimatedTotalMRR,
    estimatedTotalARR,
    funnelConversionRates: {
      universeToIcp: safeRate(icpMatchedCount, universeCount),
      icpToContactable: safeRate(contactableCount, icpMatchedCount),
      contactableToReady: safeRate(readyCount, contactableCount),
      readyToContacted: safeRate(contactedCount, readyCount),
      contactedToResponded: safeRate(respondedCount, contactedCount),
      respondedToInterested: safeRate(interestedCount, respondedCount),
      interestedToMeeting: safeRate(meetingCount, interestedCount),
      meetingToConverted: safeRate(convertedCount, meetingCount),
    },
  };
}

/**
 * Persiste o Cálculo do Opportunity Score no Banco de Dados com Auditoria
 */
export async function persistOpportunityScore(
  companyId: string,
  context: OpportunityEvaluationContext,
  result: OpportunityScoreResult
) {
  const existing = await prisma.opportunityScore.findFirst({
    where: {
      organizationId: context.organizationId,
      companyId,
      ...(context.campaignId ? { campaignId: context.campaignId } : {}),
    },
  });

  const dataPayload = {
    organizationId: context.organizationId,
    companyId,
    leadId: context.leadId || null,
    campaignId: context.campaignId || null,
    icpScore: result.breakdown.icpFitPoints * (100 / 30),
    contactabilityScore: result.breakdown.contactabilityPoints * (100 / 15),
    priorityScore: result.opportunityScore,
    opportunityScore: result.opportunityScore,
    priority: result.priority,
    recommendedAction: result.recommendedAction,
    reasons: JSON.stringify(result.reasons),
    warnings: JSON.stringify(result.warnings),
    estimatedValue: result.financial.estimatedValue,
    estimatedMRR: result.financial.estimatedMRR,
    estimatedARR: result.financial.estimatedARR,
    calculationVersion: result.calculationVersion,
    reactivationAt: context.reactivationAt || null,
    reactivationEligible: Boolean(context.reactivationAt && context.reactivationAt <= new Date()),
    calculatedAt: result.calculatedAt,
  };

  let saved;
  if (existing) {
    saved = await prisma.opportunityScore.update({
      where: { id: existing.id },
      data: dataPayload,
    });
  } else {
    saved = await prisma.opportunityScore.create({
      data: dataPayload,
    });
  }

  // Registrar LeadEvent se lead associado
  if (context.leadId) {
    await prisma.leadEvent.create({
      data: {
        leadId: context.leadId,
        type: "OPPORTUNITY_EVALUATED",
        description: `Opportunity Score calculado: ${result.opportunityScore} (${result.priority}) - Ação: ${result.recommendedAction}`,
        metadata: JSON.stringify({
          score: result.opportunityScore,
          priority: result.priority,
          recommendedAction: result.recommendedAction,
          version: result.calculationVersion,
        }),
      },
    });
  }

  return saved;
}

/**
 * Avalia Elegibilidade de Reativação para Leads em NOT_NOW / NOT_INTERESTED
 */
export async function evaluateReactivationEligibility(leadId: string): Promise<{
  eligible: boolean;
  leadId: string;
  newScore?: number;
  reason: string;
}> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: { include: { contacts: true } },
      campaign: true,
    },
  });

  if (!lead) {
    return { eligible: false, leadId, reason: "Lead não encontrado" };
  }

  // Verificar se possui opt-out
  const suppression = await prisma.suppressionList.findFirst({
    where: {
      organizationId: lead.organizationId,
      identifier: { in: [lead.company.cnpj, lead.company.telefone || "", lead.company.email || ""].filter(Boolean) as string[] },
    },
  });

  if (suppression) {
    return { eligible: false, leadId, reason: "Lead presente na lista de supressão (Opt-Out)" };
  }

  const now = new Date();
  if (lead.reactivationAt && lead.reactivationAt > now) {
    return { eligible: false, leadId, reason: `Data de reativação futura (${lead.reactivationAt.toISOString()})` };
  }

  // Reavaliar oportunidade
  const oppResult = calculateOpportunityScore(
    {
      cnpj: lead.company.cnpj,
      razaoSocial: lead.company.razaoSocial,
      nomeFantasia: lead.company.nomeFantasia,
      dataAbertura: lead.company.dataAbertura,
      situacao: lead.company.situacao,
      cnaePrincipal: lead.company.cnaePrincipal,
      cnaesSecundarios: lead.company.cnaesSecundarios ? JSON.parse(lead.company.cnaesSecundarios) : [],
      municipio: lead.company.municipio,
      uf: lead.company.uf,
      porte: lead.company.porte,
      capitalSocial: lead.company.capitalSocial,
      telefone: lead.company.telefone,
      email: lead.company.email,
      contacts: lead.company.contacts,
    },
    {
      organizationId: lead.organizationId,
      campaignId: lead.campaignId,
      icpFilters: lead.campaign.icpFilters ? JSON.parse(lead.campaign.icpFilters) : {},
      leadId: lead.id,
      leadStatus: lead.status,
      now,
    }
  );

  await persistOpportunityScore(lead.companyId, { organizationId: lead.organizationId, campaignId: lead.campaignId, leadId: lead.id }, oppResult);

  return {
    eligible: oppResult.opportunityScore >= 60 && oppResult.recommendedAction !== "DO_NOT_CONTACT",
    leadId,
    newScore: oppResult.opportunityScore,
    reason: `Reativação avaliada com score ${oppResult.opportunityScore} (${oppResult.recommendedAction})`,
  };
}

/**
 * Processador de Event-Driven Trigger para Recálculo Dinâmico de Oportunidades
 */
export async function processEventTrigger(
  eventType: EventTriggerType,
  companyId: string,
  organizationId: string
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { contacts: true, leads: { include: { campaign: true } } },
  });

  if (!company) return;

  for (const lead of company.leads) {
    const oppResult = calculateOpportunityScore(
      {
        cnpj: company.cnpj,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        dataAbertura: company.dataAbertura,
        situacao: company.situacao,
        cnaePrincipal: company.cnaePrincipal,
        cnaesSecundarios: company.cnaesSecundarios ? JSON.parse(company.cnaesSecundarios) : [],
        municipio: company.municipio,
        uf: company.uf,
        porte: company.porte,
        capitalSocial: company.capitalSocial,
        telefone: company.telefone,
        email: company.email,
        contacts: company.contacts,
      },
      {
        organizationId,
        campaignId: lead.campaignId,
        icpFilters: lead.campaign.icpFilters ? JSON.parse(lead.campaign.icpFilters) : {},
        leadId: lead.id,
        leadStatus: lead.status,
      }
    );

    await persistOpportunityScore(companyId, { organizationId, campaignId: lead.campaignId, leadId: lead.id }, oppResult);
  }
}
