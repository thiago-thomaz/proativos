import { NLPInterpretationResult, ICPStructuredDefinition, OpeningDatePreset } from "@/lib/types";

interface IndustryMapping {
  terms: string[];
  mainCnaes: string[];
  secondaryCnaes: string[];
  label: string;
}

const KNOWLEDGE_MAPPINGS: IndustryMapping[] = [
  {
    terms: ["restaurante", "restaurantes", "pizzaria", "pizzarias", "hamburgueria", "bar", "bares", "gastronomia", "comida", "alimentacao", "alimentação"],
    mainCnaes: ["5611201", "5611203", "5611204"],
    secondaryCnaes: ["5620104", "5611205"],
    label: "Alimentação Fora do Lar / Restaurantes e Bares",
  },
  {
    terms: ["software", "tecnologia", "ti", "programacao", "programação", "saas", "tech", "desenvolvimento", "software house"],
    mainCnaes: ["6201501", "6202300", "6203100"],
    secondaryCnaes: ["6204000", "6209100", "6311900"],
    label: "Tecnologia da Informação & Software",
  },
  {
    terms: ["comercio", "comércio", "varejo", "loja", "lojas", "comercio varejista"],
    mainCnaes: ["4711302", "4712100", "4781400", "4782201"],
    secondaryCnaes: ["4789099"],
    label: "Comércio Varejista",
  },
  {
    terms: ["construcao", "construção", "construcao civil", "engenharia", "obras", "empreiteira"],
    mainCnaes: ["4120400", "4299501", "4399103"],
    secondaryCnaes: ["4321500", "4322301"],
    label: "Construção Civil & Engenharia",
  },
  {
    terms: ["clinica", "clínica", "consultorio", "consultório", "medicina", "saude", "saúde", "odontologia", "dentista", "medico", "médico"],
    mainCnaes: ["8630503", "8630504", "8630501"],
    secondaryCnaes: ["8640201", "8650001"],
    label: "Saúde, Clínicas Médicas & Odontologia",
  },
  {
    terms: ["transporte", "logistica", "logística", "frete", "transportadora", "cargas"],
    mainCnaes: ["4930202", "4930201", "5211701"],
    secondaryCnaes: ["5250803", "5250804"],
    label: "Transporte & Logística",
  },
  {
    terms: ["contabilidade", "contador", "escritorio contabil", "auditoria"],
    mainCnaes: ["6920601", "6920602"],
    secondaryCnaes: ["7020400"],
    label: "Serviços Contábeis & Auditoria",
  },
  {
    terms: ["marketing", "publicidade", "propaganda", "agencia", "agência"],
    mainCnaes: ["7311400", "7319002", "7319003"],
    secondaryCnaes: ["7320300"],
    label: "Publicidade & Marketing Digital",
  },
];

const UF_MAP: Record<string, string> = {
  "sao paulo": "SP",
  "sp": "SP",
  "rio de janeiro": "RJ",
  "rj": "RJ",
  "minas gerais": "MG",
  "mg": "MG",
  "parana": "PR",
  "paraná": "PR",
  "pr": "PR",
  "santa catarina": "SC",
  "sc": "SC",
  "rio grande do sul": "RS",
  "rs": "RS",
  "bahia": "BA",
  "ba": "BA",
  "brasil": "ALL",
  "todo brasil": "ALL",
  "nacional": "ALL",
};

const CITY_MAP: Record<string, string> = {
  "bauru": "Bauru",
  "campinas": "Campinas",
  "ribeirao preto": "Ribeirão Preto",
  "ribeirão preto": "Ribeirão Preto",
  "santos": "Santos",
  "sao jose dos campos": "São José dos Campos",
  "são josé dos campos": "São José dos Campos",
  "sorocaba": "Sorocaba",
  "curitiba": "Curitiba",
  "porto alegre": "Porto Alegre",
  "belo horizonte": "Belo Horizonte",
  "salvador": "Salvador",
};

function normalizeText(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Interpretador de Linguagem Natural para o ICP Engine
 */
export function interpretNaturalLanguageICP(prompt: string): NLPInterpretationResult {
  const norm = normalizeText(prompt);
  let confidenceScore = 0.5;

  // 1. Identificar Segmentos e CNAEs
  let matchedMapping: IndustryMapping | null = null;
  const matchedTerms: string[] = [];

  for (const mapping of KNOWLEDGE_MAPPINGS) {
    for (const term of mapping.terms) {
      const cleanTerm = normalizeText(term);
      if (norm.includes(cleanTerm)) {
        matchedMapping = mapping;
        matchedTerms.push(term);
        confidenceScore += 0.2;
        break;
      }
    }
    if (matchedMapping) break;
  }

  // 2. Identificar Localização (UFs e Cidades)
  const identifiedUfs: string[] = [];
  const identifiedCities: string[] = [];

  for (const [key, uf] of Object.entries(UF_MAP)) {
    if (norm.includes(key)) {
      if (uf !== "ALL") {
        if (!identifiedUfs.includes(uf)) identifiedUfs.push(uf);
        confidenceScore += 0.15;
      }
    }
  }

  for (const [key, city] of Object.entries(CITY_MAP)) {
    if (norm.includes(key)) {
      if (!identifiedCities.includes(city)) identifiedCities.push(city);
      confidenceScore += 0.15;
    }
  }

  // 3. Identificar Período de Abertura
  let openingMode: "PRESET" | "CUSTOM" | "FROM_DATE" | "UNTIL_DATE" = "PRESET";
  let openingPreset: OpeningDatePreset = "LAST_30_DAYS";
  let customFrom: string | null = null;
  let customTo: string | null = null;

  if (norm.includes("hoje")) {
    openingPreset = "TODAY";
    confidenceScore += 0.1;
  } else if (norm.includes("3 dias")) {
    openingPreset = "LAST_3_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("7 dias") || norm.includes("semana")) {
    openingPreset = "LAST_7_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("15 dias") || norm.includes("quinzena")) {
    openingPreset = "LAST_15_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("60 dias") || norm.includes("2 meses")) {
    openingPreset = "LAST_60_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("90 dias") || norm.includes("trimestre") || norm.includes("3 meses")) {
    openingPreset = "LAST_90_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("180 dias") || norm.includes("semestre") || norm.includes("6 meses")) {
    openingPreset = "LAST_180_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("365 dias") || norm.includes("1 ano") || norm.includes("ano")) {
    openingPreset = "LAST_365_DAYS";
    confidenceScore += 0.1;
  } else if (norm.includes("janeiro e marco") || norm.includes("janeiro e marco de 2026") || norm.includes("jan a mar")) {
    openingMode = "CUSTOM";
    customFrom = "2026-01-01";
    customTo = "2026-03-31";
    confidenceScore += 0.15;
  } else if (norm.includes("desde janeiro") || norm.includes("a partir de janeiro")) {
    openingMode = "FROM_DATE";
    customFrom = "2026-01-01";
    confidenceScore += 0.15;
  }

  // 4. Identificar Porte
  const portes: string[] = [];
  if (norm.includes("mei")) portes.push("MEI");
  if (norm.includes("microempresa") || norm.includes(" me ") || norm.includes("pequenas")) portes.push("ME");
  if (norm.includes("epp") || norm.includes("medio porte")) portes.push("EPP");
  if (portes.length === 0) portes.push("MEI", "ME", "EPP");

  // 5. Verificar Ambiguidade
  let isAmbiguous = false;
  let ambiguityWarning: string | undefined;
  let ambiguityOptions: NLPInterpretationResult["ambiguityOptions"];

  if (norm.includes("tecnologia") && !norm.includes("software") && !norm.includes("saas")) {
    isAmbiguous = true;
    ambiguityWarning = "O termo 'tecnologia' abrange diversos segmentos. Escolha o foco prioritário:";
    ambiguityOptions = [
      {
        label: "Desenvolvimento de Software & SaaS",
        description: "Empresas desenvolvedoras de sistemas e aplicativos sob encomenda.",
        cnaes: ["6201501", "6202300"],
      },
      {
        label: "Infraestrutura & Suporte de TI",
        description: "Manutenção de redes, suporte técnico e consultoria.",
        cnaes: ["6204000", "6209100"],
      },
      {
        label: "Portais & Provedores de Conteúdo",
        description: "Hospedagem, processamento de dados e portais web.",
        cnaes: ["6311900", "6319400"],
      },
    ];
  } else if (norm.includes("comercio") && !norm.includes("varejo") && !norm.includes("alimento")) {
    isAmbiguous = true;
    ambiguityWarning = "O termo 'comércio' possui múltiplos ramos. Deseja focar em:";
    ambiguityOptions = [
      {
        label: "Comércio Varejista Geral",
        description: "Mercadorias em geral, vestuário e utilidades.",
        cnaes: ["4711302", "4781400"],
      },
      {
        label: "Comércio de Materiais de Construção",
        description: "Tintas, ferragens e materiais elétricos.",
        cnaes: ["4744099"],
      },
    ];
  }

  confidenceScore = Math.min(0.98, Math.max(0.4, confidenceScore));

  const structuredIcp: ICPStructuredDefinition = {
    version: 2,
    industry: {
      terms: matchedTerms.length > 0 ? matchedTerms : ["geral"],
      mainCnaes: matchedMapping ? matchedMapping.mainCnaes : [],
      secondaryCnaes: matchedMapping ? matchedMapping.secondaryCnaes : [],
      acceptSecondaryCnae: true,
      strictMainCnaeOnly: false,
    },
    location: {
      country: "BR",
      regions: [],
      ufs: identifiedUfs.length > 0 ? identifiedUfs : ["SP"],
      cities: identifiedCities,
      strictLocation: identifiedUfs.length > 0 || identifiedCities.length > 0,
    },
    companySize: {
      allowedPortes: portes,
    },
    openingDate: {
      mode: openingMode,
      preset: openingMode === "PRESET" ? openingPreset : null,
      from: customFrom,
      to: customTo,
    },
    status: ["ATIVA"],
    contactRequirements: {
      anyContactPreferred: true,
    },
    minScore: 70,
  };

  return {
    structuredIcp,
    confidenceScore,
    isAmbiguous,
    ambiguityWarning,
    ambiguityOptions,
    extractedEntities: {
      segments: matchedMapping ? [matchedMapping.label] : ["Todos os segmentos"],
      locations: [...identifiedUfs, ...identifiedCities],
      timeframe: openingMode === "PRESET" ? openingPreset : `Personalizado (${customFrom || ""} a ${customTo || ""})`,
      sizes: portes,
    },
  };
}
