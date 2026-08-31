import { ICPFilterConfig, ScoreCalculationResult, MatchReasonItem } from "@/lib/types";
import { resolveOpeningDateRange, formatSaoPauloDate } from "@/lib/date-utils";

interface CompanyMatchInput {
  cnpj: string;
  razaoSocial: string;
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
}

export function calculateICPScore(
  company: CompanyMatchInput,
  icp: ICPFilterConfig,
  minThreshold: number = 70,
  now: Date = new Date()
): ScoreCalculationResult {
  const reasons: MatchReasonItem[] = [];
  let totalScore = 0;

  // 1. SITUAÇÃO CADASTRAL (Obrigatório: Ativa)
  const isAtiva = company.situacao?.toUpperCase() === "ATIVA";
  if (!isAtiva) {
    return {
      score: 0,
      isMatch: false,
      reasons: [
        {
          criterion: "Situação Cadastral",
          matched: false,
          points: 0,
          maxPoints: 0,
          detail: `Empresa com situação ${company.situacao} (Incompatível com prospecção ativa).`,
        },
      ],
    };
  }

  // 2. CNAE (Até 30 pontos)
  let cnaesSec: string[] = [];
  if (Array.isArray(company.cnaesSecundarios)) {
    cnaesSec = company.cnaesSecundarios;
  } else if (typeof company.cnaesSecundarios === "string" && company.cnaesSecundarios.trim() !== "") {
    try {
      cnaesSec = JSON.parse(company.cnaesSecundarios);
    } catch {
      cnaesSec = [company.cnaesSecundarios];
    }
  }

  const cleanMainCNAE = company.cnaePrincipal.replace(/\D/g, "");
  const matchesMainCNAE =
    icp.cnaes.length === 0 ||
    icp.cnaes.some((c) => cleanMainCNAE.startsWith(c.replace(/\D/g, "")));

  const matchesSecCNAE =
    !matchesMainCNAE &&
    icp.cnaes.some((c) =>
      cnaesSec.some((sec) => sec.replace(/\D/g, "").startsWith(c.replace(/\D/g, "")))
    );

  if (matchesMainCNAE) {
    totalScore += 30;
    reasons.push({
      criterion: "CNAE Principal",
      matched: true,
      points: 30,
      maxPoints: 30,
      detail: `CNAE principal (${company.cnaePrincipal}) corresponde perfeitamente ao segmento alvo.`,
    });
  } else if (matchesSecCNAE) {
    totalScore += 20;
    reasons.push({
      criterion: "CNAE Secundário",
      matched: true,
      points: 20,
      maxPoints: 30,
      detail: "Possui CNAE secundário alinhado ao segmento desejado.",
    });
  } else if (icp.cnaes.length > 0) {
    reasons.push({
      criterion: "CNAE",
      matched: false,
      points: 0,
      maxPoints: 30,
      detail: "Atividade econômica fora do filtro prioritário.",
    });
  } else {
    totalScore += 30;
    reasons.push({
      criterion: "CNAE",
      matched: true,
      points: 30,
      maxPoints: 30,
      detail: "Todos os segmentos permitidos pela campanha.",
    });
  }

  // 3. LOCALIZAÇÃO (Até 20 pontos)
  const matchesUF = icp.states.length === 0 || icp.states.includes(company.uf.toUpperCase());
  const matchesCity = icp.cities.length === 0 || icp.cities.some(c => c.toLowerCase() === company.municipio.toLowerCase());

  if (matchesCity && matchesUF) {
    totalScore += 20;
    reasons.push({
      criterion: "Localização",
      matched: true,
      points: 20,
      maxPoints: 20,
      detail: `Localizada na cidade e estado ideais (${company.municipio}/${company.uf}).`,
    });
  } else if (matchesUF) {
    totalScore += 12;
    reasons.push({
      criterion: "Localização (UF)",
      matched: true,
      points: 12,
      maxPoints: 20,
      detail: `Localizada no estado alvo (${company.uf}).`,
    });
  } else {
    reasons.push({
      criterion: "Localização",
      matched: false,
      points: 0,
      maxPoints: 20,
      detail: `Fora da área geográfica alvo (${company.municipio}/${company.uf}).`,
    });
  }

  // 4. DATA DE ABERTURA DA EMPRESA (Até 15 pontos)
  const dataAberturaDate = typeof company.dataAbertura === "string" ? new Date(company.dataAbertura) : company.dataAbertura;
  
  // Bloquear se a data de abertura estiver no futuro (> now)
  if (dataAberturaDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    return {
      score: 0,
      isMatch: false,
      reasons: [
        {
          criterion: "Data de Abertura",
          matched: false,
          points: 0,
          maxPoints: 15,
          detail: `Empresa com data de abertura futura (${formatSaoPauloDate(dataAberturaDate)}), inválida para o motor.`,
        },
      ],
    };
  }

  // Resolver filtro de data estruturado (com retrocompatibilidade para maxDaysOpened)
  let dateFilter = icp.openingDate;
  if (!dateFilter && typeof icp.maxDaysOpened === "number") {
    const daysToPreset: Record<number, any> = {
      0: "TODAY",
      3: "LAST_3_DAYS",
      7: "LAST_7_DAYS",
      15: "LAST_15_DAYS",
      30: "LAST_30_DAYS",
      60: "LAST_60_DAYS",
      90: "LAST_90_DAYS",
      180: "LAST_180_DAYS",
      365: "LAST_365_DAYS",
    };
    const preset = daysToPreset[icp.maxDaysOpened] || "LAST_30_DAYS";
    dateFilter = { mode: "PRESET", preset };
  }

  const range = resolveOpeningDateRange(dateFilter, now);
  const diffDays = Math.max(0, Math.floor((now.getTime() - dataAberturaDate.getTime()) / (1000 * 60 * 60 * 24)));

  const isAfterFrom = !range.from || dataAberturaDate.getTime() >= range.from.getTime();
  const isBeforeTo = !range.to || dataAberturaDate.getTime() <= range.to.getTime();
  const isWithinDateRange = isAfterFrom && isBeforeTo;

  if (isWithinDateRange) {
    totalScore += 15;
    let periodExplanation = "";
    if (diffDays === 0) periodExplanation = "aberta hoje";
    else if (diffDays === 1) periodExplanation = "aberta ontem";
    else periodExplanation = `aberta há ${diffDays} dias`;

    reasons.push({
      criterion: "Data de Abertura",
      matched: true,
      points: 15,
      maxPoints: 15,
      detail: `Empresa ${periodExplanation} (aberta em ${formatSaoPauloDate(dataAberturaDate)}, dentro do período: ${range.label}).`,
    });
  } else {
    reasons.push({
      criterion: "Data de Abertura",
      matched: false,
      points: 0,
      maxPoints: 15,
      detail: `Empresa aberta em ${formatSaoPauloDate(dataAberturaDate)} (fora do período da campanha: ${range.label}).`,
    });
  }

  // 5. PORTE (Até 10 pontos)
  const porteFormatted = (company.porte || "DEMAIS").toUpperCase();
  const matchesPorte = icp.portes.length === 0 || icp.portes.some(p => p.toUpperCase() === porteFormatted);

  if (matchesPorte) {
    totalScore += 10;
    reasons.push({
      criterion: "Porte Empresarial",
      matched: true,
      points: 10,
      maxPoints: 10,
      detail: `Porte compatível (${porteFormatted}).`,
    });
  } else {
    reasons.push({
      criterion: "Porte Empresarial",
      matched: false,
      points: 0,
      maxPoints: 10,
      detail: `Porte diferente do selecionado (${porteFormatted}).`,
    });
  }

  // 6. CAPITAL SOCIAL (Até 10 pontos)
  const capital = company.capitalSocial || 0;
  const minCap = icp.minCapital || 0;
  const maxCap = icp.maxCapital;

  const matchesCapital = capital >= minCap && (maxCap === null || maxCap === undefined || capital <= maxCap);

  if (matchesCapital) {
    totalScore += 10;
    reasons.push({
      criterion: "Capital Social",
      matched: true,
      points: 10,
      maxPoints: 10,
      detail: `Capital social compatível (R$ ${capital.toLocaleString("pt-BR")}).`,
    });
  } else {
    reasons.push({
      criterion: "Capital Social",
      matched: false,
      points: 0,
      maxPoints: 10,
      detail: `Capital social fora da faixa estabelecida (R$ ${capital.toLocaleString("pt-BR")}).`,
    });
  }

  // 7. CANAIS DE CONTATO DISPONÍVEIS (Até 15 pontos: +10 Telefone, +5 Email)
  if (company.telefone && company.telefone.trim().length >= 8) {
    totalScore += 10;
    reasons.push({
      criterion: "Telefone Cadastral",
      matched: true,
      points: 10,
      maxPoints: 10,
      detail: "Possui telefone empresarial registrado.",
    });
  } else {
    reasons.push({
      criterion: "Telefone Cadastral",
      matched: false,
      points: 0,
      maxPoints: 10,
      detail: "Sem telefone empresarial direto.",
    });
  }

  if (company.email && company.email.includes("@")) {
    totalScore += 5;
    reasons.push({
      criterion: "E-mail Cadastral",
      matched: true,
      points: 5,
      maxPoints: 5,
      detail: "Possui endereço de e-mail institucional.",
    });
  } else {
    reasons.push({
      criterion: "E-mail Cadastral",
      matched: false,
      points: 0,
      maxPoints: 5,
      detail: "Sem e-mail cadastral prévio.",
    });
  }

  return {
    score: totalScore,
    isMatch: totalScore >= minThreshold && isWithinDateRange,
    reasons,
  };
}
