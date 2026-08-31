import { calculateICPScore } from "./src/services/icp-matcher";
import { resolveOpeningDateRange, validateOpeningDateFilter, parseSaoPauloDate, formatSaoPauloDate } from "./src/lib/date-utils";
import { ICPFilterConfig, OpeningDateFilter } from "./src/lib/types";

async function runOpeningDateTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: FILTRO DE DATA DE ABERTURA ===\n");

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

  // Data de referência fixada para testes determinísticos: 31/08/2026 14:00:00 BRT
  const refNow = new Date("2026-08-31T17:00:00.000Z"); // 14h em SP (UTC-3)

  const baseCompany = {
    cnpj: "00000001000191",
    razaoSocial: "Restaurante Teste Data Ltda",
    situacao: "ATIVA",
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    municipio: "São Paulo",
    uf: "SP",
    porte: "ME",
    capitalSocial: 50000,
    telefone: "11999998888",
    email: "contato@teste.com.br",
  };

  // -------------------------------------------------------------
  // TESTE 1: LAST_30_DAYS — Empresa aberta ontem: PASS
  // -------------------------------------------------------------
  const icpLast30Days: ICPFilterConfig = {
    states: ["SP"],
    cities: ["São Paulo"],
    cnaes: ["5611201"],
    portes: ["ME"],
    openingDate: { mode: "PRESET", preset: "LAST_30_DAYS" },
  };

  const compYesterday = {
    ...baseCompany,
    dataAbertura: new Date("2026-08-30T15:00:00.000Z"), // Ontem
  };
  const res1 = calculateICPScore(compYesterday, icpLast30Days, 70, refNow);
  assert(res1.isMatch === true && res1.score >= 85, "TESTE 1: LAST_30_DAYS - Empresa aberta ontem (PASS)");

  // -------------------------------------------------------------
  // TESTE 2: LAST_30_DAYS — Empresa aberta há 15 dias: PASS
  // -------------------------------------------------------------
  const comp15Days = {
    ...baseCompany,
    dataAbertura: new Date("2026-08-16T15:00:00.000Z"), // 15 dias atrás
  };
  const res2 = calculateICPScore(comp15Days, icpLast30Days, 70, refNow);
  assert(res2.isMatch === true && res2.score >= 85, "TESTE 2: LAST_30_DAYS - Empresa aberta há 15 dias (PASS)");

  // -------------------------------------------------------------
  // TESTE 3: LAST_30_DAYS — Empresa aberta há 45 dias: FAIL (Fora do período)
  // -------------------------------------------------------------
  const comp45Days = {
    ...baseCompany,
    dataAbertura: new Date("2026-07-15T15:00:00.000Z"), // 47 dias atrás
  };
  const res3 = calculateICPScore(comp45Days, icpLast30Days, 70, refNow);
  assert(res3.isMatch === false, "TESTE 3: LAST_30_DAYS - Empresa aberta há 45 dias (FAIL)");

  // -------------------------------------------------------------
  // TESTE 4: CUSTOM (01/07/2026 -> 31/07/2026) — Aberta em 15/07: PASS
  // -------------------------------------------------------------
  const icpCustomJuly: ICPFilterConfig = {
    states: ["SP"],
    cities: ["São Paulo"],
    cnaes: ["5611201"],
    portes: ["ME"],
    openingDate: {
      mode: "CUSTOM",
      from: "2026-07-01",
      to: "2026-07-31",
    },
  };

  const compMidJuly = {
    ...baseCompany,
    dataAbertura: new Date("2026-07-15T12:00:00.000Z"), // 15/07/2026
  };
  const res4 = calculateICPScore(compMidJuly, icpCustomJuly, 70, refNow);
  assert(res4.isMatch === true, "TESTE 4: CUSTOM (01/07 a 31/07) - Empresa aberta em 15/07 (PASS)");

  // -------------------------------------------------------------
  // TESTE 5: CUSTOM (01/07/2026 -> 31/07/2026) — Aberta em 01/08: FAIL
  // -------------------------------------------------------------
  const compAug1 = {
    ...baseCompany,
    dataAbertura: new Date("2026-08-01T12:00:00.000Z"), // 01/08/2026
  };
  const res5 = calculateICPScore(compAug1, icpCustomJuly, 70, refNow);
  assert(res5.isMatch === false, "TESTE 5: CUSTOM (01/07 a 31/07) - Empresa aberta em 01/08 (FAIL)");

  // -------------------------------------------------------------
  // TESTE 6: FROM_DATE (01/01/2026) — Aberta em 15/08/2026: PASS
  // -------------------------------------------------------------
  const icpFromJan: ICPFilterConfig = {
    states: ["SP"],
    cities: ["São Paulo"],
    cnaes: ["5611201"],
    portes: ["ME"],
    openingDate: {
      mode: "FROM_DATE",
      from: "2026-01-01",
    },
  };

  const compAug15 = {
    ...baseCompany,
    dataAbertura: new Date("2026-08-15T12:00:00.000Z"),
  };
  const res6 = calculateICPScore(compAug15, icpFromJan, 70, refNow);
  assert(res6.isMatch === true, "TESTE 6: FROM_DATE (01/01/2026) - Empresa aberta em 15/08/2026 (PASS)");

  // -------------------------------------------------------------
  // TESTE 7: UNTIL_DATE (31/07/2026) — Aberta em 15/07/2026: PASS
  // -------------------------------------------------------------
  const icpUntilJuly: ICPFilterConfig = {
    states: ["SP"],
    cities: ["São Paulo"],
    cnaes: ["5611201"],
    portes: ["ME"],
    openingDate: {
      mode: "UNTIL_DATE",
      to: "2026-07-31",
    },
  };
  const res7 = calculateICPScore(compMidJuly, icpUntilJuly, 70, refNow);
  assert(res7.isMatch === true, "TESTE 7: UNTIL_DATE (31/07/2026) - Empresa aberta em 15/07/2026 (PASS)");

  // -------------------------------------------------------------
  // TESTE 8: Empresa aberta no futuro (> refNow): FAIL / Score 0
  // -------------------------------------------------------------
  const compFuture = {
    ...baseCompany,
    dataAbertura: new Date("2026-09-15T12:00:00.000Z"), // Futuro
  };
  const res8 = calculateICPScore(compFuture, icpLast30Days, 70, refNow);
  assert(res8.isMatch === false && res8.score === 0, "TESTE 8: Empresa aberta no futuro é rejeitada com score 0 (PASS)");

  // -------------------------------------------------------------
  // TESTE 9: Data inicial posterior à final (Validação): VALIDATION ERROR
  // -------------------------------------------------------------
  const invalidFilter: OpeningDateFilter = {
    mode: "CUSTOM",
    from: "2026-08-15",
    to: "2026-08-01", // Anterior ao from
  };
  const val9 = validateOpeningDateFilter(invalidFilter, refNow);
  assert(val9.valid === false && Boolean(val9.error?.includes("não pode ser posterior")), "TESTE 9: Data inicial > final gera erro de validação (PASS)");

  // -------------------------------------------------------------
  // TESTE 10: Timezone America/Sao_Paulo (Início 00:00:00 e Fim 23:59:59.999)
  // -------------------------------------------------------------
  const startDay = parseSaoPauloDate("2026-08-31", false);
  const endDay = parseSaoPauloDate("2026-08-31", true);
  
  const startFmt = formatSaoPauloDate(startDay);
  const endFmt = formatSaoPauloDate(endDay);
  
  const isStartCorrect = startFmt === "31/08/2026";
  const isEndCorrect = endFmt === "31/08/2026";
  const spanMs = endDay.getTime() - startDay.getTime();
  const isFullDay = spanMs === (24 * 60 * 60 * 1000 - 1); // 86.399.999 ms

  assert(isStartCorrect && isEndCorrect && isFullDay, "TESTE 10: Timezone America/Sao_Paulo início e fim do dia com precisão de milissegundos (PASS)");

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runOpeningDateTests();
