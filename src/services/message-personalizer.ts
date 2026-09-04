import { formatSaoPauloDate } from "@/lib/date-utils";
import { AppLogger } from "@/lib/logger";

const personalizerLogger = new AppLogger("personalizer");

export interface PersonalizationContext {
  company: {
    razaoSocial: string;
    nomeFantasia?: string | null;
    municipio: string;
    uf: string;
    cnaePrincipal: string;
    dataAbertura: Date | string;
  };
  contact?: {
    nome: string;
    cargo?: string | null;
  } | null;
  campaign: {
    productName: string;
    productDescription?: string | null;
    senderName?: string;
    organizationName?: string;
  };
}

/**
 * Motor de Personalização Contextual de Mensagens (Fase 5)
 */
export function personalizeMessage(
  templateText: string,
  context: PersonalizationContext
): { personalized: string; missingVariables: string[] } {
  if (!templateText) {
    return { personalized: "", missingVariables: [] };
  }

  const openingDate = new Date(context.company.dataAbertura);
  const now = new Date();
  const daysSinceOpening = Math.max(
    0,
    Math.floor((now.getTime() - openingDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const contactName = context.contact?.nome || "Responsável";
  const firstName = contactName.split(" ")[0];

  const variableMap: Record<string, string> = {
    "{{company_name}}": context.company.nomeFantasia || context.company.razaoSocial,
    "{{razao_social}}": context.company.razaoSocial,
    "{{contact_name}}": contactName,
    "{{first_name}}": firstName,
    "{{city}}": context.company.municipio,
    "{{state}}": context.company.uf,
    "{{cnae}}": context.company.cnaePrincipal,
    "{{opening_date}}": formatSaoPauloDate(openingDate),
    "{{days_since_opening}}": String(daysSinceOpening),
    "{{product_name}}": context.campaign.productName,
    "{{cta}}": context.campaign.productDescription || "Gostaria de ver uma demonstração de 5 minutos?",
    "{{sender_name}}": context.campaign.senderName || "Equipe Comercial",
    "{{company_sender}}": context.campaign.organizationName || "Nossa Empresa",
  };

  let personalized = templateText;
  const missingVariables: string[] = [];

  // Localizar todas as tags {{variavel}}
  const tagRegex = /\{\{[a-zA-Z0-9_-]+\}\}/g;
  const foundTags = templateText.match(tagRegex) || [];

  for (const tag of foundTags) {
    if (variableMap[tag] !== undefined) {
      personalized = personalized.replaceAll(tag, variableMap[tag]);
    } else {
      missingVariables.push(tag);
    }
  }

  if (missingVariables.length > 0) {
    personalizerLogger.debug("MISSING_PERSONALIZATION_VARIABLES", { missingVariables });
  }

  return {
    personalized,
    missingVariables,
  };
}
