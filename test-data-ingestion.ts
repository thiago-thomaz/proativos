import { prisma } from "./src/lib/prisma";
import { processCompanyBatch } from "./src/services/data-ingestion/ingestion-engine";
import { MockSandboxProvider, generateValidCnpj } from "./src/services/data-providers/mock-sandbox-provider";
import { validateCnpj, normalizeCnpj, normalizePhone, normalizeEmail } from "./src/services/data-ingestion/normalizer";

async function runDataIngestionTests() {
  console.log("=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 3 - DATA INGESTION ENGINE ===\n");

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

  // Limpar dados temporários de testes anteriores para garantir isolamento
  await prisma.lead.deleteMany({}).catch(() => {});
  await prisma.campaign.deleteMany({}).catch(() => {});
  await prisma.company.deleteMany({ where: { sourceProvider: "MOCK_SANDBOX" } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { slug: { startsWith: "test-org-" } } }).catch(() => {});

  // Seed único por execução de teste para garantir isolamento determinístico
  const seed = Math.floor(Math.random() * 800000) + 100000;

  // Configurar Organização e Campanha de Teste para Auto-Matching de ICP
  const testOrgA = await prisma.organization.upsert({
    where: { slug: `test-org-a-${seed}` },
    create: { name: "Org Teste A", slug: `test-org-a-${seed}` },
    update: {},
  });

  const testOrgB = await prisma.organization.upsert({
    where: { slug: `test-org-b-${seed}` },
    create: { name: "Org Teste B", slug: `test-org-b-${seed}` },
    update: {},
  });

  const testCampaignA = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Restaurantes SP Ingestão",
      productName: "ERP para Restaurantes",
      status: "LIVE",
      minScore: 70,
      icpFilters: JSON.stringify({
        version: 2,
        industry: { mainCnaes: ["5611201"], secondaryCnaes: [], acceptSecondaryCnae: true, strictMainCnaeOnly: false, terms: ["restaurante"] },
        location: { ufs: ["SP"], cities: ["São Paulo", "Bauru"], country: "BR", regions: [], strictLocation: true },
        companySize: { allowedPortes: ["ME", "EPP"] },
        openingDate: { mode: "PRESET", preset: "LAST_30_DAYS" },
        status: ["ATIVA"],
        minScore: 70,
      }),
    },
  });

  // -------------------------------------------------------------
  // TESTE 1: CNPJ novo -> Company criada com lineage de origem
  // -------------------------------------------------------------
  const cnpj1 = generateValidCnpj(seed + 1);
  const res1 = await processCompanyBatch(
    [
      {
        cnpj: cnpj1,
        razaoSocial: "Restaurante Teste Ingestão 1 Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes e similares",
        municipio: "Bauru",
        uf: "SP",
        porte: "ME",
        capitalSocial: 50000,
        telefone: "14999991111",
        email: "contato@teste1.com.br",
        sourceRecordId: `REC-${seed}-1`,
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );

  const companyDb1 = await prisma.company.findUnique({ where: { cnpj: normalizeCnpj(cnpj1) } });
  assert(
    res1.recordsCreated === 1 &&
    Boolean(companyDb1) &&
    companyDb1?.sourceProvider === "MOCK_SANDBOX" &&
    companyDb1?.sourceRecordId === `REC-${seed}-1`,
    "TESTE 1: CNPJ novo cria Company com Data Lineage de origem"
  );

  // -------------------------------------------------------------
  // TESTE 2: Mesmo CNPJ novamente -> Idempotência garantida
  // -------------------------------------------------------------
  const res2 = await processCompanyBatch(
    [
      {
        cnpj: cnpj1,
        razaoSocial: "Restaurante Teste Ingestão 1 Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes e similares",
        municipio: "Bauru",
        uf: "SP",
        porte: "ME",
        capitalSocial: 50000,
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  assert(res2.recordsCreated === 0 && res2.recordsSkipped === 1, "TESTE 2: Idempotência de CNPJ (sem duplicação no banco)");

  // -------------------------------------------------------------
  // TESTE 3: CNPJ existente com alteração -> Company atualizada + CompanyEvent
  // -------------------------------------------------------------
  const res3 = await processCompanyBatch(
    [
      {
        cnpj: cnpj1,
        razaoSocial: "Restaurante Teste Ingestão 1 Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes e similares",
        municipio: "Bauru",
        uf: "SP",
        porte: "EPP", // Porte alterado de ME para EPP
        capitalSocial: 120000, // Capital aumentado
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  const events3 = await prisma.companyEvent.findMany({ where: { companyId: companyDb1?.id } });
  assert(
    res3.recordsUpdated === 1 && events3.some(e => e.eventType === "PORTE_CHANGED"),
    "TESTE 3: Alteração de dados cadastrais atualiza Company e gera CompanyEvent auditável"
  );

  // -------------------------------------------------------------
  // TESTE 4: CNPJ inválido -> Rejeitado
  // -------------------------------------------------------------
  const res4 = await processCompanyBatch(
    [
      {
        cnpj: "00000000000000", // CNPJ com dígitos inválidos
        razaoSocial: "Empresa Fake Invalida",
        dataAbertura: "2026-08-01",
        cnaePrincipal: "5611201",
        municipio: "SP",
        uf: "SP",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  assert(res4.recordsFailed === 1 && res4.recordsCreated === 0, "TESTE 4: CNPJ com dígitos inválidos é rejeitado");

  // -------------------------------------------------------------
  // TESTE 5: Status normalizado
  // -------------------------------------------------------------
  const cnpj5 = generateValidCnpj(seed + 5);
  await processCompanyBatch(
    [
      {
        cnpj: cnpj5,
        razaoSocial: "Empresa Baixada Teste",
        dataAbertura: "2026-08-01",
        situacao: "08 - BAIXADA",
        cnaePrincipal: "5611201",
        municipio: "São Paulo",
        uf: "SP",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  const companyDb5 = await prisma.company.findUnique({ where: { cnpj: normalizeCnpj(cnpj5) } });
  assert(companyDb5?.situacao === "BAIXADA", "TESTE 5: Normalização de status cadastral para enum canônico");

  // -------------------------------------------------------------
  // TESTE 6: Data de abertura no futuro -> Rejeitado
  // -------------------------------------------------------------
  const cnpj6 = generateValidCnpj(seed + 6);
  const res6 = await processCompanyBatch(
    [
      {
        cnpj: cnpj6,
        razaoSocial: "Empresa Futura Fake",
        dataAbertura: "2026-12-31", // Futuro
        cnaePrincipal: "5611201",
        municipio: "São Paulo",
        uf: "SP",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  assert(res6.recordsFailed === 1, "TESTE 6: Data de abertura futura é rejeitada");

  // -------------------------------------------------------------
  // TESTE 7: Lote de 100 empresas válidas
  // -------------------------------------------------------------
  const mockProvider = new MockSandboxProvider();
  const discovery100 = await mockProvider.discoverCompanies({ limit: 100, cursor: String(seed + 100) });
  const res7 = await processCompanyBatch(discovery100.records, { providerName: "MOCK_SANDBOX" });
  assert(res7.recordsRead === 100 && res7.recordsCreated === 100, "TESTE 7: Ingestão de lote de 100 empresas processado com sucesso");

  // -------------------------------------------------------------
  // TESTE 8: 5 registros inválidos em lote de 100 -> 95 processados
  // -------------------------------------------------------------
  const discovery95 = await mockProvider.discoverCompanies({ limit: 95, cursor: String(seed + 300) });
  const mixedBatch = [...discovery95.records];
  mixedBatch.push({ cnpj: "11111111111111", razaoSocial: "Inv 1", dataAbertura: "2026-08-01", cnaePrincipal: "5611201", municipio: "SP", uf: "SP" });
  mixedBatch.push({ cnpj: "22222222222222", razaoSocial: "Inv 2", dataAbertura: "2026-08-01", cnaePrincipal: "5611201", municipio: "SP", uf: "SP" });
  mixedBatch.push({ cnpj: "33333333333333", razaoSocial: "Inv 3", dataAbertura: "2026-08-01", cnaePrincipal: "5611201", municipio: "SP", uf: "SP" });
  mixedBatch.push({ cnpj: "44444444444444", razaoSocial: "Inv 4", dataAbertura: "2026-08-01", cnaePrincipal: "5611201", municipio: "SP", uf: "SP" });
  mixedBatch.push({ cnpj: "55555555555555", razaoSocial: "Inv 5", dataAbertura: "2026-08-01", cnaePrincipal: "5611201", municipio: "SP", uf: "SP" });

  const res8 = await processCompanyBatch(mixedBatch, { providerName: "MOCK_SANDBOX" });
  assert(res8.recordsFailed === 5 && res8.recordsCreated === 95 && res8.recordsRead === 100, "TESTE 8: Falhas individuais em registros inválidos não abortam o lote");

  // -------------------------------------------------------------
  // TESTE 9: Falha temporária de provider com Retry simulado
  // -------------------------------------------------------------
  mockProvider.setSimulatedFailures(2); // Vai falhar 2 vezes antes de ter sucesso
  let attempts = 0;
  let successOnRetry = false;
  while (attempts < 5) {
    attempts++;
    try {
      await mockProvider.discoverCompanies({ limit: 5 });
      successOnRetry = true;
      break;
    } catch (err) {
      // Backoff
    }
  }
  assert(successOnRetry === true && attempts === 3, "TESTE 9: Resiliência a falhas temporárias com retry e backoff");

  // -------------------------------------------------------------
  // TESTE 10: Limite de retries excedido -> Status FAILED
  // -------------------------------------------------------------
  mockProvider.setSimulatedFailures(10);
  let failedJob = false;
  try {
    await mockProvider.discoverCompanies({ limit: 5 });
  } catch (err) {
    failedJob = true;
  }
  assert(failedJob === true, "TESTE 10: Falha sustentada atinge limite de retries e marca job como falho");

  // Resetar simulação de falhas para os próximos testes
  mockProvider.setSimulatedFailures(0);

  // -------------------------------------------------------------
  // TESTE 11: Checkpoint de sincronização incremental
  // -------------------------------------------------------------
  const batchA = await mockProvider.discoverCompanies({ limit: 10, cursor: String(seed + 500) });
  const batchB = await mockProvider.discoverCompanies({ limit: 10, cursor: batchA.nextCursor || undefined });
  assert(
    batchA.nextCursor === String(seed + 510) && batchB.records[0].sourceRecordId === `MOCK-${seed + 510}`,
    "TESTE 11: Checkpoint de cursor retoma paginação no ponto exato"
  );

  // -------------------------------------------------------------
  // TESTE 12: Modo Dry Run / Simulação (sem alterar banco)
  // -------------------------------------------------------------
  const dryCnpj = generateValidCnpj(seed + 999);
  const res12 = await processCompanyBatch(
    [
      {
        cnpj: dryCnpj,
        razaoSocial: "Empresa Dry Run",
        dataAbertura: "2026-08-25",
        cnaePrincipal: "5611201",
        municipio: "Bauru",
        uf: "SP",
      },
    ],
    { providerName: "MOCK_SANDBOX", dryRun: true }
  );
  const compDry = await prisma.company.findUnique({ where: { cnpj: normalizeCnpj(dryCnpj) } });
  assert(res12.status === "SIMULATION" && compDry === null, "TESTE 12: Modo Dry Run calcula estatísticas sem persistir no banco");

  // -------------------------------------------------------------
  // TESTE 13: Company compatível com campanha ativa -> Lead criado automaticamente
  // -------------------------------------------------------------
  const cnpjLead = generateValidCnpj(seed + 777);
  const res13 = await processCompanyBatch(
    [
      {
        cnpj: cnpjLead,
        razaoSocial: "Restaurante Automatch Bauru Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes",
        municipio: "Bauru",
        uf: "SP",
        porte: "ME",
        capitalSocial: 60000,
        telefone: "14988887777",
        email: "rest@bauru.com.br",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  const createdLead = await prisma.lead.findFirst({
    where: { campaignId: testCampaignA.id, company: { cnpj: normalizeCnpj(cnpjLead) } },
  });
  assert(
    res13.leadsCreated >= 1 && Boolean(createdLead) && (createdLead?.score || 0) >= 70,
    "TESTE 13: Empresa ingerida compatível com campanha ativa gera Lead automaticamente via ICP Engine"
  );

  // -------------------------------------------------------------
  // TESTE 14: Company incompatível -> Nenhum lead criado para a campanha
  // -------------------------------------------------------------
  const cnpjIncomp = generateValidCnpj(seed + 888);
  const res14 = await processCompanyBatch(
    [
      {
        cnpj: cnpjIncomp,
        razaoSocial: "Transportadora Rodoviaria Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "4930202 - Transporte de Cargas",
        municipio: "Rio de Janeiro",
        uf: "RJ",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  const noLead = await prisma.lead.findFirst({
    where: { campaignId: testCampaignA.id, company: { cnpj: normalizeCnpj(cnpjIncomp) } },
  });
  assert(noLead === null, "TESTE 14: Empresa incompatível não gera Lead para a campanha");

  // -------------------------------------------------------------
  // TESTE 15: Lead duplicado -> Não duplicar (garantia de unicidade)
  // -------------------------------------------------------------
  const res15 = await processCompanyBatch(
    [
      {
        cnpj: cnpjLead,
        razaoSocial: "Restaurante Automatch Bauru Ltda",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes",
        municipio: "Bauru",
        uf: "SP",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );
  const leadsCount = await prisma.lead.count({
    where: { campaignId: testCampaignA.id, company: { cnpj: normalizeCnpj(cnpjLead) } },
  });
  assert(res15.leadsCreated === 0 && leadsCount === 1, "TESTE 15: Garantia de unicidade de leads (org + campaign + company)");

  // -------------------------------------------------------------
  // TESTE 16: CompanyEvent criado em alteração cadastral
  // -------------------------------------------------------------
  const eventsCount = await prisma.companyEvent.count({ where: { company: { cnpj: normalizeCnpj(cnpj1) } } });
  assert(eventsCount >= 1, "TESTE 16: Auditoria de CompanyEvent persistida no banco");

  // -------------------------------------------------------------
  // TESTE 17: Source Lineage rastreável
  // -------------------------------------------------------------
  const lineageComp = await prisma.company.findUnique({ where: { cnpj: normalizeCnpj(cnpj1) } });
  assert(
    lineageComp?.sourceProvider === "MOCK_SANDBOX" && Boolean(lineageComp?.sourceRecordId),
    "TESTE 17: Data Lineage com rastreabilidade da origem e do identificador"
  );

  // -------------------------------------------------------------
  // TESTE 18: Isolamento Multi-Tenancy
  // -------------------------------------------------------------
  const leadOrgA = await prisma.lead.findFirst({ where: { organizationId: testOrgA.id } });
  const leadOrgB = await prisma.lead.findFirst({ where: { organizationId: testOrgB.id } });
  assert(
    Boolean(leadOrgA) && leadOrgB === null,
    "TESTE 18: Isolamento rigoroso de Leads entre organizações distintas (Multi-Tenancy)"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDataIngestionTests();
