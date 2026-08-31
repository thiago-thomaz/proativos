import {
  ICPStructuredDefinition,
  ICPEngineResult,
  MatchReasonItem,
  ICPFilterConfig,
} from "@/lib/types";
import { resolveOpeningDateRange, formatSaoPauloDate } from "@/lib/date-utils";

export interface CompanyEvaluationInput {
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
  naturezaJuridica?: string | null;
  capitalSocial?: number | null;
  telefone?: string | null;
  email?: string | null;
  hasWhatsapp?: boolean;
  hasDecisionMaker?: boolean;
}

/**
 * Normaliza um ICP antigo (Fase 1) para a definição estruturada da Fase 2
 */
export function normalizeToStructuredICP(
  input: ICPFilterConfig | ICPStructuredDefinition
): ICPStructuredDefinition {
  if ("industry" in input && "location" in input && "companySize" in input) {
    return input as ICPStructuredDefinition;
  }

  const legacy = input as ICPFilterConfig;
  return {
    version: 2,
    industry: {
      terms: [],
      mainCnaes: legacy.cnaes || [],
      secondaryCnaes: [],
      acceptSecondaryCnae: true,
      strictMainCnaeOnly: false,
    },
    location: {
      country: "BR",
      regions: [],
      ufs: legacy.states || [],
      cities: legacy.cities || [],
      strictLocation: (legacy.states && legacy.states.length > 0) || (legacy.cities && legacy.cities.length > 0),
    },
    companySize: {
      allowedPortes: legacy.portes && legacy.portes.length > 0 ? legacy.portes : ["MEI", "ME", "EPP", "DEMAIS"],
    },
    capitalSocial: {
      min: legacy.minCapital || 0,
      max: legacy.maxCapital || null,
    },
    legalNature: {
      allowed: legacy.naturezasJuridicas || [],
    },
    openingDate: legacy.openingDate || {
      mode: "PRESET",
      preset: legacy.maxDaysOpened === 3 ? "LAST_3_DAYS" : legacy.maxDaysOpened === 7 ? "LAST_7_DAYS" : legacy.maxDaysOpened === 15 ? "LAST_15_DAYS" : "LAST_30_DAYS",
    },
    status: ["ATIVA"],
    contactRequirements: {
      requirePhone: legacy.onlyWithPhone,
      requireEmail: legacy.onlyWithEmail,
      anyContactPreferred: true,
    },
    weights: {
      cnaeMain: 30,
      cnaeSec: 20,
      location: 20,
      openingDate: 15,
      porte: 15,
      contact: 10,
      capital: 10,
    },
    minScore: 70,
  };
}

/**
 * Motor Principal de ICP da Fase 2:
 * 1. Executa HARD FILTERS (critérios eliminatórios)
 * 2. Executa SOFT FILTERS (algoritmo de scoring proporcional 0 a 100)
 * 3. Registra explicações positivas (reasons) e negativas (rejections)
 */
export function evaluateCompanyAgainstICP(
  company: CompanyEvaluationInput,
  rawIcp: ICPFilterConfig | ICPStructuredDefinition,
  now: Date = new Date()
): ICPEngineResult {
  const icp = normalizeToStructuredICP(rawIcp);
  const weights = icp.weights || {
    cnaeMain: 30,
    cnaeSec: 20,
    location: 20,
    openingDate: 15,
    porte: 15,
    contact: 10,
    capital: 10,
  };

  const reasons: string[] = [];
  const rejections: string[] = [];
  const breakdown: MatchReasonItem[] = [];

  const dataAberturaDate =
    typeof company.dataAbertura === "string"
      ? new Date(company.dataAbertura)
      : company.dataAbertura;

  // =========================================================================
  // ETAPA 1: HARD FILTERS (Critérios Eliminatórios)
  // =========================================================================

  // 1.1 Situação Cadastral
  const allowedStatus = (icp.status && icp.status.length > 0 ? icp.status : ["ATIVA"]).map((s) => s.toUpperCase());
  const companyStatus = (company.situacao || "ATIVA").toUpperCase();
  if (!allowedStatus.includes(companyStatus)) {
    const reason = `Situação cadastral '${companyStatus}' não permitida (Exigido: ${allowedStatus.join(", ")}).`;
    rejections.push(`✗ ${reason}`);
    breakdown.push({
      criterion: "Situação Cadastral (Hard Filter)",
      matched: false,
      points: 0,
      maxPoints: 0,
      detail: reason,
    });
    return {
      matched: false,
      score: 0,
      reasons,
      rejections,
      breakdown,
      hardFiltersPassed: false,
      failedHardFilterReason: reason,
    };
  }

  // 1.2 Data de Abertura no Futuro
  if (dataAberturaDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    const reason = `Data de abertura futura (${formatSaoPauloDate(dataAberturaDate)}) é inválida.`;
    rejections.push(`✗ ${reason}`);
    breakdown.push({
      criterion: "Data de Abertura (Hard Filter)",
      matched: false,
      points: 0,
      maxPoints: 0,
      detail: reason,
    });
    return {
      matched: false,
      score: 0,
      reasons,
      rejections,
      breakdown,
      hardFiltersPassed: false,
      failedHardFilterReason: reason,
    };
  }

  // 1.3 Período de Abertura Obrigatório (Hard Filter)
  const resolvedDate = resolveOpeningDateRange(icp.openingDate, now);
  const isAfterFrom = !resolvedDate.from || dataAberturaDate.getTime() >= resolvedDate.from.getTime();
  const isBeforeTo = !resolvedDate.to || dataAberturaDate.getTime() <= resolvedDate.to.getTime();
  const isDateMatched = isAfterFrom && isBeforeTo;

  if (!isDateMatched) {
    const reason = `Empresa aberta em ${formatSaoPauloDate(dataAberturaDate)} está fora do período exigido (${resolvedDate.label}).`;
    rejections.push(`✗ ${reason}`);
    breakdown.push({
      criterion: "Período de Abertura (Hard Filter)",
      matched: false,
      points: 0,
      maxPoints: weights.openingDate,
      detail: reason,
    });
    return {
      matched: false,
      score: 0,
      reasons,
      rejections,
      breakdown,
      hardFiltersPassed: false,
      failedHardFilterReason: reason,
    };
  }

  // 1.4 Localização Estrita (Se configurado strictLocation)
  const allowedUfs = (icp.location.ufs || []).map((u) => u.toUpperCase());
  const allowedCities = (icp.location.cities || []).map((c) => c.toLowerCase());
  const companyUf = (company.uf || "").toUpperCase();
  const companyCity = (company.municipio || "").toLowerCase();

  const isUfMatch = allowedUfs.length === 0 || allowedUfs.includes(companyUf);
  const isCityMatch = allowedCities.length === 0 || allowedCities.includes(companyCity);

  if (icp.location.strictLocation && (!isUfMatch || (allowedCities.length > 0 && !isCityMatch))) {
    const reason = `Localização (${company.municipio}/${company.uf}) fora da área geográfica obrigatória.`;
    rejections.push(`✗ ${reason}`);
    breakdown.push({
      criterion: "Localização (Hard Filter)",
      matched: false,
      points: 0,
      maxPoints: weights.location,
      detail: reason,
    });
    return {
      matched: false,
      score: 0,
      reasons,
      rejections,
      breakdown,
      hardFiltersPassed: false,
      failedHardFilterReason: reason,
    };
  }

  // 1.5 CNAE Obrigatório (Se configurado strictMainCnaeOnly)
  const cleanCompanyMainCnae = (company.cnaePrincipal || "").replace(/\D/g, "");
  let cnaesSecundarios: string[] = [];
  if (Array.isArray(company.cnaesSecundarios)) {
    cnaesSecundarios = company.cnaesSecundarios;
  } else if (typeof company.cnaesSecundarios === "string" && company.cnaesSecundarios.trim() !== "") {
    try {
      cnaesSecundarios = JSON.parse(company.cnaesSecundarios);
    } catch {
      cnaesSecundarios = [company.cnaesSecundarios];
    }
  }
  const cleanCompanySecCnaes = cnaesSecundarios.map((c) => c.replace(/\D/g, ""));

  const targetMainCnaes = (icp.industry.mainCnaes || []).map((c) => c.replace(/\D/g, ""));
  const targetSecCnaes = (icp.industry.secondaryCnaes || []).map((c) => c.replace(/\D/g, ""));

  const matchesMainCnae =
    targetMainCnaes.length === 0 || targetMainCnaes.some((t) => cleanCompanyMainCnae.startsWith(t));
  const matchesSecCnae =
    !matchesMainCnae &&
    icp.industry.acceptSecondaryCnae &&
    (targetMainCnaes.some((t) => cleanCompanySecCnaes.some((sec) => sec.startsWith(t))) ||
      targetSecCnaes.some((t) => cleanCompanySecCnaes.some((sec) => sec.startsWith(t))));

  if (targetMainCnaes.length > 0 && !matchesMainCnae && !matchesSecCnae) {
    const reason = `CNAE (${company.cnaePrincipal}) não corresponde aos segmentos permitidos.`;
    rejections.push(`✗ ${reason}`);
    breakdown.push({
      criterion: "Segmento / CNAE (Hard Filter)",
      matched: false,
      points: 0,
      maxPoints: weights.cnaeMain,
      detail: reason,
    });
    return {
      matched: false,
      score: 0,
      reasons,
      rejections,
      breakdown,
      hardFiltersPassed: false,
      failedHardFilterReason: reason,
    };
  }

  // =========================================================================
  // ETAPA 2: SOFT FILTERS (Algoritmo Ponderado de Scoring 0 a 100)
  // =========================================================================
  let totalScore = 0;

  // 2.1 Pontuação de CNAE (Até weights.cnaeMain ou weights.cnaeSec)
  if (matchesMainCnae) {
    totalScore += weights.cnaeMain;
    const reasonText = `CNAE principal (${company.cnaePrincipal}) corresponde perfeitamente ao segmento alvo.`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "CNAE Principal",
      matched: true,
      points: weights.cnaeMain,
      maxPoints: weights.cnaeMain,
      detail: reasonText,
    });
  } else if (matchesSecCnae) {
    totalScore += weights.cnaeSec;
    const reasonText = `Possui atividade secundária compatível com o segmento desejado.`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "CNAE Secundário",
      matched: true,
      points: weights.cnaeSec,
      maxPoints: weights.cnaeMain,
      detail: reasonText,
    });
  } else {
    totalScore += weights.cnaeMain;
    const reasonText = "Qualquer segmento aceito pela campanha.";
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "CNAE Aberto",
      matched: true,
      points: weights.cnaeMain,
      maxPoints: weights.cnaeMain,
      detail: reasonText,
    });
  }

  // 2.2 Pontuação de Localização (Até weights.location)
  if (allowedCities.length > 0 && isCityMatch && isUfMatch) {
    totalScore += weights.location;
    const reasonText = `Localizada na cidade alvo prioritária (${company.municipio}/${company.uf}).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Localização (Município e Estado)",
      matched: true,
      points: weights.location,
      maxPoints: weights.location,
      detail: reasonText,
    });
  } else if (isUfMatch && allowedUfs.length > 0) {
    const ufPoints = Math.round(weights.location * 0.7);
    totalScore += ufPoints;
    const reasonText = `Localizada no estado alvo (${company.uf}).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Localização (Estado Alvo)",
      matched: true,
      points: ufPoints,
      maxPoints: weights.location,
      detail: reasonText,
    });
  } else if (allowedUfs.length === 0 && allowedCities.length === 0) {
    totalScore += weights.location;
    const reasonText = `Território nacional completo (Brasil).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Localização (Brasil)",
      matched: true,
      points: weights.location,
      maxPoints: weights.location,
      detail: reasonText,
    });
  } else {
    const rejText = `Fora dos municípios prioritários selecionados (${company.municipio}/${company.uf}).`;
    rejections.push(`✗ ${rejText}`);
    breakdown.push({
      criterion: "Localização",
      matched: false,
      points: 0,
      maxPoints: weights.location,
      detail: rejText,
    });
  }

  // 2.3 Pontuação de Data de Abertura / Recência (Até weights.openingDate)
  totalScore += weights.openingDate;
  const diffDays = Math.max(0, Math.floor((now.getTime() - dataAberturaDate.getTime()) / (1000 * 60 * 60 * 24)));
  const dateDetail =
    diffDays === 0
      ? "Empresa aberta hoje"
      : diffDays === 1
      ? "Empresa aberta ontem"
      : `Empresa aberta há ${diffDays} dias (${formatSaoPauloDate(dataAberturaDate)})`;
  reasons.push(`✓ ${dateDetail} (dentro do período: ${resolvedDate.label}).`);
  breakdown.push({
    criterion: "Recência Cadastral",
    matched: true,
    points: weights.openingDate,
    maxPoints: weights.openingDate,
    detail: `${dateDetail} (período: ${resolvedDate.label}).`,
  });

  // 2.4 Pontuação de Porte Empresarial (Até weights.porte)
  const allowedPortes = (icp.companySize.allowedPortes || ["MEI", "ME", "EPP", "DEMAIS"]).map((p) => p.toUpperCase());
  const companyPorte = (company.porte || "DEMAIS").toUpperCase();
  const isPorteMatched = allowedPortes.includes(companyPorte);

  if (isPorteMatched) {
    totalScore += weights.porte;
    const reasonText = `Porte empresarial compatível (${companyPorte}).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Porte Empresarial",
      matched: true,
      points: weights.porte,
      maxPoints: weights.porte,
      detail: reasonText,
    });
  } else {
    const rejText = `Porte empresarial (${companyPorte}) difere do porte ideal (${allowedPortes.join(", ")}).`;
    rejections.push(`✗ ${rejText}`);
    breakdown.push({
      criterion: "Porte Empresarial",
      matched: false,
      points: 0,
      maxPoints: weights.porte,
      detail: rejText,
    });
  }

  // 2.5 Pontuação de Capital Social (Até weights.capital)
  const capital = company.capitalSocial || 0;
  const minCap = icp.capitalSocial?.min || 0;
  const maxCap = icp.capitalSocial?.max;
  const isCapitalMatched = capital >= minCap && (maxCap === null || maxCap === undefined || capital <= maxCap);

  if (isCapitalMatched) {
    totalScore += weights.capital;
    const reasonText = `Capital social compatível (R$ ${capital.toLocaleString("pt-BR")}).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Capital Social",
      matched: true,
      points: weights.capital,
      maxPoints: weights.capital,
      detail: reasonText,
    });
  } else {
    const rejText = `Capital social (R$ ${capital.toLocaleString("pt-BR")}) fora da faixa definida.`;
    rejections.push(`✗ ${rejText}`);
    breakdown.push({
      criterion: "Capital Social",
      matched: false,
      points: 0,
      maxPoints: weights.capital,
      detail: rejText,
    });
  }

  // 2.6 Pontuação de Contatos Disponíveis (Até weights.contact)
  const hasPhone = Boolean(company.telefone && company.telefone.trim().length >= 8);
  const hasEmail = Boolean(company.email && company.email.includes("@"));

  if (hasPhone || hasEmail || company.hasWhatsapp || company.hasDecisionMaker) {
    totalScore += weights.contact;
    const channelList: string[] = [];
    if (hasPhone) channelList.push("telefone");
    if (hasEmail) channelList.push("e-mail");
    if (company.hasDecisionMaker) channelList.push("decisor mapeado");
    const reasonText = `Possui canal de contato cadastral ativo (${channelList.join(", ")}).`;
    reasons.push(`✓ ${reasonText}`);
    breakdown.push({
      criterion: "Canais de Contato",
      matched: true,
      points: weights.contact,
      maxPoints: weights.contact,
      detail: reasonText,
    });
  } else {
    const rejText = "Sem contato empresarial direto imediato (necessitará enriquecimento).";
    rejections.push(`✗ ${rejText}`);
    breakdown.push({
      criterion: "Canais de Contato",
      matched: false,
      points: 0,
      maxPoints: weights.contact,
      detail: rejText,
    });
  }

  // Normalização para 100 pontos
  const finalScore = Math.min(100, Math.max(0, totalScore));
  const isMatch = finalScore >= (icp.minScore || 70);

  if (!isMatch) {
    rejections.push(`✗ Score total atingido (${finalScore}%) está abaixo do mínimo exigido (${icp.minScore}%).`);
  }

  return {
    matched: isMatch,
    score: finalScore,
    reasons,
    rejections,
    breakdown,
    hardFiltersPassed: true,
  };
}

/**
 * Função de retrocompatibilidade para chamadas da Fase 1
 */
export function calculateICPScore(
  company: CompanyEvaluationInput,
  icp: ICPFilterConfig,
  minThreshold: number = 70,
  now: Date = new Date()
) {
  const result = evaluateCompanyAgainstICP(
    company,
    { ...icp, minScore: minThreshold },
    now
  );
  return {
    score: result.score,
    isMatch: result.matched,
    reasons: result.breakdown,
    rejections: result.rejections,
  };
}
