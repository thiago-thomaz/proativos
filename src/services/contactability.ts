import {
  ContactabilityResult,
  ContactabilityBreakdownItem,
  LeadReadiness,
  ContactType,
  VerificationStatus,
  WhatsAppStatus,
} from "@/lib/types";

export interface ContactForScoring {
  nome: string;
  cargo?: string | null;
  tipo: ContactType | string;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  emailStatus?: VerificationStatus | string;
  whatsappStatus?: WhatsAppStatus | string;
  phoneStatus?: VerificationStatus | string;
  optOut?: boolean;
  confidenceScore?: number;
}

/**
 * Motor de Contatabilidade e Prontidão de Leads (Fase 4)
 */
export function calculateContactabilityScore(
  contacts: ContactForScoring[],
  icpScore: number = 70
): ContactabilityResult {
  const breakdown: ContactabilityBreakdownItem[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];

  let totalScore = 0;
  let hasDecisionMaker = false;
  let hasVerifiedWhatsApp = false;
  let hasValidEmail = false;
  let hasValidPhone = false;

  // Filtrar contatos não suprimidos (Opt-Out)
  const activeContacts = contacts.filter((c) => !c.optOut && c.phoneStatus !== "SUPPRESSED" && c.emailStatus !== "SUPPRESSED");

  if (activeContacts.length === 0) {
    warnings.push("Nenhum canal de contato ativo disponível (necessita enriquecimento).");
    return {
      contactabilityScore: 0,
      leadReadiness: "NOT_READY",
      priorityScore: Math.round(0.6 * icpScore),
      hasDecisionMaker: false,
      hasVerifiedWhatsApp: false,
      hasValidEmail: false,
      hasValidPhone: false,
      breakdown: [
        {
          criterion: "Canais Ativos",
          points: 0,
          maxPoints: 100,
          verified: false,
          detail: "Sem contatos válidos cadastrados.",
        },
      ],
      reasons: [],
      warnings,
    };
  }

  // 1. Avaliação de Decisor Mapeado (Até 25 pontos)
  const decisionMaker = activeContacts.find((c) => c.tipo === "DECISION_MAKER" || (c.cargo && /s[oó]cio|administrador|diretor|propriet[aá]rio|presidente/i.test(c.cargo)));
  if (decisionMaker) {
    hasDecisionMaker = true;
    totalScore += 25;
    const detail = `Decisor identificado no QSA: ${decisionMaker.nome} (${decisionMaker.cargo || "Sócio"}).`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "Decisor Identificado (QSA)",
      points: 25,
      maxPoints: 25,
      verified: true,
      detail,
    });
  } else {
    warnings.push("⚠ Decisor formal não identificado no quadro societário.");
    breakdown.push({
      criterion: "Decisor Identificado (QSA)",
      points: 0,
      maxPoints: 25,
      verified: false,
      detail: "Apenas contatos institucionais identificados.",
    });
  }

  // 2. Avaliação de WhatsApp (Até 30 pontos)
  const verifiedWa = activeContacts.find((c) => c.whatsappStatus === "VERIFIED");
  const likelyWa = activeContacts.find((c) => c.whatsappStatus === "LIKELY" || (c.telefone && c.telefone.length === 11 && c.telefone[2] === "9"));

  if (verifiedWa) {
    hasVerifiedWhatsApp = true;
    totalScore += 30;
    const detail = `WhatsApp comercial confirmado ativo (${verifiedWa.whatsapp || verifiedWa.telefone}).`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "WhatsApp Verificado",
      points: 30,
      maxPoints: 30,
      verified: true,
      detail,
    });
  } else if (likelyWa) {
    totalScore += 15;
    const detail = `Linha móvel celular identificada (${likelyWa.telefone}), aguardando ping do WhatsApp.`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "WhatsApp Potencial (Celular)",
      points: 15,
      maxPoints: 30,
      verified: false,
      detail,
    });
  } else {
    warnings.push("⚠ Linha de WhatsApp não encontrada.");
    breakdown.push({
      criterion: "WhatsApp",
      points: 0,
      maxPoints: 30,
      verified: false,
      detail: "Sem linha móvel ou WhatsApp ativo.",
    });
  }

  // 3. Avaliação de Telefone Geral / Linha Fixa (Até 20 pontos)
  const anyPhone = activeContacts.find((c) => Boolean(c.telefone && c.telefone.length >= 8 && c.phoneStatus !== "INVALID"));
  if (anyPhone) {
    hasValidPhone = true;
    totalScore += 20;
    const detail = `Linha telefônica cadastral válida (${anyPhone.telefone}).`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "Telefone Cadastral",
      points: 20,
      maxPoints: 20,
      verified: true,
      detail,
    });
  } else {
    breakdown.push({
      criterion: "Telefone Cadastral",
      points: 0,
      maxPoints: 20,
      verified: false,
      detail: "Sem telefone válido.",
    });
  }

  // 4. Avaliação de E-mail Corporativo / Institucional (Até 20 pontos)
  const verifiedEmail = activeContacts.find((c) => c.email && c.emailStatus === "VERIFIED");
  const validEmail = activeContacts.find((c) => c.email && c.emailStatus === "FORMAT_VALID");

  if (verifiedEmail) {
    hasValidEmail = true;
    totalScore += 20;
    const detail = `E-mail corporativo verificado via MX/SMTP (${verifiedEmail.email}).`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "E-mail Corporativo Verificado",
      points: 20,
      maxPoints: 20,
      verified: true,
      detail,
    });
  } else if (validEmail) {
    hasValidEmail = true;
    totalScore += 15;
    const detail = `E-mail institucional com formato válido (${validEmail.email}).`;
    reasons.push(`✓ ${detail}`);
    breakdown.push({
      criterion: "E-mail Institucional",
      points: 15,
      maxPoints: 20,
      verified: false,
      detail,
    });
  } else {
    warnings.push("⚠ Sem e-mail válido cadastrado.");
    breakdown.push({
      criterion: "E-mail",
      points: 0,
      maxPoints: 20,
      verified: false,
      detail: "Sem e-mail institucional.",
    });
  }

  // 5. Bônus de Recência e Múltiplas Origens (Até 5 pontos)
  const hasHighConfidence = activeContacts.some((c) => (c.confidenceScore || 0) >= 80);
  if (hasHighConfidence) {
    totalScore += 5;
    breakdown.push({
      criterion: "Alta Confiança da Fonte",
      points: 5,
      maxPoints: 5,
      verified: true,
      detail: "Dados validados por bases de alta integridade (QSA / Operadoras).",
    });
  }

  const finalContactability = Math.min(100, Math.max(0, totalScore));

  // Determinar Lead Readiness
  let leadReadiness: LeadReadiness = "NOT_READY";
  if (finalContactability >= 70 && (hasVerifiedWhatsApp || hasDecisionMaker)) {
    leadReadiness = "READY";
  } else if (finalContactability >= 40) {
    leadReadiness = "PARTIALLY_READY";
  } else {
    leadReadiness = "NOT_READY";
  }

  // Lead Priority Score: 60% ICP + 40% Contactability
  const priorityScore = Math.round(0.6 * icpScore + 0.4 * finalContactability);

  return {
    contactabilityScore: finalContactability,
    leadReadiness,
    priorityScore,
    hasDecisionMaker,
    hasVerifiedWhatsApp,
    hasValidEmail,
    hasValidPhone,
    breakdown,
    reasons,
    warnings,
  };
}
