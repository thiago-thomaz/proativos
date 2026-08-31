import { evaluateCompanyAgainstICP } from "./src/services/icp-engine";
import { interpretNaturalLanguageICP } from "./src/services/nl-icp-parser";
import { assessICPQuality } from "./src/services/icp-quality";
import { ICPStructuredDefinition } from "./src/lib/types";
import { parseSaoPauloDate, formatSaoPauloDate } from "./src/lib/date-utils";

async function runICPEngineTests() {
  console.log("=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 2 - ICP ENGINE ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `-> ${detail}` : ""}`);
      failed++;
    }
  }

  // Data de referência fixada: 31/08/2026 14:00:00 (Fuso SP)
  const refNow = new Date("2026-08-31T17:00:00.000Z");

  const standardICP: ICPStructuredDefinition = {
    version: 2,
    industry: {
      terms: ["restaurante"],
      mainCnaes: ["5611201"],
      secondaryCnaes: ["5611203"],
      acceptSecondaryCnae: true,
      strictMainCnaeOnly: false,
    },
    location: {
      country: "BR",
      regions: [],
      ufs: ["SP"],
      cities: ["Bauru", "São Paulo"],
      strictLocation: true,
    },
    companySize: {
      allowedPortes: ["ME", "EPP"],
    },
    capitalSocial: {
      min: 10000,
      max: 500000,
    },
    openingDate: {
      mode: "PRESET",
      preset: "LAST_30_DAYS",
    },
    status: ["ATIVA"],
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

  const perfectCompany = {
    cnpj: "00000001000191",
    razaoSocial: "Restaurante Gourmet Bauru Ltda",
    situacao: "ATIVA",
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    cnaesSecundarios: ["56.11-2-03 - Lanchonetes"],
    municipio: "Bauru",
    uf: "SP",
    porte: "ME",
    capitalSocial: 50000,
    dataAbertura: new Date("2026-08-25T12:00:00.000Z"), // 6 dias atrás
    telefone: "14999998888",
    email: "contato@restaurante.com.br",
  };

  // -------------------------------------------------------------
  // TESTE 1: CNAE correto + localização correta + data correta -> Score alto (>= 85)
  // -------------------------------------------------------------
  const res1 = evaluateCompanyAgainstICP(perfectCompany, standardICP, refNow);
  assert(res1.matched === true && res1.score >= 85, "TESTE 1: CNAE correto + Localização correta + Data correta gera Score alto (>= 85)", `Score obtido: ${res1.score}`);

  // -------------------------------------------------------------
  // TESTE 2: CNAE errado -> Reject (Hard filter eliminatório)
  // -------------------------------------------------------------
  const wrongCnaeComp = {
    ...perfectCompany,
    cnaePrincipal: "62.01-5-01 - Desenvolvimento de Programas",
    cnaesSecundarios: [],
  };
  const res2 = evaluateCompanyAgainstICP(wrongCnaeComp, standardICP, refNow);
  assert(res2.matched === false && res2.score === 0, "TESTE 2: CNAE incompatível é rejeitado via Hard Filter");

  // -------------------------------------------------------------
  // TESTE 3: Localização errada -> Reject
  // -------------------------------------------------------------
  const wrongLocationComp = {
    ...perfectCompany,
    uf: "RJ",
    municipio: "Rio de Janeiro",
  };
  const res3 = evaluateCompanyAgainstICP(wrongLocationComp, standardICP, refNow);
  assert(res3.matched === false && res3.score === 0, "TESTE 3: Localização fora da área obrigatória é rejeitada");

  // -------------------------------------------------------------
  // TESTE 4: Empresa fora do período de abertura -> Reject
  // -------------------------------------------------------------
  const oldCompany = {
    ...perfectCompany,
    dataAbertura: new Date("2026-06-01T12:00:00.000Z"), // 90 dias atrás
  };
  const res4 = evaluateCompanyAgainstICP(oldCompany, standardICP, refNow);
  assert(res4.matched === false && res4.score === 0, "TESTE 4: Empresa fora do período de abertura é rejeitada");

  // -------------------------------------------------------------
  // TESTE 5: Empresa inativa -> Reject com Score 0
  // -------------------------------------------------------------
  const inactiveComp = {
    ...perfectCompany,
    situacao: "BAIXADA",
  };
  const res5 = evaluateCompanyAgainstICP(inactiveComp, standardICP, refNow);
  assert(res5.matched === false && res5.score === 0 && Boolean(res5.failedHardFilterReason), "TESTE 5: Empresa inativa/baixada é rejeitada com Score 0");

  // -------------------------------------------------------------
  // TESTE 6: CNAE secundário compatível -> Score intermediário aprovado
  // -------------------------------------------------------------
  const secCnaeComp = {
    ...perfectCompany,
    cnaePrincipal: "47.11-3-02 - Comércio Varejista", // Secundário tem 5611203
  };
  const res6 = evaluateCompanyAgainstICP(secCnaeComp, standardICP, refNow);
  assert(res6.matched === true && res6.score >= 70 && res6.score < 100, "TESTE 6: CNAE secundário compatível pontua e aprova com score intermediário", `Score: ${res6.score}`);

  // -------------------------------------------------------------
  // TESTE 7: Todos os critérios perfeitos -> Score 100
  // -------------------------------------------------------------
  const res7 = evaluateCompanyAgainstICP(perfectCompany, standardICP, refNow);
  assert(res7.score === 100, "TESTE 7: Todos os critérios atendidos atinge Score 100", `Score: ${res7.score}`);

  // -------------------------------------------------------------
  // TESTE 8: Sem contato disponível -> Perde pontos mas NÃO é reject imediato (Soft Filter)
  // -------------------------------------------------------------
  const noContactComp = {
    ...perfectCompany,
    telefone: null,
    email: null,
  };
  const res8 = evaluateCompanyAgainstICP(noContactComp, standardICP, refNow);
  assert(res8.matched === true && res8.score === 90, "TESTE 8: Sem contato perde pontos do soft filter sem rejeição imediata", `Score: ${res8.score}`);

  // -------------------------------------------------------------
  // TESTE 9: Score abaixo do threshold -> Reject por pontuação
  // -------------------------------------------------------------
  const strictIcp: ICPStructuredDefinition = {
    ...standardICP,
    minScore: 98, // Threshold muito alto
  };
  const res9 = evaluateCompanyAgainstICP(secCnaeComp, strictIcp, refNow);
  assert(res9.matched === false && res9.score > 0, "TESTE 9: Score inferior ao threshold é rejeitado", `Score: ${res9.score} vs Threshold: 98`);

  // -------------------------------------------------------------
  // TESTE 10: Score exatamente no threshold -> Match confirmado
  // -------------------------------------------------------------
  const exactThresholdIcp: ICPStructuredDefinition = {
    ...standardICP,
    minScore: 100,
  };
  const res10 = evaluateCompanyAgainstICP(perfectCompany, exactThresholdIcp, refNow);
  assert(res10.matched === true && res10.score === 100, "TESTE 10: Score igual ao threshold confirma Match");

  // -------------------------------------------------------------
  // TESTE 11: Múltiplos municípios cadastrados
  // -------------------------------------------------------------
  const compSaoPaulo = {
    ...perfectCompany,
    municipio: "São Paulo",
  };
  const res11 = evaluateCompanyAgainstICP(compSaoPaulo, standardICP, refNow);
  assert(res11.matched === true && res11.score === 100, "TESTE 11: Múltiplos municípios permite match na segunda cidade da lista");

  // -------------------------------------------------------------
  // TESTE 12: Múltiplos estados cadastrados
  // -------------------------------------------------------------
  const multiStateIcp: ICPStructuredDefinition = {
    ...standardICP,
    location: {
      ...standardICP.location,
      ufs: ["SP", "RJ", "MG"],
      cities: [],
    },
  };
  const compRJ = {
    ...perfectCompany,
    uf: "RJ",
    municipio: "Niterói",
  };
  const res12 = evaluateCompanyAgainstICP(compRJ, multiStateIcp, refNow);
  assert(res12.matched === true, "TESTE 12: Múltiplos estados permite match em qualquer UF da lista");

  // -------------------------------------------------------------
  // TESTE 13: Capital social dentro da faixa permitida
  // -------------------------------------------------------------
  const res13 = evaluateCompanyAgainstICP({ ...perfectCompany, capitalSocial: 50000 }, standardICP, refNow);
  assert(res13.breakdown.find(b => b.criterion === "Capital Social")?.matched === true, "TESTE 13: Capital social dentro da faixa concede pontuação");

  // -------------------------------------------------------------
  // TESTE 14: Capital social fora da faixa permitida (Abaixo de 10.000)
  // -------------------------------------------------------------
  const res14 = evaluateCompanyAgainstICP({ ...perfectCompany, capitalSocial: 2000 }, standardICP, refNow);
  assert(res14.score === 90 && res14.breakdown.find(b => b.criterion === "Capital Social")?.matched === false, "TESTE 14: Capital social abaixo do mínimo perde pontos");

  // -------------------------------------------------------------
  // TESTE 15: Interpretação de Linguagem Natural
  // -------------------------------------------------------------
  const nlpPrompt = "Quero restaurantes e bares abertos nos últimos 15 dias em São Paulo";
  const nlp1 = interpretNaturalLanguageICP(nlpPrompt);
  assert(
    nlp1.structuredIcp.industry.mainCnaes.includes("5611201") &&
    nlp1.structuredIcp.location.ufs.includes("SP") &&
    nlp1.structuredIcp.openingDate.preset === "LAST_15_DAYS" &&
    nlp1.confidenceScore >= 0.8,
    "TESTE 15: Processador de Linguagem Natural converte prompt em regras de ICP estruturadas"
  );

  // -------------------------------------------------------------
  // TESTE 16: Interpretação Ambígua em Linguagem Natural
  // -------------------------------------------------------------
  const ambiguousPrompt = "Quero empresas de tecnologia abertas este mês";
  const nlp2 = interpretNaturalLanguageICP(ambiguousPrompt);
  assert(
    nlp2.isAmbiguous === true &&
    Boolean(nlp2.ambiguityWarning) &&
    (nlp2.ambiguityOptions?.length || 0) > 0,
    "TESTE 16: Termo amplo/ambíguo gera alerta e opções de desambiguação"
  );

  // -------------------------------------------------------------
  // TESTE 17: Reprodutibilidade com Timestamp e Timezone Fixos
  // -------------------------------------------------------------
  const execA = evaluateCompanyAgainstICP(perfectCompany, standardICP, refNow);
  const execB = evaluateCompanyAgainstICP(perfectCompany, standardICP, refNow);
  assert(
    execA.score === execB.score &&
    execA.matched === execB.matched &&
    execA.reasons.length === execB.reasons.length,
    "TESTE 17: Reprodutibilidade de cálculo garantida em execuções idempotentes"
  );

  // -------------------------------------------------------------
  // TESTE 18: Timezone America/Sao_Paulo Início/Fim do Dia
  // -------------------------------------------------------------
  const startDay = parseSaoPauloDate("2026-08-31", false);
  const endDay = parseSaoPauloDate("2026-08-31", true);
  const isCorrectFmt = formatSaoPauloDate(startDay) === "31/08/2026" && formatSaoPauloDate(endDay) === "31/08/2026";
  const isFullPrecision = (endDay.getTime() - startDay.getTime()) === (24 * 60 * 60 * 1000 - 1);
  assert(isCorrectFmt && isFullPrecision, "TESTE 18: Resolução de datas no fuso America/Sao_Paulo com precisão milimétrica");

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runICPEngineTests();
