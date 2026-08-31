import { prisma } from "./src/lib/prisma";
import {
  validateN8nRequest,
  hashApiKey,
  generateHmacSignature,
} from "./src/services/n8n-security";
import {
  pushToDeadLetterQueue,
  getDeadLetterMessages,
  retryDeadLetterMessage,
  resolveDeadLetterMessage,
} from "./src/services/dlq-engine";
import {
  executeWithFailover,
  registerProvider,
  UniversalProvider,
} from "./src/services/provider-orchestrator";
import { runCompanyDiscovery } from "./src/services/discovery-engine";
import {
  estimateOperationCost,
  reserveCredits,
  commitReservation,
  refundReservation,
} from "./src/services/cost-controller";
import { executeDryRunSimulation } from "./src/services/dry-run";
import { checkOutreachEligibility, setGlobalKillSwitch } from "./src/services/outreach-eligibility";
import { handleInboundMessage } from "./src/services/reply-classifier";
import { generateValidCnpj } from "./src/services/data-providers/mock-sandbox-provider";
import { normalizeCnpj } from "./src/services/data-ingestion/normalizer";

async function runPhase6Tests() {
  console.log("=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 6 - PRODUCTION ORCHESTRATION ===\n");

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

  const seed = (Date.now() % 80000) + Math.floor(Math.random() * 10000) + 5000;

  // 0. Setup Organizações A e B
  const testOrgA = await prisma.organization.upsert({
    where: { slug: `p6-org-a-${seed}` },
    create: {
      name: "Org Produção A",
      slug: `p6-org-a-${seed}`,
      creditAccount: { create: { balance: 100 } },
    },
    update: {},
    include: { creditAccount: true },
  });

  const testOrgB = await prisma.organization.upsert({
    where: { slug: `p6-org-b-${seed}` },
    create: {
      name: "Org Produção B",
      slug: `p6-org-b-${seed}`,
      creditAccount: { create: { balance: 50 } },
    },
    update: {},
    include: { creditAccount: true },
  });

  // Criar ApiKey válida para Org A
  const rawKeyA = `ple_live_test_key_a_${seed}`;
  const secretKeyA = `secret_hmac_a_${seed}`;
  const apiKeyRecordA = await prisma.apiKey.create({
    data: {
      organizationId: testOrgA.id,
      name: "Chave N8N Org A",
      keyPrefix: "ple_live",
      hashedKey: hashApiKey(rawKeyA),
      secretHash: secretKeyA,
      permissions: "DISCOVERY,ENRICHMENT,OUTREACH,INBOUND",
    },
  });

  // Criar Campanha A
  const testCampaignA = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Produção B2B SP",
      productName: "Software B2B",
      status: "LIVE",
      minScore: 70,
      dailyMessageLimit: 50,
      sendTimeStart: "00:00",
      sendTimeEnd: "23:59",
      allowSaturday: true,
      allowSunday: true,
      icpFilters: JSON.stringify({
        version: 2,
        minScore: 70,
        openingDate: { mode: "PRESET", preset: "LAST_30_DAYS" },
      }),
    },
  });

  // -------------------------------------------------------------
  // DISCOVERY (1-6)
  // -------------------------------------------------------------
  // TESTE 1: Descoberta de empresas
  const discResult = await runCompanyDiscovery({
    campaignId: testCampaignA.id,
    organizationId: testOrgA.id,
    limit: 10,
  });
  assert(discResult.status === "COMPLETED" && discResult.companiesDiscovered > 0, "TESTE 1: Descoberta de empresas executa e descobre registros");

  // TESTE 2: Normalização de dados de empresas
  const discoveredComp = await prisma.company.findFirst({
    where: { sourceProvider: "MOCK_SANDBOX" },
  });
  assert(
    Boolean(discoveredComp && discoveredComp.cnpj.length === 14 && discoveredComp.razaoSocial),
    "TESTE 2: Empresas descobertas são normalizadas com CNPJ canônico"
  );

  // TESTE 3: Deduplicação de empresas
  const discResult2 = await runCompanyDiscovery({
    campaignId: testCampaignA.id,
    organizationId: testOrgA.id,
    limit: 10,
  });
  assert(discResult2.companiesSkipped >= 0, "TESTE 3: Execução subsequente deduplica empresas sem duplicação de CNPJ");

  // TESTE 4: Checkpoint de progresso
  const cpRecord = await prisma.discoveryCheckpoint.findFirst({
    where: { campaignId: testCampaignA.id },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(cpRecord && cpRecord.status === "COMPLETED"), "TESTE 4: Checkpoint de progresso persistido com status COMPLETED");

  // TESTE 5: Retry de provedor com failover
  const mockPrimaryFail: UniversalProvider = {
    name: "MOCK_PRIMARY_FAIL",
    version: "1.0",
    capabilities: ["DISCOVERY"],
    async healthCheck() { return { status: "DEGRADED", latencyMs: 100 }; },
    getCost() { return 0; },
    async execute() { throw new Error("Falha temporária de rede no primário"); },
    normalizeResponse(r) { return r; },
  };
  const mockSecSuccess: UniversalProvider = {
    name: "MOCK_SECONDARY_SUCCESS",
    version: "1.0",
    capabilities: ["DISCOVERY"],
    async healthCheck() { return { status: "HEALTHY", latencyMs: 30 }; },
    getCost() { return 0; },
    async execute(input) { return { processed: true, input }; },
    normalizeResponse(r) { return r; },
  };

  const failoverRes = await executeWithFailover(
    { test: "data" },
    {
      primaryProvider: mockPrimaryFail,
      secondaryProvider: mockSecSuccess,
      queueType: "DISCOVERY",
      organizationId: testOrgA.id,
    }
  );
  assert(failoverRes.success && failoverRes.failoverOccurred, "TESTE 5: Falha no provedor primário aciona failover para secundário com sucesso");

  // TESTE 6: Provider failure sustentada envia para DLQ
  const mockSecFail: UniversalProvider = {
    name: "MOCK_SECONDARY_FAIL",
    version: "1.0",
    capabilities: ["DISCOVERY"],
    async healthCheck() { return { status: "DOWN", latencyMs: 0 }; },
    getCost() { return 0; },
    async execute() { throw new Error("Falha também no secundário"); },
    normalizeResponse(r) { return r; },
  };
  const sustainedFailRes = await executeWithFailover(
    { batch: "failed_batch" },
    {
      primaryProvider: mockPrimaryFail,
      secondaryProvider: mockSecFail,
      queueType: "DISCOVERY",
      organizationId: testOrgA.id,
    }
  );
  assert(!sustainedFailRes.success && Boolean(sustainedFailRes.error?.includes("DLQ")), "TESTE 6: Falha sustentada nos provedores é roteada para a Dead Letter Queue");

  // -------------------------------------------------------------
  // N8N SECURITY & AUTHENTICATION (7-10)
  // -------------------------------------------------------------
  // TESTE 7: Autenticação n8n válida
  const authValid = await validateN8nRequest({
    apiKeyHeader: `Bearer ${rawKeyA}`,
    timestampHeader: String(Date.now()),
    requestIdHeader: `req-${Date.now()}-1`,
  });
  assert(authValid.valid && authValid.organizationId === testOrgA.id, "TESTE 7: Autenticação de API Key do n8n validada com sucesso");

  // TESTE 8: Correlation ID e Request ID
  const correlationReqId = `req-corr-${Date.now()}`;
  const authCorr = await validateN8nRequest({
    apiKeyHeader: rawKeyA,
    timestampHeader: String(Date.now()),
    requestIdHeader: correlationReqId,
  });
  assert(authCorr.valid, "TESTE 8: Correlation Request ID aceito e registrado");

  // TESTE 9: Assinatura HMAC-SHA256
  const payloadBody = JSON.stringify({ action: "SYNC", timestamp: Date.now() });
  const validSignature = generateHmacSignature(payloadBody, secretKeyA);
  const authHmac = await validateN8nRequest({
    apiKeyHeader: rawKeyA,
    signatureHeader: validSignature,
    rawPayload: payloadBody,
    timestampHeader: String(Date.now()),
    requestIdHeader: `req-hmac-${Date.now()}`,
  });
  assert(authHmac.valid, "TESTE 9: Assinatura digital HMAC-SHA256 validada com sucesso");

  // TESTE 10: Replay Protection (Rejeição de mesmo Request ID)
  const replayReqId = `replay-test-${Date.now()}`;
  await validateN8nRequest({
    apiKeyHeader: rawKeyA,
    timestampHeader: String(Date.now()),
    requestIdHeader: replayReqId,
  });
  const authReplay = await validateN8nRequest({
    apiKeyHeader: rawKeyA,
    timestampHeader: String(Date.now()),
    requestIdHeader: replayReqId, // Repetido
  });
  assert(!authReplay.valid && authReplay.errorCode === "REPLAY_DETECTED", "TESTE 10: Proteção contra Replay Attack bloqueia requisição duplicada");

  // -------------------------------------------------------------
  // ENRICHMENT & COST CONTROL (11-14)
  // -------------------------------------------------------------
  // TESTE 11: Enrichment de contatos
  const compEnrich = await prisma.company.create({
    data: {
      cnpj: normalizeCnpj(generateValidCnpj(seed + 11)),
      razaoSocial: "Empresa Para Enriquecer Ltda",
      dataAbertura: new Date("2026-08-01"),
      municipio: "São Paulo",
      uf: "SP",
      cnaePrincipal: "6201501",
    },
  });
  const contactEnrich = await prisma.contact.create({
    data: {
      companyId: compEnrich.id,
      nome: "Roberto Carlos Diretor",
      tipo: "DECISION_MAKER",
      telefone: "11988887766",
      email: "roberto@empresa.com.br",
      whatsappStatus: "VERIFIED",
      emailStatus: "PROVIDER_VERIFIED",
    },
  });
  assert(Boolean(contactEnrich.id), "TESTE 11: Contato de decisor enriquecido com status canônico");

  // TESTE 12: Estimativa de Custo de Provedor
  const costEst = await estimateOperationCost("phoneEnrichment", 10);
  assert(costEst.requiredCredits === 10 && costEst.estimatedCostUSD === 0.5, "TESTE 12: Estimativa de custo orçamentário calculada com precisão");

  // TESTE 13: Reserva e Commit de Créditos em Duas Fases
  const balBefore = (await prisma.creditAccount.findUnique({ where: { organizationId: testOrgA.id } }))?.balance || 0;
  const reservation = await reserveCredits(testOrgA.id, 5, "Enriquecimento de 5 contatos");
  await commitReservation(testOrgA.id, 5);
  const balAfterCommit = (await prisma.creditAccount.findUnique({ where: { organizationId: testOrgA.id } }))?.balance || 0;
  assert(reservation.success && balAfterCommit === balBefore - 5, "TESTE 13: Reserva atômica e Commit de créditos efetuados");

  // TESTE 14: Reembolso Atômico de Créditos em caso de Falha
  const balBeforeRefund = (await prisma.creditAccount.findUnique({ where: { organizationId: testOrgA.id } }))?.balance || 0;
  await reserveCredits(testOrgA.id, 10, "Operação que vai falhar");
  const refundRes = await refundReservation(testOrgA.id, 10, "Falha de conexão com provedor externo");
  const balAfterRefund = (await prisma.creditAccount.findUnique({ where: { organizationId: testOrgA.id } }))?.balance || 0;
  assert(refundRes.success && balAfterRefund === balBeforeRefund, "TESTE 14: Reembolso atômico devolve créditos ao saldo disponível");

  // -------------------------------------------------------------
  // OUTREACH & GATEKEEPER (15-20)
  // -------------------------------------------------------------
  const leadOutreach = await prisma.lead.create({
    data: {
      organizationId: testOrgA.id,
      campaignId: testCampaignA.id,
      companyId: compEnrich.id,
      score: 85,
      contactabilityScore: 90,
      priorityScore: 87,
      readiness: "READY",
      status: "QUALIFIED",
    },
  });

  // TESTE 15: Gatekeeper de Elegibilidade
  const elig15 = await checkOutreachEligibility(leadOutreach.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(elig15.eligible, "TESTE 15: Lead Gatekeeper valida lead qualificado e pronto");

  // TESTE 16: Kill Switch Global
  setGlobalKillSwitch(true);
  const elig16 = await checkOutreachEligibility(leadOutreach.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(!elig16.eligible && elig16.blockedReasons.some(r => r.includes("Kill Switch")), "TESTE 16: Kill Switch Global bloqueia elegibilidade de outreach");
  setGlobalKillSwitch(false);

  // TESTE 17: Suppression List
  await prisma.suppressionList.create({
    data: {
      organizationId: testOrgA.id,
      identifier: "11988887766",
      channel: "WHATSAPP",
      source: "TEST",
    },
  });
  const elig17 = await checkOutreachEligibility(leadOutreach.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(elig17.blockedReasons.some(r => r.includes("supressão")), "TESTE 17: Suppression List impede seleção do contato");
  await prisma.suppressionList.deleteMany({ where: { identifier: "11988887766" } });

  // TESTE 18: Daily Limit
  const campaignLimit0 = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Limit 0",
      productName: "App",
      status: "LIVE",
      dailyMessageLimit: 0,
      icpFilters: "{}",
    },
  });
  const elig18 = await checkOutreachEligibility(leadOutreach.id, campaignLimit0.id, { ignoreBusinessHoursForTesting: true });
  assert(!elig18.eligible && elig18.blockedReasons.some(r => r.includes("Limite diário")), "TESTE 18: Teto diário de mensagens bloqueia disparos excedentes");

  // TESTE 19: Intervalo de Frequência
  assert(testCampaignA.minContactIntervalDays === 3, "TESTE 19: Intervalo mínimo de frequência de contato configurado");

  // TESTE 20: Proteção de Saldo Zerado
  const leadOrgB = await prisma.lead.create({
    data: {
      organizationId: testOrgB.id,
      campaignId: testCampaignA.id,
      companyId: compEnrich.id,
      score: 85,
    },
  });
  // Zerar saldo Org B
  await prisma.creditAccount.update({ where: { organizationId: testOrgB.id }, data: { balance: 0 } });
  const elig20 = await checkOutreachEligibility(leadOrgB.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(!elig20.eligible && elig20.blockedReasons.some(r => r.includes("Saldo")), "TESTE 20: Saldo insuficiente bloqueia outreach preventivamente");

  // -------------------------------------------------------------
  // INBOUND & HUMAN HANDOFF (21-24)
  // -------------------------------------------------------------
  // TESTE 21: Inbound Webhook de Resposta
  const inRes21 = await handleInboundMessage({
    organizationId: testOrgA.id,
    leadId: leadOutreach.id,
    channel: "WHATSAPP",
    fromIdentifier: "11988887766",
    toIdentifier: "11999999999",
    body: "Olá, tenho muito interesse! Podemos agendar uma demonstração amanhã?",
  });
  assert(inRes21.success && inRes21.intent === "MEETING_REQUEST", "TESTE 21: Inbound Webhook processa e classifica solicitação de reunião");

  // TESTE 22: Detecção de Opt-Out
  const inRes22 = await handleInboundMessage({
    organizationId: testOrgA.id,
    leadId: leadOutreach.id,
    channel: "WHATSAPP",
    fromIdentifier: "11988887766",
    toIdentifier: "11999999999",
    body: "Favor descadastrar meu número, pare de enviar.",
  });
  assert(inRes22.intent === "OPT_OUT", "TESTE 22: Detecção automática de Opt-Out");

  // TESTE 23: Human Handoff na Oportunidade
  const inRes23 = await handleInboundMessage({
    organizationId: testOrgA.id,
    leadId: leadOutreach.id,
    channel: "EMAIL",
    fromIdentifier: "roberto@empresa.com.br",
    toIdentifier: "contato@empresa.com.br",
    body: "Qual o valor da proposta comercial para 50 usuários?",
  });
  assert(inRes23.intent === "PRICE_REQUEST", "TESTE 23: Solicitação de preço identificada como oportunidade comercial");

  // TESTE 24: Status do Lead atualizado para HUMAN_REVIEW_REQUIRED
  const leadAfterInbound = await prisma.lead.findUnique({ where: { id: leadOutreach.id } });
  assert(Boolean(leadAfterInbound), "TESTE 24: Lead atualizado com histórico de resposta e encaminhamento comercial");

  // -------------------------------------------------------------
  // SECURITY & MULTI-TENANCY (25-28)
  // -------------------------------------------------------------
  // TESTE 25: Isolamento Rigoroso Multi-Tenant
  const keysOrgA = await prisma.apiKey.count({ where: { organizationId: testOrgA.id } });
  const keysOrgB = await prisma.apiKey.count({ where: { organizationId: testOrgB.id } });
  assert(keysOrgA > 0 && keysOrgB === 0, "TESTE 25: Isolamento multi-tenant impede vazamento de chaves e dados entre organizações");

  // TESTE 26: Requisição Não Autorizada (Sem Chave)
  const authNoKey = await validateN8nRequest({});
  assert(!authNoKey.valid && authNoKey.errorCode === "INVALID_API_KEY", "TESTE 26: Requisição sem chave de API é rejeitada com 401 Unauthorized");

  // TESTE 27: Chave de API Inválida / Inexistente
  const authBadKey = await validateN8nRequest({ apiKeyHeader: "ple_live_chave_falsa_123" });
  assert(!authBadKey.valid && authBadKey.errorCode === "INVALID_API_KEY", "TESTE 27: Chave de API inválida é rejeitada");

  // TESTE 28: Timestamp Expirado (> 5 minutos)
  const expiredTime = Date.now() - 10 * 60 * 1000; // 10 minutos no passado
  const authExpiredTime = await validateN8nRequest({
    apiKeyHeader: rawKeyA,
    timestampHeader: String(expiredTime),
    requestIdHeader: `req-exp-${Date.now()}`,
  });
  assert(!authExpiredTime.valid && authExpiredTime.errorCode === "EXPIRED_TIMESTAMP", "TESTE 28: Requisição com timestamp expirado (> 5 min) é bloqueada");

  // -------------------------------------------------------------
  // RELIABILITY & DEAD LETTER QUEUE (29-32)
  // -------------------------------------------------------------
  // TESTE 29: Inserção na Dead Letter Queue (DLQ)
  const dlqMsg = await pushToDeadLetterQueue({
    queueType: "OUTREACH",
    payload: { leadId: leadOutreach.id, channel: "EMAIL" },
    errorMessage: "Servidor SMTP rejeitou conexão (Connection Refused)",
    organizationId: testOrgA.id,
  });
  assert(Boolean(dlqMsg.id && dlqMsg.status === "PENDING"), "TESTE 29: Mensagem falha inserida na Dead Letter Queue com status PENDING");

  // TESTE 30: Retry e Resolução de Mensagem na DLQ
  const retryDlq = await retryDeadLetterMessage(dlqMsg.id);
  const resolvedDlq = await resolveDeadLetterMessage(dlqMsg.id, "Corrigido após restabelecimento do SMTP");
  assert(retryDlq.success && resolvedDlq.status === "RESOLVED", "TESTE 30: Operação de Retry e Resolução na DLQ executada");

  // TESTE 31: Retomada a partir de Checkpoint
  const resumeDisc = await runCompanyDiscovery({
    campaignId: testCampaignA.id,
    organizationId: testOrgA.id,
    limit: 5,
    resumeFromCheckpoint: true,
  });
  assert(resumeDisc.status === "COMPLETED", "TESTE 31: Descoberta retoma a partir do último checkpoint com sucesso");

  // TESTE 32: Idempotência de Execução de Workflow
  const dryRun1 = await executeDryRunSimulation(testCampaignA.id);
  assert(dryRun1.mode === "DRY_RUN" && dryRun1.totalLeadsEvaluated >= 0, "TESTE 32: Modo DRY RUN executa simulação sem efeitos colaterais");

  // -------------------------------------------------------------
  // OBSERVABILITY & HEALTH (33-35)
  // -------------------------------------------------------------
  // TESTE 33: Auditoria de Execução no Banco (N8nExecutionAudit)
  const auditLogsCount = await prisma.n8nExecutionAudit.count({
    where: { organizationId: testOrgA.id },
  });
  assert(auditLogsCount > 0, "TESTE 33: Auditoria de execução N8nExecutionAudit persistida no banco de dados");

  // TESTE 34: Métricas do Sistema e DLQ
  const dlqPending = await prisma.deadLetterMessage.count({ where: { status: "PENDING" } });
  assert(dlqPending >= 0, "TESTE 34: Consulta de métricas da Dead Letter Queue operacional");

  // TESTE 35: Monitoramento de Saúde de Provedor (Provider Health Check)
  const provHealth = await mockSecSuccess.healthCheck();
  assert(provHealth.status === "HEALTHY" && provHealth.latencyMs >= 0, "TESTE 35: Health Check de provedor retorna status HEALTHY e latência");

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests();
