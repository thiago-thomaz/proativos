import { calculateICPScore } from "./src/services/icp-matcher";
import { formatCNPJ, cleanCNPJ } from "./src/lib/utils";
import { ICPFilterConfig } from "./src/lib/types";

async function runTests() {
  console.log("=== EXECUTANDO TESTES DE VALIDAÇÃO DA FASE 1 ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Teste de Normalização de CNPJ
  const rawCnpj = "00.000.001/0001-91";
  const cleaned = cleanCNPJ(rawCnpj);
  assert(cleaned === "00000001000191", "Normalização de CNPJ (remove pontuação)");
  assert(formatCNPJ(cleaned) === "00.000.001/0001-91", "Formatação de CNPJ padrão");

  // 2. Teste do Algoritmo Determinístico de Scoring ICP
  const testIcp: ICPFilterConfig = {
    states: ["SP"],
    cities: ["Bauru", "São Paulo"],
    cnaes: ["5611201"], // Restaurantes
    portes: ["ME", "EPP"],
    maxDaysOpened: 15,
    minCapital: 10000,
    maxCapital: 200000,
  };

  // 2.1 Caso Perfeito (Deve dar score >= 85)
  const perfectCompany = {
    cnpj: "00000001000191",
    razaoSocial: "Restaurante Teste Ltda",
    dataAbertura: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    situacao: "ATIVA",
    cnaePrincipal: "56.11-2-01 - Restaurantes e similares",
    municipio: "Bauru",
    uf: "SP",
    porte: "ME",
    capitalSocial: 50000,
    telefone: "14999998888",
    email: "contato@restaurante.com.br",
  };

  const result1 = calculateICPScore(perfectCompany, testIcp, 75);
  assert(result1.score >= 85, `Score da empresa perfeita (${result1.score} >= 85)`);
  assert(result1.isMatch === true, "Match confirmado para empresa no perfil ideal");
  assert(result1.reasons.length >= 5, "Detalhamento explicativo (Lead Explanation) gerado");

  // 2.2 Empresa Inativa (Deve dar score 0 imediatamente)
  const inactiveCompany = {
    ...perfectCompany,
    situacao: "BAIXADA",
  };
  const result2 = calculateICPScore(inactiveCompany, testIcp, 75);
  assert(result2.score === 0, "Empresa com situação inativa/baixada pontua 0");
  assert(result2.isMatch === false, "Empresa inativa rejeitada");

  // 2.3 Empresa fora do estado/CNAE (Score baixo)
  const outOfScopeCompany = {
    cnpj: "00000002000172",
    razaoSocial: "Oficina Mecânica RJ",
    dataAbertura: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
    situacao: "ATIVA",
    cnaePrincipal: "45.20-0-01 - Serviços de manutenção",
    municipio: "Rio de Janeiro",
    uf: "RJ",
    porte: "DEMAIS",
    capitalSocial: 1000,
    telefone: null,
    email: null,
  };
  const result3 = calculateICPScore(outOfScopeCompany, testIcp, 75);
  assert(result3.score < 40, `Empresa fora do escopo pontua baixo (${result3.score} < 40)`);
  assert(result3.isMatch === false, "Empresa fora do escopo rejeitada");

  console.log(`\nResumo dos testes: ${passed} passaram, ${failed} falharam.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
