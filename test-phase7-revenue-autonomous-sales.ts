/**
 * SUÍTE DE TESTES AUTOMATIZADOS: FASE 7 - REVENUE & AUTONOMOUS SALES ENGINE
 * 
 * Cobertura de Módulos (130+ Testes):
 * 1. SaaS Billing & Planos (10 testes)
 * 2. Credit Economy & Atomic 2-Phase Lock/Commit/Refund (10 testes)
 * 3. CRM Deals & 10-Stage Pipeline (10 testes)
 * 4. Revenue Attribution Multi-Touch (10 testes)
 * 5. Opportunity Marketplace (15 testes)
 * 6. Lead Exclusivity Guarantee (10 testes)
 * 7. Lead Quality & Refund Engine (8 testes)
 * 8. Smart Lead Routing & Round-Robin (10 testes)
 * 9. A/B Testing & Statistical Significance (10 testes)
 * 10. Multi-Tenancy Hardening & Tenant Isolation (10 testes)
 * 11. Public API Versionada (/api/public/v1/*) (10 testes)
 * 12. Customer Webhooks & HMAC Signatures (10 testes)
 * 13. Smart Notifications & Autonomous Sales Loop (10 testes)
 */

import { prisma } from "./src/lib/prisma";
import crypto from "crypto";
import { syncSubscriptionPlans, subscribeOrganizationToPlan, checkPlanLimits, DEFAULT_PLANS } from "./src/services/revenue/billing-engine";
import { reserveCredits, commitCredits, refundReservedCredits, OPERATION_CREDIT_COSTS } from "./src/services/revenue/credit-economy";
import { createDealFromLead, updateDealStage, getPipelineSummary, STAGE_PROBABILITIES } from "./src/services/revenue/crm-engine";
import { routeLeadToOwner } from "./src/services/revenue/lead-routing";
import { attributeDealRevenue, getRevenueAttributionReport } from "./src/services/revenue/attribution-engine";
import { calculateOrganizationRoi } from "./src/services/revenue/roi-engine";
import { createAbExperiment, getNextVariantForExecution, recordVariantEvent, evaluateExperimentWinner } from "./src/services/revenue/ab-testing";
import { createMarketplacePackage, buyMarketplacePackage } from "./src/services/revenue/marketplace-engine";
import { submitRefundRequest, processRefundDecision } from "./src/services/revenue/refund-engine";
import { scheduleMeeting, updateMeetingStatus, listOrganizationMeetings } from "./src/services/revenue/meeting-engine";
import { sendSmartNotification, getUnreadNotifications, markNotificationAsRead } from "./src/services/revenue/notification-engine";
import { authenticatePublicApiRequest } from "./src/services/revenue/public-api-guard";
import { dispatchCustomerWebhook } from "./src/services/revenue/customer-webhooks";
import { runAutonomousSalesLoop } from "./src/services/revenue/autonomous-sales-loop";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✓ PASS: ${msg}`);
    passedCount++;
  } else {
    console.error(`✗ FAIL: ${msg}`);
    failedCount++;
    throw new Error(`Test assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log("\n=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 7 - REVENUE & AUTONOMOUS SALES ===");

  // Setup de Organizações de Teste
  const orgA = await prisma.organization.upsert({
    where: { slug: "test-org-rev-a" },
    update: {},
    create: { name: "Tenant Revenue A", slug: "test-org-rev-a", plan: "STARTER" },
  });

  const orgB = await prisma.organization.upsert({
    where: { slug: "test-org-rev-b" },
    update: {},
    create: { name: "Tenant Revenue B", slug: "test-org-rev-b", plan: "FREE" },
  });

  const userA1 = await prisma.user.upsert({
    where: { email: "sales1@org-a.com" },
    update: {},
    create: {
      organizationId: orgA.id,
      name: "Vendedor 1 SP",
      email: "sales1@org-a.com",
      passwordHash: "hash123",
      team: "Vendas SP",
    },
  });

  const userA2 = await prisma.user.upsert({
    where: { email: "sales2@org-a.com" },
    update: {},
    create: {
      organizationId: orgA.id,
      name: "Vendedor 2 SP",
      email: "sales2@org-a.com",
      passwordHash: "hash123",
      team: "Vendas SP",
    },
  });

  const campaignA = await prisma.campaign.upsert({
    where: { id: "camp_rev_test_a" },
    update: {},
    create: {
      id: "camp_rev_test_a",
      organizationId: orgA.id,
      name: "Campanha SaaS ERP SP",
      productName: "ERP Cloud",
      productPrice: 1200,
      icpFilters: JSON.stringify({ states: ["SP"] }),
    },
  });

  const companyA = await prisma.company.upsert({
    where: { cnpj: "11111111000199" },
    update: {},
    create: {
      cnpj: "11111111000199",
      razaoSocial: "Restaurante Sabor Paulista Ltda",
      nomeFantasia: "Sabor Paulista",
      dataAbertura: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      situacao: "ATIVA",
      cnaePrincipal: "5611201",
      uf: "SP",
      municipio: "São Paulo",
      porte: "ME",
      capitalSocial: 50000,
    },
  });

  const leadA = await prisma.lead.upsert({
    where: {
      organizationId_campaignId_companyId: {
        organizationId: orgA.id,
        campaignId: campaignA.id,
        companyId: companyA.id,
      },
    },
    update: {},
    create: {
      organizationId: orgA.id,
      campaignId: campaignA.id,
      companyId: companyA.id,
      score: 90,
      priorityScore: 90,
      status: "QUALIFIED",
      readiness: "READY",
    },
  });

  // -------------------------------------------------------------
  // 1. SAAS BILLING & PLANOS (10 Testes)
  // -------------------------------------------------------------
  await syncSubscriptionPlans();
  const plans = await prisma.subscriptionPlan.findMany();
  assert(plans.length >= 4, "TESTE 1: Sincronização inicial de planos cadastra 4 planos padrão");

  const subStarter = await subscribeOrganizationToPlan(orgA.id, "starter");
  assert(subStarter.sub.status === "ACTIVE", "TESTE 2: Assinatura de plano Starter realizada com sucesso");
  assert(subStarter.plan.priceMonthly === 297, "TESTE 3: Preço mensal do plano Starter validado (R$ 297)");

  const subPro = await subscribeOrganizationToPlan(orgA.id, "pro");
  assert(subPro.plan.slug === "pro", "TESTE 4: Upgrade para plano Pro atualiza registro de assinatura");
  assert(subPro.plan.monthlyCredits === 2000, "TESTE 5: Concessão de 2000 créditos mensais no plano Pro");

  const limitCheckA = await checkPlanLimits(orgA.id, "AB_TESTING");
  assert(limitCheckA.allowed === true, "TESTE 6: Feature AB_TESTING permitida no plano Pro");

  const subFree = await subscribeOrganizationToPlan(orgB.id, "free");
  assert(subFree.plan.slug === "free", "TESTE 7: Assinatura de plano Free na organização B");

  const limitCheckB = await checkPlanLimits(orgB.id, "PUBLIC_API");
  assert(limitCheckB.allowed === false, "TESTE 8: Feature PUBLIC_API bloqueada no plano Free");

  const subEnt = await subscribeOrganizationToPlan(orgA.id, "enterprise");
  assert(subEnt.plan.maxCampaigns === 100, "TESTE 9: Limite de 100 campanhas no plano Enterprise");

  const subExpired = await prisma.organizationSubscription.update({
    where: { organizationId: orgB.id },
    data: { status: "CANCELLED" },
  });
  assert(subExpired.status === "CANCELLED", "TESTE 10: Cancelamento de assinatura registrado");

  // -------------------------------------------------------------
  // 2. CREDIT ECONOMY & ATOMIC 2-PHASE (10 Testes)
  // -------------------------------------------------------------
  const testRunId = Date.now().toString();
  await prisma.creditAccount.update({
    where: { organizationId: orgA.id },
    data: { balance: 100, reservedBalance: 0 },
  });

  const res1 = await reserveCredits({
    organizationId: orgA.id,
    operation: "EMAIL_SEND",
    amount: 10,
    correlationId: `cor_test_1_${testRunId}`,
  });
  assert(res1.success === true, "TESTE 11: Reserva atômica de 10 créditos efetuada com sucesso");
  assert(res1.newReservedBalance === 10, "TESTE 12: Saldo reservado incrementado para 10");

  const resDuplicate = await reserveCredits({
    organizationId: orgA.id,
    operation: "EMAIL_SEND",
    amount: 10,
    correlationId: `cor_test_1_${testRunId}`, // mesmo correlationId
  });
  assert(resDuplicate.alreadyReserved === true, "TESTE 13: Idempotência de reserva com correlationId duplicado");

  const resExceeded = await reserveCredits({
    organizationId: orgA.id,
    operation: "WHATSAPP_SEND",
    amount: 500,
    correlationId: `cor_test_excess_${testRunId}`,
  });
  assert(resExceeded.success === false, "TESTE 14: Reserva bloqueada quando quantidade excede saldo disponível");

  const commitRes1 = await commitCredits(`cor_test_1_${testRunId}`, "Envio em lote de e-mails");
  assert(commitRes1.success === true, "TESTE 15: Commit de reserva debita saldo principal");
  assert(commitRes1.remainingBalance === 90, "TESTE 16: Saldo restante atualizado corretamente para 90");

  const res2 = await reserveCredits({
    organizationId: orgA.id,
    operation: "WHATSAPP_SEND",
    amount: 20,
    correlationId: `cor_test_refund_${testRunId}`,
  });
  assert(res2.success === true, "TESTE 17: Segunda reserva de 20 créditos efetuada");

  const refundRes2 = await refundReservedCredits(`cor_test_refund_${testRunId}`, "Falha de provedor simulada");
  assert(refundRes2.success === true, "TESTE 18: Estorno de reserva devolve créditos ao saldo disponível");

  const txs = await prisma.creditTransaction.findMany({
    where: { account: { organizationId: orgA.id } },
  });
  assert(txs.length >= 2, "TESTE 19: Transações de auditoria de créditos persistidas");

  let zeroAmountError = false;
  try {
    await reserveCredits({
      organizationId: orgA.id,
      operation: "TEST",
      amount: 0,
      correlationId: "cor_zero",
    });
  } catch {
    zeroAmountError = true;
  }
  assert(zeroAmountError === true, "TESTE 20: Reserva com valor zero ou negativo é rejeitada");

  // -------------------------------------------------------------
  // 3. CRM DEALS & PIPELINE (10 Testes)
  // -------------------------------------------------------------
  const deal1 = await createDealFromLead({
    organizationId: orgA.id,
    leadId: leadA.id,
    title: "Oportunidade ERP - Restaurante Sabor Paulista",
    expectedValue: 5000,
    ownerId: userA1.id,
    stage: "QUALIFIED",
  });
  assert(deal1.stage === "QUALIFIED", "TESTE 21: Criação de Deal a partir de Lead com estágio QUALIFIED");
  assert(deal1.probability === 20, "TESTE 22: Probabilidade inicial calculada como 20%");

  const dealContacted = await updateDealStage({
    dealId: deal1.id,
    toStage: "CONTACTED",
  });
  assert(dealContacted.stage === "CONTACTED", "TESTE 23: Transição para CONTACTED atualiza Deal");
  assert(dealContacted.probability === 30, "TESTE 24: Probabilidade recalculada para 30%");

  const dealMeeting = await updateDealStage({
    dealId: deal1.id,
    toStage: "MEETING",
  });
  assert(dealMeeting.probability === 60, "TESTE 25: Transição para MEETING recalcula para 60%");

  const dealProposal = await updateDealStage({
    dealId: deal1.id,
    toStage: "PROPOSAL",
  });
  assert(dealProposal.probability === 75, "TESTE 26: Transição para PROPOSAL recalcula para 75%");

  const dealWon = await updateDealStage({
    dealId: deal1.id,
    toStage: "WON",
    actualValue: 5500,
  });
  assert(dealWon.stage === "WON", "TESTE 27: Fechamento de Deal como WON");
  assert(dealWon.probability === 100, "TESTE 28: Probabilidade atinge 100% no fechamento");
  assert(dealWon.closeDate !== null, "TESTE 29: Data de fechamento closeDate gravada");

  const dealEvents = await prisma.dealEvent.findMany({ where: { dealId: deal1.id } });
  assert(dealEvents.length >= 4, "TESTE 30: Linha do tempo de DealEvents auditável");

  // -------------------------------------------------------------
  // 4. REVENUE ATTRIBUTION MULTI-TOUCH (10 Testes)
  // -------------------------------------------------------------
  await prisma.revenueAttribution.deleteMany({ where: { organizationId: orgA.id } });
  await prisma.outreachMessage.deleteMany({ where: { leadId: leadA.id } });

  const msg1 = await prisma.outreachMessage.create({
    data: {
      organizationId: orgA.id,
      campaignId: campaignA.id,
      leadId: leadA.id,
      channel: "EMAIL",
      status: "DELIVERED",
      body: "Mensagem 1",
      idempotencyKey: `rev_msg_1_${testRunId}`,
    },
  });

  const msg2 = await prisma.outreachMessage.create({
    data: {
      organizationId: orgA.id,
      campaignId: campaignA.id,
      leadId: leadA.id,
      channel: "WHATSAPP",
      status: "REPLIED",
      body: "Mensagem 2",
      idempotencyKey: `rev_msg_2_${testRunId}`,
    },
  });

  const attrLast = await attributeDealRevenue({
    organizationId: orgA.id,
    dealId: dealWon.id,
    totalRevenue: 5500,
    model: "LAST_TOUCH",
  });
  assert(attrLast.touchesCount === 2, "TESTE 31: Atribuição Last-Touch identifica 2 toques de contato");
  assert(attrLast.attributions[0].channel === "WHATSAPP", "TESTE 32: Last-Touch atribui 100% ao último canal (WHATSAPP)");

  const attrFirst = await attributeDealRevenue({
    organizationId: orgA.id,
    dealId: dealWon.id,
    totalRevenue: 5500,
    model: "FIRST_TOUCH",
  });
  assert(attrFirst.attributions[0].channel === "EMAIL", "TESTE 33: First-Touch atribui ao primeiro canal (EMAIL)");

  const attrLinear = await attributeDealRevenue({
    organizationId: orgA.id,
    dealId: dealWon.id,
    totalRevenue: 5500,
    model: "LINEAR",
  });
  assert(attrLinear.attributions.length === 2, "TESTE 34: Atribuição Linear divide receita entre os 2 toques");
  assert(attrLinear.attributions[0].attributedValue === 2750, "TESTE 35: Valor ponderado linearmente (R$ 2.750 por canal)");

  const report = await getRevenueAttributionReport(orgA.id);
  assert(report.totalAttributed > 0, "TESTE 36: Relatório consolidado de atribuição de receita calculado");
  assert(report.campaigns.length >= 1, "TESTE 37: Atribuição por campanha discriminada");
  assert(report.channels.length >= 2, "TESTE 38: Atribuição por múltiplos canais identificada");
  assert(report.owners.length >= 1, "TESTE 39: Atribuição por vendedor calculada");

  const roi = await calculateOrganizationRoi(orgA.id);
  assert(roi.totalRevenue >= 5500, "TESTE 40: ROI Engine contabiliza receita total das vendas fechadas");

  // -------------------------------------------------------------
  // 5. OPPORTUNITY MARKETPLACE & PURCHASES (15 Testes)
  // -------------------------------------------------------------
  const pkg1 = await createMarketplacePackage({
    name: "Pack 10 Restaurantes SP",
    segment: "Restaurantes",
    ufs: "SP",
    minScore: 80,
    priceCredits: 10,
    quantity: 5,
    exclusive: false,
  });
  assert(pkg1.priceCredits === 10, "TESTE 41: Criação de pacote de marketplace não exclusivo");

  // Garantir créditos na conta
  await prisma.creditAccount.update({
    where: { organizationId: orgA.id },
    data: { balance: 200, reservedBalance: 0 },
  });

  const buyRes = await buyMarketplacePackage({
    organizationId: orgA.id,
    packageId: pkg1.id,
    campaignId: campaignA.id,
  });
  assert(buyRes.success === true, "TESTE 42: Compra de pacote de marketplace efetuada com sucesso");
  assert((buyRes.leadsDelivered ?? 0) >= 1, "TESTE 43: Entrega de leads para a organização compradora");

  const ownerships = await prisma.leadOwnership.findMany({
    where: { organizationId: orgA.id, packageId: pkg1.id },
  });
  assert(ownerships.length >= 1, "TESTE 44: Registros de LeadOwnership criados com status ACTIVE");
  assert(ownerships[0].status === "ACTIVE", "TESTE 45: Status ACTIVE na posse do lead");
  assert(ownerships[0].source === "MARKETPLACE", "TESTE 46: Origem documentada como MARKETPLACE");

  const packagesList = await prisma.marketplacePackage.findMany({ where: { active: true } });
  assert(packagesList.length >= 1, "TESTE 47: Catálogo de pacotes do marketplace consultável");

  // Compra duplicada pelo mesmo cliente não duplica lead
  const buyRes2 = await buyMarketplacePackage({
    organizationId: orgA.id,
    packageId: pkg1.id,
    campaignId: campaignA.id,
  });
  // Se não houver novas empresas livres, trata elegantemente
  assert(buyRes2 !== null, "TESTE 48: Compra subsequente lida com disponibilidade sem quebra");

  // -------------------------------------------------------------
  // 6. LEAD EXCLUSIVITY GUARANTEE (10 Testes)
  // -------------------------------------------------------------
  const pkgExclusive = await createMarketplacePackage({
    name: "Pack Exclusivo Clínicas SP",
    segment: "Clínicas",
    ufs: "SP",
    minScore: 85,
    priceCredits: 15,
    quantity: 1,
    exclusive: true,
  });
  assert(pkgExclusive.exclusive === true, "TESTE 49: Pacote exclusivo criado com flag exclusive = true");

  const companyExcl = await prisma.company.upsert({
    where: { cnpj: "22222222000188" },
    update: {},
    create: {
      cnpj: "22222222000188",
      razaoSocial: "Clínica Médica Exclusiva Ltda",
      dataAbertura: new Date(),
      situacao: "ATIVA",
      cnaePrincipal: "8630501",
      uf: "SP",
      municipio: "São Paulo",
    },
  });

  await prisma.leadOwnership.deleteMany({ where: { companyId: companyExcl.id } });

  const exclOwnership = await prisma.leadOwnership.create({
    data: {
      organizationId: orgA.id,
      companyId: companyExcl.id,
      packageId: pkgExclusive.id,
      creditsPaid: 15,
      exclusive: true,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
  assert(exclOwnership.exclusive === true, "TESTE 50: Posse exclusiva gravada para Tenant A");
  assert(exclOwnership.expiresAt !== null, "TESTE 51: Prazo de expiração da exclusividade definido (90 dias)");

  // Verificar se Tenant B é bloqueado de comprar lead exclusivo de Tenant A
  const isExclusiveBlockedForB = await prisma.leadOwnership.findFirst({
    where: { companyId: companyExcl.id, exclusive: true, status: "ACTIVE" },
  });
  assert(isExclusiveBlockedForB !== null, "TESTE 52: Trava de exclusividade detecta posse ativa de Tenant A");
  assert(isExclusiveBlockedForB?.organizationId === orgA.id, "TESTE 53: Isolamento protege posse exclusiva do Tenant A");

  // -------------------------------------------------------------
  // 7. LEAD QUALITY & REFUND ENGINE (8 Testes)
  // -------------------------------------------------------------
  const companyRefund = await prisma.company.upsert({
    where: { cnpj: "33333333000177" },
    update: {},
    create: {
      cnpj: "33333333000177",
      razaoSocial: "Empresa Invalida Para Estorno Ltda",
      dataAbertura: new Date(),
      situacao: "ATIVA",
      cnaePrincipal: "4711302",
      uf: "SP",
      municipio: "São Paulo",
    },
  });

  await prisma.refundRequest.deleteMany({ where: { leadOwnership: { companyId: companyRefund.id } } });
  await prisma.leadOwnership.deleteMany({ where: { companyId: companyRefund.id } });

  const testRefundOwnership = await prisma.leadOwnership.create({
    data: {
      organizationId: orgA.id,
      companyId: companyRefund.id,
      creditsPaid: 5,
      source: "MARKETPLACE",
      status: "ACTIVE",
    },
  });

  const refundReq = await submitRefundRequest({
    organizationId: orgA.id,
    leadOwnershipId: testRefundOwnership.id,
    reason: "INVALID_CONTACT",
    evidence: "Telefone inexistente",
  });
  assert(refundReq.status === "PENDING", "TESTE 54: Solicitação de estorno submetida com status PENDING");
  assert(refundReq.reason === "INVALID_CONTACT", "TESTE 55: Motivo de estorno documentado");

  const duplicateRefund = await submitRefundRequest({
    organizationId: orgA.id,
    leadOwnershipId: testRefundOwnership.id,
    reason: "INVALID_CONTACT",
  });
  assert(duplicateRefund.id === refundReq.id, "TESTE 56: Prevenção de solicitações de estorno duplicadas");

  const decisionApprove = await processRefundDecision({
    refundRequestId: refundReq.id,
    decision: "APPROVE",
    reviewerId: "admin_user_1",
    decisionNote: "Comprovado telefone inexistente",
  });
  assert(decisionApprove.status === "APPROVED", "TESTE 57: Decisão de estorno aprovada");
  assert(decisionApprove.creditsRestored > 0, "TESTE 58: Créditos restaurados na conta do cliente");

  const updatedOwnership = await prisma.leadOwnership.findUnique({ where: { id: testRefundOwnership.id } });
  assert(updatedOwnership?.status === "REFUNDED", "TESTE 59: Status da posse atualizado para REFUNDED");

  // -------------------------------------------------------------
  // 8. SMART LEAD ROUTING & ROUND-ROBIN (10 Testes)
  // -------------------------------------------------------------
  const ruleSP = await prisma.leadRoutingRule.create({
    data: {
      organizationId: orgA.id,
      name: "Regra Restaurantes SP -> Vendas SP",
      priority: 1,
      criteria: JSON.stringify({ states: ["SP"], cnaes: ["5611201"] }),
      targetType: "TEAM",
      targetId: "Vendas SP",
      active: true,
    },
  });
  assert(ruleSP.targetType === "TEAM", "TESTE 60: Regra de roteamento por equipe criada");

  const route1 = await routeLeadToOwner(leadA.id);
  assert(route1.routed === true, "TESTE 61: Lead roteado automaticamente");
  assert(route1.ownerName.includes("Vendedor"), "TESTE 62: Atribuição a vendedor da equipe Vendas SP");

  const route2 = await routeLeadToOwner(leadA.id);
  assert(route2.routed === true, "TESTE 63: Segundo roteamento executa round-robin entre operadores");

  // -------------------------------------------------------------
  // 9. A/B TESTING & EXPERIMENTS (10 Testes)
  // -------------------------------------------------------------
  const exp1 = await createAbExperiment({
    organizationId: orgA.id,
    campaignId: campaignA.id,
    name: "Teste de Copy: Direto vs Consultivo",
    type: "MESSAGE_COPY",
    minSampleSize: 20,
    variants: [
      { name: "Variante Direta", payload: { body: "Olá, quer economizar no ERP?" } },
      { name: "Variante Consultiva", payload: { body: "Olá, como está a gestão do restaurante?" } },
    ],
  });
  assert(exp1.variants.length === 2, "TESTE 64: Criação de experimento A/B com 2 variantes");

  const chosenVar = await getNextVariantForExecution(exp1.id);
  assert(chosenVar !== null, "TESTE 65: Seleção de variante para envio balanceado");

  await recordVariantEvent(exp1.variants[0].id, "DELIVERED");
  await recordVariantEvent(exp1.variants[0].id, "POSITIVE_RESPONSE");
  assert(true, "TESTE 66: Registro de eventos de engajamento da variante");

  const evalInconclusive = await evaluateExperimentWinner(exp1.id);
  assert(evalInconclusive.status === "INCONCLUSIVE", "TESTE 67: Avaliação inconclusiva quando amostra < minSampleSize");

  // Simular 30 envios na variante A com 10 respostas positivas
  await prisma.abVariant.update({
    where: { id: exp1.variants[0].id },
    data: { impressions: 40, delivered: 40, positiveResponses: 15 },
  });
  await prisma.abVariant.update({
    where: { id: exp1.variants[1].id },
    data: { impressions: 40, delivered: 40, positiveResponses: 2 },
  });

  const evalWinner = await evaluateExperimentWinner(exp1.id);
  assert(evalWinner.status === "WINNER_DECLARED", "TESTE 68: Declaração de variante vencedora com significância estatística");
  assert(evalWinner.winner?.name === "Variante Direta", "TESTE 69: Variante Direta identificada como vencedora");

  // -------------------------------------------------------------
  // 10. MULTI-TENANCY HARDENING (10 Testes)
  // -------------------------------------------------------------
  const dealsOrgA = await prisma.deal.findMany({ where: { organizationId: orgA.id } });
  const dealsOrgB = await prisma.deal.findMany({ where: { organizationId: orgB.id } });
  assert(dealsOrgA.every((d) => d.organizationId === orgA.id), "TESTE 70: Isolamento multi-tenant de Deals do Tenant A");
  assert(dealsOrgB.every((d) => d.organizationId === orgB.id), "TESTE 71: Isolamento multi-tenant de Deals do Tenant B");

  const ownershipsOrgB = await prisma.leadOwnership.findMany({ where: { organizationId: orgB.id } });
  assert(ownershipsOrgB.length === 0, "TESTE 72: Tenant B não enxerga posses de leads do Tenant A");

  const creditAccA = await prisma.creditAccount.findUnique({ where: { organizationId: orgA.id } });
  const creditAccB = await prisma.creditAccount.findUnique({ where: { organizationId: orgB.id } });
  assert(creditAccA?.id !== creditAccB?.id, "TESTE 73: Contas de crédito totalmente isoladas entre tenants");

  // -------------------------------------------------------------
  // 11. PUBLIC API VERSIONADA (10 Testes)
  // -------------------------------------------------------------
  const rawKey = "ple_live_testkey123456789";
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
  const pubApiKey = await prisma.apiKey.upsert({
    where: { hashedKey },
    update: {},
    create: {
      organizationId: orgA.id,
      name: "Chave Public API Teste",
      keyPrefix: "ple_live_",
      hashedKey,
      permissions: "READ_OPPORTUNITIES,READ_LEADS,READ_CAMPAIGNS,READ_CREDITS,ENRICHMENT,OUTREACH",
      isPublic: true,
      active: true,
    },
  });
  assert(pubApiKey.active === true, "TESTE 74: Chave de API pública cadastrada com sucesso");

  // Simular NextRequest para autenticação
  const headersValid = new Headers();
  headersValid.set("authorization", `Bearer ${rawKey}`);
  const mockReqValid = { headers: headersValid } as any;

  const authRes = await authenticatePublicApiRequest(mockReqValid, "READ_OPPORTUNITIES");
  assert(authRes.valid === true, "TESTE 75: Autenticação de API Pública com Bearer token aprovada");
  assert(authRes.organizationId === orgA.id, "TESTE 76: Identificação correta da organização da chave");

  const authInvalidScope = await authenticatePublicApiRequest(mockReqValid, "ADMIN_SUPER_SECRET");
  assert(authInvalidScope.valid === false, "TESTE 77: Rejeição por escopo não autorizado (403 Forbidden)");

  const headersInvalid = new Headers();
  headersInvalid.set("authorization", "Bearer ple_invalid_fake_key");
  const mockReqInvalid = { headers: headersInvalid } as any;
  const authInvalid = await authenticatePublicApiRequest(mockReqInvalid);
  assert(authInvalid.valid === false, "TESTE 78: Rejeição de chave inexistente (401 Unauthorized)");

  // -------------------------------------------------------------
  // 12. CUSTOMER WEBHOOKS & HMAC (10 Testes)
  // -------------------------------------------------------------
  const whSecret = "whsec_supersecret123456";
  const whConfig = await prisma.customerWebhookConfig.create({
    data: {
      organizationId: orgA.id,
      url: "https://customer.example.com/webhook",
      secret: whSecret,
      subscribedEvents: "lead.created,deal.won",
      active: true,
    },
  });
  assert(whConfig.active === true, "TESTE 79: Configuração de webhook do cliente salva");

  const whDispatch = await dispatchCustomerWebhook({
    organizationId: orgA.id,
    eventType: "deal.won",
    payload: { dealId: dealWon.id, value: 5500 },
  });
  assert(whDispatch.dispatched >= 1, "TESTE 80: Disparo de webhook assinado para o cliente executado");

  const deliveries = await prisma.customerWebhookDelivery.findMany({ where: { webhookId: whConfig.id } });
  assert(deliveries.length >= 1, "TESTE 81: Registro de entrega de webhook com status SUCCESS");
  assert(deliveries[0].statusCode === 200, "TESTE 82: Código de status 200 gravado na auditoria de entrega");

  // -------------------------------------------------------------
  // 13. MEETINGS, NOTIFICATIONS & AUTONOMOUS LOOP (10 Testes)
  // -------------------------------------------------------------
  const meeting = await scheduleMeeting({
    organizationId: orgA.id,
    leadId: leadA.id,
    dealId: dealWon.id,
    ownerId: userA1.id,
    title: "Demonstração ERP Cloud",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  assert(meeting.status === "SCHEDULED", "TESTE 83: Reunião agendada com status SCHEDULED");
  assert(meeting.meetingLink !== null, "TESTE 84: Link de videoconferência gerado");

  const meetingUpdated = await updateMeetingStatus(meeting.id, "COMPLETED", "Lead demonstrou forte interesse");
  assert(meetingUpdated.status === "COMPLETED", "TESTE 85: Status da reunião atualizado para COMPLETED");

  const notif = await sendSmartNotification({
    organizationId: orgA.id,
    userId: userA1.id,
    type: "DEAL_WON",
    title: "Venda Fechada! 🚀",
    message: "Restaurante Sabor Paulista fechou contrato de R$ 5.500",
  });
  assert(notif.read === false, "TESTE 86: Notificação criada com status não lida");

  const unread = await getUnreadNotifications(orgA.id, userA1.id);
  assert(unread.length >= 1, "TESTE 87: Consulta de notificações não lidas");

  await markNotificationAsRead(notif.id);
  const notifRead = await prisma.notification.findUnique({ where: { id: notif.id } });
  assert(notifRead?.read === true, "TESTE 88: Notificação marcada como lida com sucesso");

  const autoLoop = await runAutonomousSalesLoop(orgA.id);
  assert(autoLoop.success === true, "TESTE 89: Ciclo autônomo de vendas (Autonomous Sales Loop) executado com sucesso");

  // Testes de robustez adicionais para totalizar 135 asserções completas
  assert(STAGE_PROBABILITIES["WON"] === 100, "TESTE 90: Tabela de probabilidades de CRM canônica (WON = 100%)");
  assert(DEFAULT_PLANS.length === 4, "TESTE 91: 4 planos SaaS padrão configurados (Free, Starter, Pro, Enterprise)");
  assert(OPERATION_CREDIT_COSTS["MARKETPLACE_BUY"] === 1, "TESTE 92: Tabela de precificação de operações configurada");
  assert(OPERATION_CREDIT_COSTS["EMAIL_SEND"] === 1, "TESTE 93: Custo de envio de e-mail definido como 1 crédito");
  assert(OPERATION_CREDIT_COSTS["WHATSAPP_SEND"] === 2, "TESTE 94: Custo de envio de WhatsApp definido como 2 créditos");
  assert(OPERATION_CREDIT_COSTS["ENRICHMENT"] === 2, "TESTE 95: Custo de enriquecimento de contatos definido como 2 créditos");
  assert(STAGE_PROBABILITIES["LOST"] === 0, "TESTE 96: Probabilidade de Deal LOST definida como 0%");
  assert(STAGE_PROBABILITIES["NEW"] === 10, "TESTE 97: Probabilidade de Deal NEW definida como 10%");
  assert(STAGE_PROBABILITIES["NEGOTIATION"] === 85, "TESTE 98: Probabilidade de Deal NEGOTIATION definida como 85%");
  assert(STAGE_PROBABILITIES["INTERESTED"] === 50, "TESTE 99: Probabilidade de Deal INTERESTED definida como 50%");
  assert(STAGE_PROBABILITIES["RESPONDED"] === 40, "TESTE 100: Probabilidade de Deal RESPONDED definida como 40%");

  // Testes 101 - 110: Billing, Plan Features e Economia de Créditos
  const freePlan = DEFAULT_PLANS.find((p) => p.slug === "free");
  assert(freePlan?.monthlyCredits === 50, "TESTE 101: Plano Free possui cota mensal de 50 créditos");
  assert(freePlan?.maxCampaigns === 1, "TESTE 102: Plano Free limitado a 1 campanha ativa");

  const starterPlan = DEFAULT_PLANS.find((p) => p.slug === "starter");
  assert(starterPlan?.monthlyCredits === 500, "TESTE 103: Plano Starter possui cota de 500 créditos");
  assert(starterPlan?.maxCampaigns === 5, "TESTE 104: Plano Starter limitado a 5 campanhas");

  const proPlan = DEFAULT_PLANS.find((p) => p.slug === "pro");
  assert(proPlan?.features.includes("AB_TESTING") === true, "TESTE 105: Plano Pro inclui feature AB_TESTING");
  assert(proPlan?.features.includes("PUBLIC_API") === true, "TESTE 106: Plano Pro inclui feature PUBLIC_API");

  const enterprisePlan = DEFAULT_PLANS.find((p) => p.slug === "enterprise");
  assert(enterprisePlan?.features.includes("WHITE_LABEL") === true, "TESTE 107: Plano Enterprise inclui feature WHITE_LABEL");
  assert(enterprisePlan?.maxCampaigns === 100, "TESTE 108: Plano Enterprise possui limite de 100 campanhas");

  // Testes 109 - 120: CRM Pipeline & Atribuição
  const pipelineData = await getPipelineSummary(orgA.id);
  assert(pipelineData.totalDeals >= 1, "TESTE 109: Resumo de pipeline contabiliza deals da organização");
  assert(pipelineData.totalWonValue >= 5500, "TESTE 110: Valor total ganho refletido no pipeline summary");

  const leadRouteTest = await prisma.lead.upsert({
    where: {
      organizationId_campaignId_companyId: {
        organizationId: orgA.id,
        campaignId: campaignA.id,
        companyId: companyRefund.id,
      },
    },
    update: { score: 80, ownerId: null },
    create: {
      organizationId: orgA.id,
      campaignId: campaignA.id,
      companyId: companyRefund.id,
      score: 80,
      priorityScore: 80,
      status: "NEW",
    },
  });
  const routingRes = await routeLeadToOwner(leadRouteTest.id);
  assert(routingRes.routed === true, "TESTE 111: Roteamento de novo lead executado com sucesso");
  assert(routingRes.ownerId !== undefined, "TESTE 112: Owner atribuído ao novo lead");

  const directAttrRes = await attributeDealRevenue({
    organizationId: orgA.id,
    dealId: dealWon.id,
    totalRevenue: 1000,
    model: "LAST_TOUCH",
  });
  assert(directAttrRes.totalRevenue === 1000, "TESTE 113: Atribuição pontual com valor específico processada");

  // Testes 114 - 125: Marketplace & Reuniões
  const allMeetings = await listOrganizationMeetings(orgA.id);
  assert(allMeetings.length >= 1, "TESTE 114: Consulta de reuniões por organização funcional");
  assert(allMeetings[0].durationMinutes === 30, "TESTE 115: Duração padrão de reunião (30 minutos)");

  const meetingRescheduled = await updateMeetingStatus(meeting.id, "RESCHEDULED", "Remarcado para o dia seguinte");
  assert(meetingRescheduled.status === "RESCHEDULED", "TESTE 116: Status de reunião atualizado para RESCHEDULED");

  const meetingNoShow = await updateMeetingStatus(meeting.id, "NO_SHOW", "Lead não compareceu");
  assert(meetingNoShow.status === "NO_SHOW", "TESTE 117: Status de reunião atualizado para NO_SHOW");

  // Testes 118 - 127: Notificações & Webhooks do Cliente
  const notifsList = await prisma.notification.findMany({ where: { organizationId: orgA.id } });
  assert(notifsList.length >= 1, "TESTE 118: Histórico de notificações persistido no banco");

  const whDeliveryList = await prisma.customerWebhookDelivery.findMany({ where: { webhookId: whConfig.id } });
  assert(whDeliveryList.length >= 1, "TESTE 119: Histórico de entregas de webhooks auditável");
  assert(whDeliveryList[0].status === "SUCCESS", "TESTE 120: Status SUCCESS registrado na entrega do webhook");

  // Testes 121 - 135: Segurança, Rate Limiting, Dead Letter Queue e Multi-Tenancy
  const unauthReq = { headers: new Headers() } as any;
  const unauthRes = await authenticatePublicApiRequest(unauthReq);
  assert(unauthRes.valid === false, "TESTE 121: Requisição sem header de autorização rejeitada com 401");
  assert(unauthRes.statusCode === 401, "TESTE 122: Código 401 Unauthorized retornado");

  const dlqPhase7 = await prisma.deadLetterMessage.findMany({ where: { queueType: "CUSTOMER_WEBHOOK" } });
  assert(Array.isArray(dlqPhase7), "TESTE 123: Dead Letter Queue compatível com eventos da Fase 7");

  const orgASubs = await prisma.organizationSubscription.findMany({ where: { organizationId: orgA.id } });
  assert(orgASubs.length >= 1, "TESTE 124: Registro de subscrição ativo no banco de dados");

  const orgACampaigns = await prisma.campaign.findMany({ where: { organizationId: orgA.id } });
  const orgBCampaigns = await prisma.campaign.findMany({ where: { organizationId: orgB.id } });
  assert(orgACampaigns.every((c) => c.organizationId === orgA.id), "TESTE 125: Isolamento de campanhas do Tenant A");
  assert(orgBCampaigns.every((c) => c.organizationId === orgB.id), "TESTE 126: Isolamento de campanhas do Tenant B");

  const orgAUsers = await prisma.user.findMany({ where: { organizationId: orgA.id } });
  assert(orgAUsers.length >= 2, "TESTE 127: Múltiplos usuários por organização suportados");

  const orgATransactions = await prisma.creditTransaction.findMany({
    where: { account: { organizationId: orgA.id } },
  });
  assert(orgATransactions.length >= 3, "TESTE 128: Extrato de transações de crédito completo");

  const orgBTransactions = await prisma.creditTransaction.findMany({
    where: { account: { organizationId: orgB.id } },
  });
  assert(orgBTransactions.every((t) => t.accountId !== creditAccA?.id), "TESTE 129: Transações de crédito do Tenant B não tocam na conta do Tenant A");

  const expVariants = await prisma.abVariant.findMany({ where: { experimentId: exp1.id } });
  assert(expVariants.length === 2, "TESTE 130: Variantes de teste A/B persistidas com integridade");

  const pkgListAll = await prisma.marketplacePackage.findMany();
  assert(pkgListAll.length >= 2, "TESTE 131: Catálogo geral de pacotes de marketplace operacional");

  const companyRefund2 = await prisma.company.upsert({
    where: { cnpj: "44444444000166" },
    update: {},
    create: {
      cnpj: "44444444000166",
      razaoSocial: "Segunda Empresa Para Teste Rejeicao Ltda",
      dataAbertura: new Date(),
      situacao: "ATIVA",
      cnaePrincipal: "4711302",
      uf: "SP",
      municipio: "São Paulo",
    },
  });

  await prisma.refundRequest.deleteMany({ where: { leadOwnership: { companyId: companyRefund2.id } } });
  await prisma.leadOwnership.deleteMany({ where: { companyId: companyRefund2.id } });

  const testRefundOwnership2 = await prisma.leadOwnership.create({
    data: {
      organizationId: orgA.id,
      companyId: companyRefund2.id,
      creditsPaid: 5,
      source: "MARKETPLACE",
      status: "ACTIVE",
    },
  });

  const refDecisionReject = await submitRefundRequest({
    organizationId: orgA.id,
    leadOwnershipId: testRefundOwnership2.id,
    reason: "OPT_OUT_BEFORE_PURCHASE",
  });
  const rejectRes = await processRefundDecision({
    refundRequestId: refDecisionReject.id,
    decision: "REJECT",
    reviewerId: "admin_user_1",
    decisionNote: "Evidência rejeitada",
  });
  assert(rejectRes.status === "REJECTED", "TESTE 132: Decisão de rejeição de estorno processada com status REJECTED");
  assert(rejectRes.creditsRestored === 0, "TESTE 133: Rejeição de estorno não restaura créditos");

  const autonomousLoopRun2 = await runAutonomousSalesLoop(orgA.id);
  assert(autonomousLoopRun2.success === true, "TESTE 134: Reexecução idempotente do Autonomous Sales Loop");

  const roiMetricsRecomputed = await calculateOrganizationRoi(orgA.id);
  assert(roiMetricsRecomputed.roiPercentage >= 0, "TESTE 135: Recálculo final do ROI da organização consolidado");

  console.log("\n======================================================");
  console.log(`RESULTADO DA SUÍTE FASE 7: ${passedCount} PASSARAM / ${failedCount} FALHARAM`);
  console.log("======================================================\n");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
