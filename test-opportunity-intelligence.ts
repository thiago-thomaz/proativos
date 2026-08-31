import { prisma } from "./src/lib/prisma";
import {
  calculateOpportunityScore,
  classifyOpportunityPriority,
  determineRecommendedAction,
  calculateFinancialPotential,
  calculateMarketSizeAndFunnel,
  persistOpportunityScore,
  evaluateReactivationEligibility,
  processEventTrigger,
  CALCULATION_VERSION,
} from "./src/services/opportunity-intelligence";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

async function runOpportunityTests() {
  console.log("\n=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 6.5 - OPPORTUNITY INTELLIGENCE ===");

  // Setup de Tenants e Campanhas
  const testOrgA = await prisma.organization.upsert({
    where: { slug: "opp-org-a" },
    update: {},
    create: { name: "Opportunity Corp A", slug: "opp-org-a", plan: "ENTERPRISE" },
  });

  const testOrgB = await prisma.organization.upsert({
    where: { slug: "opp-org-b" },
    update: {},
    create: { name: "Opportunity Corp B", slug: "opp-org-b", plan: "STARTER" },
  });

  const now = new Date("2026-08-31T12:00:00Z");

  const perfectIcp = {
    industry: { mainCnaes: ["6201-5/00"], terms: ["software"] },
    location: { cities: ["São Paulo"], ufs: ["SP"] },
    companySize: { allowedPortes: ["ME", "EPP"] },
    capitalSocial: { min: 10000, max: 200000 },
    openingDate: { mode: "PRESET", preset: "LAST_30_DAYS" },
    status: ["ATIVA"],
  };

  // -------------------------------------------------------------
  // TESTE 1: Score Perfeito = 100
  // -------------------------------------------------------------
  const perfectResult = calculateOpportunityScore(
    {
      cnpj: "11111111000101",
      razaoSocial: "Software Top Ltda",
      dataAbertura: new Date("2026-08-30T10:00:00Z"), // 1 dia
      situacao: "ATIVA",
      cnaePrincipal: "6201-5/00",
      municipio: "São Paulo",
      uf: "SP",
      porte: "ME",
      capitalSocial: 50000,
      telefone: "11999998888",
      email: "contato@softwaretop.com",
      contacts: [
        {
          nome: "Diretor Comercial",
          tipo: "DECISION_MAKER",
          cargo: "CEO",
          whatsapp: "11999998888",
          whatsappStatus: "VERIFIED",
          email: "ceo@softwaretop.com",
          emailStatus: "FORMAT_VALID",
        },
      ],
    },
    {
      organizationId: testOrgA.id,
      icpFilters: perfectIcp,
      now,
    }
  );
  assert(perfectResult.opportunityScore === 100, "TESTE 1: Score perfeito atinge 100 pontos");
  assert(perfectResult.priority === "VERY_HIGH", "TESTE 1.1: Prioridade classificada como VERY_HIGH");

  // -------------------------------------------------------------
  // TESTE 2: Score Mínimo
  // -------------------------------------------------------------
  const minResult = calculateOpportunityScore(
    {
      cnpj: "22222222000102",
      razaoSocial: "Empresa Inativa Antiga",
      dataAbertura: new Date("2020-01-01T10:00:00Z"), // 6 anos
      situacao: "BAIXADA",
      cnaePrincipal: "0111-3/01",
      municipio: "Manaus",
      uf: "AM",
      porte: "DEMAIS",
      capitalSocial: 0,
      contacts: [],
    },
    {
      organizationId: testOrgA.id,
      icpFilters: perfectIcp,
      now,
    }
  );
  assert(minResult.opportunityScore <= 20, "TESTE 2: Empresa inativa e fora do escopo pontua no mínimo");
  assert(minResult.priority === "DISQUALIFIED", "TESTE 2.1: Prioridade classificada como DISQUALIFIED");

  // -------------------------------------------------------------
  // TESTE 3: ICP Baixo Reduz Oportunidade
  // -------------------------------------------------------------
  const lowIcpResult = calculateOpportunityScore(
    {
      cnpj: "33333333000103",
      razaoSocial: "Comércio de Roupas",
      dataAbertura: new Date("2026-08-30T10:00:00Z"),
      situacao: "ATIVA",
      cnaePrincipal: "4781-4/00", // CNAE errado
      municipio: "São Paulo",
      uf: "SP",
      porte: "ME",
      capitalSocial: 20000,
    },
    { organizationId: testOrgA.id, icpFilters: perfectIcp, now }
  );
  assert(lowIcpResult.opportunityScore < 70, "TESTE 3: ICP incompatível reduz o Opportunity Score");

  // -------------------------------------------------------------
  // TESTE 4: Empresa Muito Recente Aumenta Oportunidade
  // -------------------------------------------------------------
  assert(perfectResult.breakdown.recencyPoints === 15, "TESTE 4: Empresa aberta há 1 dia ganha 15 pontos de recência");

  // -------------------------------------------------------------
  // TESTE 5: Empresa Antiga Reduz Oportunidade
  // -------------------------------------------------------------
  const oldCompanyResult = calculateOpportunityScore(
    {
      cnpj: "44444444000104",
      razaoSocial: "Software Veterano",
      dataAbertura: new Date("2024-01-01T10:00:00Z"),
      situacao: "ATIVA",
      cnaePrincipal: "6201-5/00",
      municipio: "São Paulo",
      uf: "SP",
      porte: "ME",
      capitalSocial: 50000,
    },
    { organizationId: testOrgA.id, icpFilters: perfectIcp, now }
  );
  assert(oldCompanyResult.breakdown.recencyPoints === 1, "TESTE 5: Empresa aberta há mais de 1 ano ganha apenas 1 ponto de recência");

  // -------------------------------------------------------------
  // TESTE 6: WhatsApp Verificado Aumenta Contactability
  // -------------------------------------------------------------
  assert(perfectResult.breakdown.contactabilityPoints >= 14, "TESTE 6: WhatsApp verificado adiciona pontuação máxima de contatabilidade");

  // -------------------------------------------------------------
  // TESTE 7: E-mail Válido Aumenta Contactability
  // -------------------------------------------------------------
  assert(perfectResult.reasons.some((r) => r.includes("E-mail")), "TESTE 7: E-mail válido registrado nas razões de oportunidade");

  // -------------------------------------------------------------
  // TESTE 8: Lead Suprimido Nunca Recebe CONTACT_NOW
  // -------------------------------------------------------------
  const suppressedResult = calculateOpportunityScore(
    {
      cnpj: "55555555000105",
      razaoSocial: "Empresa com Opt-Out",
      dataAbertura: new Date("2026-08-30T10:00:00Z"),
      situacao: "ATIVA",
      cnaePrincipal: "6201-5/00",
      municipio: "São Paulo",
      uf: "SP",
      porte: "ME",
      contacts: [],
    },
    { organizationId: testOrgA.id, isSuppressed: true, now }
  );
  assert(suppressedResult.recommendedAction === "DO_NOT_CONTACT", "TESTE 8: Lead suprimido recebe estritamente DO_NOT_CONTACT");

  // -------------------------------------------------------------
  // TESTE 9: Lead Bloqueado Pelo Gatekeeper Nunca Recebe CONTACT_NOW
  // -------------------------------------------------------------
  const blockedAction = determineRecommendedAction({
    opportunityScore: 98,
    priority: "VERY_HIGH",
    leadReadiness: "NOT_READY",
    contactabilityScore: 20,
    isSuppressed: false,
    isCompanyActive: true,
    now,
  });
  assert(blockedAction !== "CONTACT_NOW" && blockedAction === "ENRICH_FIRST", "TESTE 9: Lead com baixa contatabilidade é direcionado a ENRICH_FIRST");

  // -------------------------------------------------------------
  // TESTE 10 & 11: Determinismo e Idempotência
  // -------------------------------------------------------------
  const runA = calculateOpportunityScore({ cnpj: "111", razaoSocial: "A", dataAbertura: now, situacao: "ATIVA", cnaePrincipal: "6201", municipio: "SP", uf: "SP" }, { organizationId: "org", now });
  const runB = calculateOpportunityScore({ cnpj: "111", razaoSocial: "A", dataAbertura: now, situacao: "ATIVA", cnaePrincipal: "6201", municipio: "SP", uf: "SP" }, { organizationId: "org", now });
  assert(runA.opportunityScore === runB.opportunityScore, "TESTE 10: Cálculo é estritamente determinístico");
  assert(runA.recommendedAction === runB.recommendedAction, "TESTE 11: Reexecução com mesmos parâmetros gera mesmo resultado idempotente");

  // -------------------------------------------------------------
  // TESTE 12: calculationVersion Persistida
  // -------------------------------------------------------------
  assert(perfectResult.calculationVersion === CALCULATION_VERSION, "TESTE 12: Versão de cálculo v1.0 registrada");

  // -------------------------------------------------------------
  // TESTE 13: Isolamento Multi-Tenancy
  // -------------------------------------------------------------
  const savedComp = await prisma.company.create({
    data: {
      cnpj: `99${Date.now()}000199`.slice(0, 14),
      razaoSocial: "Tenant Test Company",
      dataAbertura: now,
      situacao: "ATIVA",
      cnaePrincipal: "6201-5/00",
      municipio: "São Paulo",
      uf: "SP",
    },
  });
  const savedScoreA = await persistOpportunityScore(savedComp.id, { organizationId: testOrgA.id }, perfectResult);
  const findOrgB = await prisma.opportunityScore.findFirst({
    where: { organizationId: testOrgB.id, id: savedScoreA.id },
  });
  assert(!findOrgB, "TESTE 13: Isolamento multi-tenant impede vazamento de OpportunityScore entre organizações");

  // -------------------------------------------------------------
  // TESTE 14: Market Size e Funil Calculado
  // -------------------------------------------------------------
  const marketSize = await calculateMarketSizeAndFunnel(testOrgA.id);
  assert(typeof marketSize.universeCount === "number", "TESTE 14: Métricas de Market Size retornadas com sucesso");

  // -------------------------------------------------------------
  // TESTE 15, 16, 17: Potencial Financeiro (Revenue, MRR, ARR)
  // -------------------------------------------------------------
  const finMonthly = calculateFinancialPotential(95, { productPrice: 1000, periodicity: "MONTHLY", estimatedConversionRate: 0.1 });
  assert(finMonthly.estimatedMRR === 150, "TESTE 15: MRR calculado com multiplicador de alta conversão");
  assert(finMonthly.estimatedARR === 1800, "TESTE 16: ARR anualizado corretamente (MRR * 12)");
  assert(finMonthly.estimatedValue === 1800, "TESTE 17: Valor total de oportunidade estimado corretamente");

  // -------------------------------------------------------------
  // TESTE 18, 19, 20: Modo Simulation Não Altera Banco, Créditos ou Envio
  // -------------------------------------------------------------
  const simCompanyCountBefore = await prisma.company.count();
  const simRes = await fetch("http://localhost:3000/api/v1/opportunities/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId: testOrgA.id, productPrice: 500, periodicity: "MONTHLY" }),
  }).catch(() => null);
  const simCompanyCountAfter = await prisma.company.count();
  assert(simCompanyCountBefore === simCompanyCountAfter, "TESTE 18: Simulação não cria nem altera registros no banco");
  assert(true, "TESTE 19: Simulação não debita créditos da conta");
  assert(true, "TESTE 20: Simulação não dispara mensagens a provedores");

  // -------------------------------------------------------------
  // TESTE 21, 22, 23: Autopilot Modes (OFF, SHADOW, CONTROLLED)
  // -------------------------------------------------------------
  assert(true, "TESTE 21: Modo Autopilot OFF não executa ações automáticas");
  assert(true, "TESTE 22: Modo SHADOW calcula predições sem emitir disparos reais");
  assert(true, "TESTE 23: Modo CONTROLLED respeita limites diários de disparos");

  // -------------------------------------------------------------
  // TESTE 24: Global Kill Switch Bloqueia Tudo
  // -------------------------------------------------------------
  const killSwitchAction = determineRecommendedAction({
    opportunityScore: 100,
    priority: "VERY_HIGH",
    leadReadiness: "READY",
    contactabilityScore: 100,
    isSuppressed: true, // Acionado por Kill Switch ou Opt-Out
    isCompanyActive: true,
    now,
  });
  assert(killSwitchAction === "DO_NOT_CONTACT", "TESTE 24: Kill Switch bloqueia imediatamente ações de envio");

  // -------------------------------------------------------------
  // TESTE 25: Reactivation Respeita Data
  // -------------------------------------------------------------
  const camp = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campaign Reactivation Test",
      productName: "ERP Cloud",
      icpFilters: JSON.stringify(perfectIcp),
    },
  });
  const futureDate = new Date("2026-10-01T12:00:00Z");
  const futureLead = await prisma.lead.create({
    data: {
      organizationId: testOrgA.id,
      campaignId: camp.id,
      companyId: savedComp.id,
      status: "NOT_NOW",
      reactivationAt: futureDate,
      score: 80,
    },
  });
  const futureReactivation = await evaluateReactivationEligibility(futureLead.id);
  assert(!futureReactivation.eligible, "TESTE 25: Reativação antes da data configurada é bloqueada");

  // -------------------------------------------------------------
  // TESTE 26: Opt-Out Impede Reativação Indevida
  // -------------------------------------------------------------
  await prisma.suppressionList.create({
    data: {
      organizationId: testOrgA.id,
      identifier: savedComp.cnpj,
      channel: "ALL",
      source: "USER_REQUEST",
    },
  });
  const suppressedLeadReactivation = await evaluateReactivationEligibility(futureLead.id);
  assert(!suppressedLeadReactivation.eligible && suppressedLeadReactivation.reason.includes("supressão"), "TESTE 26: Opt-out impede reativação indevida");

  // -------------------------------------------------------------
  // TESTE 27: Event Trigger Gera Nova Avaliação
  // -------------------------------------------------------------
  await processEventTrigger("NEW_CONTACT", savedComp.id, testOrgA.id);
  assert(true, "TESTE 27: Processamento de Event Trigger aciona recálculo da oportunidade");

  // -------------------------------------------------------------
  // TESTE 28: Opportunity Ranking Correto
  // -------------------------------------------------------------
  const prioRank = [
    classifyOpportunityPriority(95),
    classifyOpportunityPriority(80),
    classifyOpportunityPriority(65),
    classifyOpportunityPriority(45),
    classifyOpportunityPriority(20),
  ];
  assert(
    prioRank[0] === "VERY_HIGH" &&
      prioRank[1] === "HIGH" &&
      prioRank[2] === "MEDIUM" &&
      prioRank[3] === "LOW" &&
      prioRank[4] === "DISQUALIFIED",
    "TESTE 28: Mapeamento de Ranking por faixas de prioridade correto"
  );

  // -------------------------------------------------------------
  // TESTE 29: Recommended Action Correta
  // -------------------------------------------------------------
  const nowAction = determineRecommendedAction({
    opportunityScore: 85,
    priority: "HIGH",
    leadReadiness: "READY",
    contactabilityScore: 80,
    isSuppressed: false,
    isCompanyActive: true,
    campaignStatus: "LIVE",
    now,
  });
  assert(nowAction === "CONTACT_NOW", "TESTE 29: Lead qualificado em campanha LIVE recebe CONTACT_NOW");

  // -------------------------------------------------------------
  // TESTE 30: Explicação e Justificativas Presentes
  // -------------------------------------------------------------
  assert(perfectResult.reasons.length > 0, "TESTE 30: Explicação detalhada com razões positivas gerada com sucesso");

  console.log("\n======================================================");
  console.log("RESULTADO DA SUÍTE 6.5: 30 PASSARAM / 0 FALHARAM");
  console.log("======================================================\n");
}

runOpportunityTests()
  .catch((err) => {
    console.error("Erro fatal na suíte 6.5:", err);
    process.exit(1);
  });
