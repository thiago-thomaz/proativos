import { ICPQualityAssessment, ICPQualityRating } from "@/lib/types";

export function assessICPQuality(
  totalUniverse: number,
  matchedCount: number,
  distribution: {
    "90-100": number;
    "80-89": number;
    "70-79": number;
    "60-69": number;
    "<60": number;
  }
): ICPQualityAssessment {
  if (totalUniverse === 0) {
    return {
      rating: "Bom",
      matchedRatio: 0,
      totalUniverse: 0,
      matchedCount: 0,
      scoreDistribution: distribution,
      suggestions: ["A base de dados ainda não possui empresas no período informado."],
    };
  }

  const matchedRatio = matchedCount / totalUniverse;
  const suggestions: string[] = [];
  let rating: ICPQualityRating = "Bom";

  // Se menos de 3% do universo for aprovado
  if (matchedRatio < 0.03) {
    rating = "Muito restritivo";
    suggestions.push("Seu ICP parece muito restritivo. Considere ampliar a lista de municípios ou estados alvo.");
    suggestions.push("Habilite o aceite de CNAEs secundários além da atividade primária.");
    suggestions.push("Amplie a janela de data de abertura (ex: de 7 dias para 30 ou 60 dias).");
    suggestions.push("Permita mais portes empresariais (ex: incluir MEI ou ME).");
  }
  // Se mais de 80% do universo for aprovado
  else if (matchedRatio > 0.80) {
    rating = "Muito amplo";
    suggestions.push("Seu ICP parece muito amplo. Pode gerar um volume excessivo de contatos com menor conversão.");
    suggestions.push("Especifique CNAEs mais focados no seu nicho prioritário.");
    suggestions.push("Limite a localização para estados ou polos regionais específicos.");
    suggestions.push("Defina um capital social mínimo ou score mínimo mais alto (ex: 80%).");
  }
  // Taxa ideal de qualificação B2B (entre 10% e 40%)
  else if (matchedRatio >= 0.10 && matchedRatio <= 0.40) {
    rating = "Excelente";
    suggestions.push("Seu ICP possui excelente equilíbrio entre precisão de segmento e volume de prospecção.");
    suggestions.push("Recomendamos iniciar a campanha em modo Simulação para auditar os primeiros leads.");
  } else {
    rating = "Bom";
    suggestions.push("Distribuição de ICP equilibrada. Aderência satisfatória para campanhas comerciais.");
  }

  return {
    rating,
    matchedRatio,
    totalUniverse,
    matchedCount,
    scoreDistribution: distribution,
    suggestions,
  };
}
