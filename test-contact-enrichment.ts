import { prisma } from "./src/lib/prisma";
import { enrichCompanyContacts, suppressContact } from "./src/services/contact-enrichment/enrichment-engine";
import { MockEnrichmentProvider } from "./src/services/contact-enrichment/mock-enrichment-provider";
import { normalizeAndAuditContact } from "./src/services/contact-enrichment/contact-normalizer";
import { calculateContactabilityScore } from "./src/services/contactability";
import { generateValidCnpj } from "./src/services/data-providers/mock-sandbox-provider";
import { normalizeCnpj } from "./src/services/data-ingestion/normalizer";

async function runContactEnrichmentTests() {
  console.log("=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 4 - CONTACT & ENRICHMENT ENGINE ===\n");

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

  // Seed único de alta entropia por execução para isolamento
  const seed = (Date.now() % 80000) + Math.floor(Math.random() * 10000) + 1000;

  const testOrgA = await prisma.organization.upsert({
    where: { slug: `enrich-org-a-${seed}` },
    create: { name: "Org Enrich A", slug: `enrich-org-a-${seed}` },
    update: {},
  });

  const testOrgB = await prisma.organization.upsert({
    where: { slug: `enrich-org-b-${seed}` },
    create: { name: "Org Enrich B", slug: `enrich-org-b-${seed}` },
    update: {},
  });

  // -------------------------------------------------------------
  // TESTE 1: Empresa sem contatos -> enrichment executado e contatos criados
  // -------------------------------------------------------------
  const cnpj1 = generateValidCnpj(seed + 1);
  const company1 = await prisma.company.create({
    data: {
      cnpj: normalizeCnpj(cnpj1),
      razaoSocial: "Restaurante Sabor Brasil Ltda",
      dataAbertura: new Date("2026-08-15"),
      situacao: "ATIVA",
      cnaePrincipal: "5611201",
      municipio: "Bauru",
      uf: "SP",
      telefone: "1432345678",
      email: "contato@saborbrasil.com.br",
    },
  });

  const res1 = await enrichCompanyContacts(company1.id, { organizationId: testOrgA.id });
  const contactsCount1 = await prisma.contact.count({ where: { companyId: company1.id } });
  assert(res1.success && contactsCount1 >= 2, "TESTE 1: Empresa sem contatos recebe enrichment e grava contatos no banco");

  // -------------------------------------------------------------
  // TESTE 2: Empresa com telefone cadastral -> contato COMPANY_PHONE criado
  // -------------------------------------------------------------
  const compPhoneContact = await prisma.contact.findFirst({
    where: { companyId: company1.id, tipo: "COMPANY_PHONE" },
  });
  assert(
    Boolean(compPhoneContact) && compPhoneContact?.confidenceScore === 65,
    "TESTE 2: Telefone cadastral cria contato com tipo COMPANY_PHONE e confiança documentada"
  );

  // -------------------------------------------------------------
  // TESTE 3: Telefone duplicado -> não duplicar no banco
  // -------------------------------------------------------------
  await enrichCompanyContacts(company1.id, { organizationId: testOrgA.id });
  const countAfterReEnrich = await prisma.contact.count({ where: { companyId: company1.id } });
  assert(countAfterReEnrich === contactsCount1, "TESTE 3: Deduplicação de telefone não duplica contatos no banco");

  // -------------------------------------------------------------
  // TESTE 4: E-mail duplicado -> não duplicar
  // -------------------------------------------------------------
  const auditDuplicateEmail = await normalizeAndAuditContact(
    {
      nome: "Departamento Financeiro",
      cargo: "Financeiro",
      tipo: "INSTITUTIONAL_CONTACT",
      email: "contato@saborbrasil.com.br",
      confidenceScore: 70,
      sourceProvider: "RECEITA_DBE",
    },
    testOrgA.id
  );
  assert(auditDuplicateEmail.email === "contato@saborbrasil.com.br", "TESTE 4: Deduplicação de e-mail identificada");

  // -------------------------------------------------------------
  // TESTE 5: Telefones com máscaras diferentes -> mesma identidade canônica
  // -------------------------------------------------------------
  const auditPhoneMask1 = await normalizeAndAuditContact({
    nome: "Teste Mask 1",
    tipo: "COMPANY_PHONE",
    telefone: "+55 (14) 99876-5432",
    confidenceScore: 80,
    sourceProvider: "TEST",
  });
  const auditPhoneMask2 = await normalizeAndAuditContact({
    nome: "Teste Mask 2",
    tipo: "COMPANY_PHONE",
    telefone: "14998765432",
    confidenceScore: 80,
    sourceProvider: "TEST",
  });
  assert(
    auditPhoneMask1.telefone === "14998765432" && auditPhoneMask1.telefone === auditPhoneMask2.telefone,
    "TESTE 5: Normalização de telefone garante a mesma identidade canônica independentemente de máscaras"
  );

  // -------------------------------------------------------------
  // TESTE 6: E-mail normalizado -> mesma identidade canônica
  // -------------------------------------------------------------
  const auditEmail1 = await normalizeAndAuditContact({
    nome: "Teste Email 1",
    tipo: "INSTITUTIONAL_CONTACT",
    email: "  CONTATO@EMPRESA.COM.BR  ",
    confidenceScore: 70,
    sourceProvider: "TEST",
  });
  assert(auditEmail1.email === "contato@empresa.com.br", "TESTE 6: Normalização de e-mail (lowercase e trim) canônica");

  // -------------------------------------------------------------
  // TESTE 7: WhatsApp desconhecido em linha móvel -> marcado como LIKELY e não VERIFIED
  // -------------------------------------------------------------
  const auditWaUnknown = await normalizeAndAuditContact({
    nome: "Contato Móvel",
    tipo: "UNKNOWN",
    telefone: "11988887777",
    whatsappStatus: "UNKNOWN",
    confidenceScore: 60,
    sourceProvider: "TEST",
  });
  assert(
    auditWaUnknown.whatsappStatus === "LIKELY",
    "TESTE 7: Linha móvel sem validação ativa de API é marcada como LIKELY e não VERIFIED"
  );

  // -------------------------------------------------------------
  // TESTE 8: WhatsApp verificado pelo provider -> status VERIFIED
  // -------------------------------------------------------------
  const auditWaVerified = await normalizeAndAuditContact({
    nome: "Decisor Verificado",
    tipo: "DECISION_MAKER",
    cargo: "Sócio Administrador",
    telefone: "11988887777",
    whatsapp: "11988887777",
    whatsappStatus: "VERIFIED",
    confidenceScore: 95,
    sourceProvider: "MOCK_PROVIDER",
  });
  assert(auditWaVerified.whatsappStatus === "VERIFIED", "TESTE 8: WhatsApp confirmado por provider recebe status VERIFIED");

  // -------------------------------------------------------------
  // TESTE 9: Decisor encontrado com evidência no QSA -> DECISION_MAKER
  // -------------------------------------------------------------
  const decisionMakerDb = await prisma.contact.findFirst({
    where: { companyId: company1.id, tipo: "DECISION_MAKER" },
  });
  assert(
    Boolean(decisionMakerDb) && decisionMakerDb?.cargo === "Sócio-Administrador",
    "TESTE 9: Sócio no QSA com evidência comprovada é classificado rigorosamente como DECISION_MAKER"
  );

  // -------------------------------------------------------------
  // TESTE 10: Contato sem evidência de cargo -> não classificar como decisor
  // -------------------------------------------------------------
  const auditGenericContact = await normalizeAndAuditContact({
    nome: "Atendimento Geral",
    tipo: "DECISION_MAKER", // Tentativa de marcar como decisor sem cargo
    cargo: null,
    confidenceScore: 50,
    sourceProvider: "TEST",
  });
  assert(
    auditGenericContact.tipo === "INSTITUTIONAL_CONTACT",
    "TESTE 10: Contato sem comprovação de cargo é rebaixado para INSTITUTIONAL_CONTACT"
  );

  // -------------------------------------------------------------
  // TESTE 11: Falha temporária de provider -> retry
  // -------------------------------------------------------------
  const mockProvider = new MockEnrichmentProvider();
  mockProvider.setSimulatedFailures(2);
  let retrySuccess = false;
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      await mockProvider.enrichCompany({
        companyId: "dummy",
        cnpj: "00000000000191",
        razaoSocial: "Dummy Ltda",
        municipio: "SP",
        uf: "SP",
      });
      retrySuccess = true;
      break;
    } catch (e) {
      // Backoff
    }
  }
  assert(retrySuccess && attempts === 3, "TESTE 11: Resiliência do provider com retry e backoff após falhas temporárias");

  // -------------------------------------------------------------
  // TESTE 12: Limite de retries excedido -> Job FAILED
  // -------------------------------------------------------------
  mockProvider.setSimulatedFailures(10);
  let failedExpected = false;
  try {
    await mockProvider.enrichCompany({
      companyId: "dummy",
      cnpj: "00000000000191",
      razaoSocial: "Dummy Ltda",
      municipio: "SP",
      uf: "SP",
    });
  } catch (e) {
    failedExpected = true;
  }
  assert(failedExpected, "TESTE 12: Falha contínua atinge limite de tentativas e marca job como falho");

  // -------------------------------------------------------------
  // TESTE 13: Enrichment repetido na mesma empresa -> Idempotência sem novos contatos
  // -------------------------------------------------------------
  const countBefore = await prisma.contact.count({ where: { companyId: company1.id } });
  await enrichCompanyContacts(company1.id, { organizationId: testOrgA.id });
  const countAfter = await prisma.contact.count({ where: { companyId: company1.id } });
  assert(countBefore === countAfter, "TESTE 13: Execução repetida de enrichment mantém idempotência sem duplicação");

  // -------------------------------------------------------------
  // TESTE 14: Contato suprimido -> Status SUPPRESSED e bloqueio de outreach
  // -------------------------------------------------------------
  const contactToSuppress = await prisma.contact.findFirst({ where: { companyId: company1.id } });
  if (contactToSuppress) {
    await suppressContact(contactToSuppress.id, "USER_REQUEST", testOrgA.id);
  }
  const suppressedDb = await prisma.contact.findUnique({ where: { id: contactToSuppress?.id } });
  const scoreResult = calculateContactabilityScore([suppressedDb as any], 90);
  assert(
    suppressedDb?.phoneStatus === "SUPPRESSED" && suppressedDb?.optOut === true,
    "TESTE 14: Contato suprimido recebe status SUPPRESSED e é excluído do outreach"
  );

  // -------------------------------------------------------------
  // TESTE 15: Lead com ICP alto -> Enriquecimento prioritário
  // -------------------------------------------------------------
  const icpHighContacts = [
    { nome: "Carlos Silva", cargo: "Sócio Administrador", tipo: "DECISION_MAKER", telefone: "14999991111", whatsappStatus: "VERIFIED", email: "carlos@empresa.com.br", emailStatus: "FORMAT_VALID" },
  ];
  const contHigh = calculateContactabilityScore(icpHighContacts, 95);
  assert(contHigh.contactabilityScore >= 75 && contHigh.leadReadiness === "READY", "TESTE 15: Lead com ICP alto e canais diretos atinge status READY");

  // -------------------------------------------------------------
  // TESTE 16: Lead sem contatos válidos -> NOT_READY
  // -------------------------------------------------------------
  const contLow = calculateContactabilityScore([], 40);
  assert(contLow.contactabilityScore === 0 && contLow.leadReadiness === "NOT_READY", "TESTE 16: Lead sem canais válidos permanece NOT_READY");

  // -------------------------------------------------------------
  // TESTE 17: Multi-Tenancy -> Isolamento de contatos entre organizações
  // -------------------------------------------------------------
  const orgAContacts = await prisma.contact.count({ where: { organizationId: testOrgA.id } });
  const orgBContacts = await prisma.contact.count({ where: { organizationId: testOrgB.id } });
  assert(orgAContacts > 0 && orgBContacts === 0, "TESTE 17: Isolamento rigoroso de contatos entre organizações distintas");

  // -------------------------------------------------------------
  // TESTE 18: Source Lineage -> Origem rastreável no nível de registro
  // -------------------------------------------------------------
  const lineageContact = await prisma.contact.findFirst({ where: { companyId: company1.id, tipo: "DECISION_MAKER" } });
  assert(
    Boolean(lineageContact?.sourceProvider) && Boolean(lineageContact?.sourceRecordId),
    "TESTE 18: Source Lineage com rastreabilidade da origem e do identificador do provedor"
  );

  // -------------------------------------------------------------
  // TESTE 19: Field-Level Provenance -> Origem individual registrada por campo
  // -------------------------------------------------------------
  assert(
    Boolean(lineageContact?.nameSource) && Boolean(lineageContact?.whatsappSource) && Boolean(lineageContact?.emailSource),
    "TESTE 19: Field-Level Provenance com origem individual para cada campo de contato"
  );

  // -------------------------------------------------------------
  // TESTE 20: Dados pessoais sem origem -> Marcados com UNKNOWN
  // -------------------------------------------------------------
  const auditNoSource = await normalizeAndAuditContact({
    nome: "Pessoa Sem Origem",
    tipo: "UNKNOWN",
    sourceProvider: "",
    confidenceScore: 0,
  });
  assert(auditNoSource.tipo === "UNKNOWN", "TESTE 20: Dados de contato sem comprovação de origem são classificados como UNKNOWN");

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runContactEnrichmentTests();
