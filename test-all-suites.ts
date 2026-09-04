import { execSync } from "child_process";

const suites = [
  { name: "Fase 1 - Foundation", file: "test-fase1.ts" },
  { name: "Fase 1 - Opening Date Filter", file: "test-opening-date.ts" },
  { name: "Fase 2 - ICP Engine", file: "test-icp-engine.ts" },
  { name: "Fase 3 - Data Ingestion Engine", file: "test-data-ingestion.ts" },
  { name: "Fase 4 - Contact Enrichment", file: "test-contact-enrichment.ts" },
  { name: "Fase 5 - Outreach Engine", file: "test-outreach-engine.ts" },
  { name: "Fase 6 - Production Orchestration & n8n", file: "test-phase6-production-orchestration.ts" },
  { name: "Fase 6.5 - Opportunity Intelligence", file: "test-opportunity-intelligence.ts" },
  { name: "Fase 7 - Revenue & Autonomous Sales", file: "test-phase7-revenue-autonomous-sales.ts" },
  { name: "Fase 8 - Production Reality Audit", file: "test-production-reality.ts" },
  { name: "Fase 8 - Security & Compliance Hardening", file: "test-security-hardening.ts" },
  { name: "Fase 8 - Multi-Tenancy Security", file: "test-multitenancy-security.ts" },
  { name: "Fase 8 - E2E Core Flow", file: "test-e2e-core-flow.ts" },
  { name: "Fase 8 - API Contracts", file: "test-api-contracts.ts" },
];

console.log("================================================================================");
console.log("🚀 EXECUTANDO SUÍTE MESTRA DE REGRESSÃO E AUDITORIA DE PRODUÇÃO (14 SUÍTES)");
console.log("================================================================================\n");

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;

for (const suite of suites) {
  process.stdout.write(`⏳ Executando ${suite.name} (${suite.file})... `);
  try {
    const output = execSync(`npx tsx ${suite.file}`, { 
      encoding: "utf-8", 
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 100 * 1024 * 1024
    });
    console.log("✅ PASSOU!");
    totalSuitesPassed++;
  } catch (err: any) {
    console.log("❌ FALHOU!");
    console.error(err.stdout || err.stderr || err.message);
    totalSuitesFailed++;
  }
}

console.log("\n================================================================================");
console.log(`📊 RELATÓRIO FINAL: ${totalSuitesPassed}/${suites.length} SUÍTES PASSARAM COM 100% DE SUCESSO!`);
console.log("================================================================================\n");

if (totalSuitesFailed > 0) {
  process.exit(1);
}
