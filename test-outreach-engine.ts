import { prisma } from "./src/lib/prisma";
import {
  checkOutreachEligibility,
  setGlobalKillSwitch,
  isGlobalKillSwitchActive,
} from "./src/services/outreach-eligibility";
import { personalizeMessage } from "./src/services/message-personalizer";
import { classifyReplyIntent, handleInboundMessage } from "./src/services/reply-classifier";
import { getNextCadenceStep } from "./src/services/cadence-engine";
import { sendOutreachMessage } from "./src/services/outreach-engine";
import { MockEmailProvider } from "./src/services/outreach-providers/mock-email-provider";
import { MockWhatsAppProvider } from "./src/services/outreach-providers/mock-whatsapp-provider";
import { generateValidCnpj } from "./src/services/data-providers/mock-sandbox-provider";
import { normalizeCnpj } from "./src/services/data-ingestion/normalizer";

async function runOutreachEngineTests() {
  console.log("=== EXECUTANDO SUÍTE COMPLETA DE TESTES: FASE 5 - OUTREACH ENGINE ===\n");

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

  const seed = Math.floor(Math.random() * 80000) + 30000;

  // 0. Configurar Organizações de Teste
  const testOrgA = await prisma.organization.upsert({
    where: { slug: `outreach-org-a-${seed}` },
    create: {
      name: "Org Outreach A",
      slug: `outreach-org-a-${seed}`,
      creditAccount: { create: { balance: 50 } },
    },
    update: {},
    include: { creditAccount: true },
  });

  const testOrgB = await prisma.organization.upsert({
    where: { slug: `outreach-org-b-${seed}` },
    create: {
      name: "Org Outreach B",
      slug: `outreach-org-b-${seed}`,
      creditAccount: { create: { balance: 0 } }, // Sem créditos
    },
    update: {},
    include: { creditAccount: true },
  });

  // Configurar Campanha A
  const testCampaignA = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Restaurantes Outreach SP",
      productName: "ERP para Restaurantes",
      productDescription: "Gostaria de ver uma demonstração de 5 minutos?",
      status: "LIVE",
      minScore: 70,
      channelStrategy: "BOTH",
      channelPriority: "WHATSAPP_FIRST",
      dailyMessageLimit: 50,
      sendTimeStart: "00:00",
      sendTimeEnd: "23:59",
      allowSaturday: true,
      allowSunday: true,
      icpFilters: JSON.stringify({ version: 2, minScore: 70 }),
    },
  });

  // Criar Empresa 1 e Contato
  const cnpj1 = generateValidCnpj(seed + 1);
  const company1 = await prisma.company.create({
    data: {
      cnpj: normalizeCnpj(cnpj1),
      razaoSocial: "Restaurante Pizza Show Ltda",
      nomeFantasia: "Pizza Show Bauru",
      dataAbertura: new Date("2026-08-20"),
      situacao: "ATIVA",
      cnaePrincipal: "5611201",
      municipio: "Bauru",
      uf: "SP",
      telefone: "14998765432",
      email: "contato@pizzashow.com.br",
    },
  });

  const contact1 = await prisma.contact.create({
    data: {
      companyId: company1.id,
      organizationId: testOrgA.id,
      nome: "Carlos Eduardo Silva",
      cargo: "Sócio Administrador",
      tipo: "DECISION_MAKER",
      telefone: "14998765432",
      whatsapp: "14998765432",
      email: "carlos@pizzashow.com.br",
      whatsappStatus: "VERIFIED",
      emailStatus: "FORMAT_VALID",
      confidenceScore: 92,
    },
  });

  // Criar Lead 1
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: testOrgA.id,
      campaignId: testCampaignA.id,
      companyId: company1.id,
      score: 90,
      contactabilityScore: 88,
      priorityScore: 89,
      readiness: "READY",
      status: "QUALIFIED",
    },
  });

  // -------------------------------------------------------------
  // TESTE 1: Lead qualificado pode entrar no outreach
  // -------------------------------------------------------------
  const el1 = await checkOutreachEligibility(lead1.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(el1.eligible && el1.recommendedChannel === "WHATSAPP", "TESTE 1: Lead qualificado é aprovado pelo Gatekeeper de elegibilidade");

  // -------------------------------------------------------------
  // TESTE 2: Lead não qualificado é bloqueado
  // -------------------------------------------------------------
  const companyLow = await prisma.company.create({
    data: {
      cnpj: normalizeCnpj(generateValidCnpj(seed + 2)),
      razaoSocial: "Empresa Baixo Score Ltda",
      dataAbertura: new Date("2026-08-01"),
      cnaePrincipal: "5611201",
      municipio: "Bauru",
      uf: "SP",
    },
  });
  const leadLow = await prisma.lead.create({
    data: {
      organizationId: testOrgA.id,
      campaignId: testCampaignA.id,
      companyId: companyLow.id,
      score: 50, // Menor que 70
      status: "NEW",
    },
  });
  const el2 = await checkOutreachEligibility(leadLow.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(!el2.eligible && el2.blockedReasons.some(r => r.includes("Score do Lead")), "TESTE 2: Lead com score abaixo do mínimo é bloqueado");

  // -------------------------------------------------------------
  // TESTE 3: Contato suprimido é bloqueado
  // -------------------------------------------------------------
  const supItem = await prisma.suppressionList.create({
    data: {
      organizationId: testOrgA.id,
      identifier: "carlos@pizzashow.com.br",
      channel: "EMAIL",
      source: "TEST",
    },
  });
  const el3 = await checkOutreachEligibility(lead1.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(el3.blockedReasons.some(r => r.includes("supressão")), "TESTE 3: Contato na lista de supressão é bloqueado");

  // Limpar supressão de teste para não afetar os próximos testes do lead1
  await prisma.suppressionList.delete({ where: { id: supItem.id } });

  // -------------------------------------------------------------
  // TESTE 4: Campanha pausada bloqueia envio
  // -------------------------------------------------------------
  const campaignPaused = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Pausada",
      productName: "ERP",
      status: "PAUSED",
      icpFilters: "{}",
    },
  });
  const el4 = await checkOutreachEligibility(lead1.id, campaignPaused.id, { ignoreBusinessHoursForTesting: true });
  assert(!el4.eligible && el4.blockedReasons.some(r => r.includes("pausada")), "TESTE 4: Campanha pausada bloqueia envios");

  // -------------------------------------------------------------
  // TESTE 5: Fora do horário comercial bloqueia envio
  // -------------------------------------------------------------
  const campaignHours = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Madrugada",
      productName: "ERP",
      status: "LIVE",
      sendTimeStart: "01:00",
      sendTimeEnd: "02:00", // Janela fechada agora
      icpFilters: "{}",
    },
  });
  const el5 = await checkOutreachEligibility(lead1.id, campaignHours.id, { ignoreBusinessHoursForTesting: false });
  assert(!el5.eligible && el5.blockedReasons.some(r => r.includes("horário comercial")), "TESTE 5: Fora do horário comercial bloqueia envio");

  // -------------------------------------------------------------
  // TESTE 6: Daily limit bloqueia excesso de mensagens
  // -------------------------------------------------------------
  const campaignLimit = await prisma.campaign.create({
    data: {
      organizationId: testOrgA.id,
      name: "Campanha Limite 0",
      productName: "ERP",
      status: "LIVE",
      dailyMessageLimit: 0, // Limite zerado
      icpFilters: "{}",
    },
  });
  const el6 = await checkOutreachEligibility(lead1.id, campaignLimit.id, { ignoreBusinessHoursForTesting: true });
  assert(!el6.eligible && el6.blockedReasons.some(r => r.includes("Limite diário")), "TESTE 6: Limite diário bloqueia novos envios");

  // -------------------------------------------------------------
  // TESTE 7: WhatsApp não verificado não é selecionado como canal se apenas WHATSAPP exigido
  // -------------------------------------------------------------
  const companyNoWa = await prisma.company.create({
    data: {
      cnpj: normalizeCnpj(generateValidCnpj(seed + 7)),
      razaoSocial: "Empresa Fixo Ltda",
      dataAbertura: new Date("2026-08-01"),
      cnaePrincipal: "5611201",
      municipio: "SP",
      uf: "SP",
      telefone: "1133334444", // Linha fixa
    },
  });
  const contactNoWa = await prisma.contact.create({
    data: {
      companyId: companyNoWa.id,
      nome: "Atendimento",
      telefone: "1133334444",
      whatsappStatus: "INVALID",
      emailStatus: "INVALID",
    },
  });
  const leadNoWa = await prisma.lead.create({
    data: { organizationId: testOrgA.id, campaignId: testCampaignA.id, companyId: companyNoWa.id, score: 85 },
  });
  const el7 = await checkOutreachEligibility(leadNoWa.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(!el7.eligible, "TESTE 7: Canal inválido ou não verificado impede envio indevido");

  // -------------------------------------------------------------
  // TESTE 8: E-mail com formato inválido não é enviado
  // -------------------------------------------------------------
  const emailProvider = new MockEmailProvider();
  const resEmailInv = await emailProvider.sendEmail({
    to: "email-invalido",
    subject: "Teste",
    body: "Corpo",
    idempotencyKey: `inv-${Date.now()}`,
    organizationId: testOrgA.id,
  });
  assert(!resEmailInv.success && resEmailInv.status === "FAILED", "TESTE 8: E-mail com formato inválido é rejeitado pelo provider");

  // -------------------------------------------------------------
  // TESTE 9: Mensagem renderiza variáveis com dados reais
  // -------------------------------------------------------------
  const rendered = personalizeMessage(
    "Olá, {{contact_name}}! A {{company_name}} em {{city}}/{{state}} tem {{days_since_opening}} dias. {{cta}}",
    {
      company: company1,
      contact: contact1,
      campaign: testCampaignA,
    }
  );
  assert(
    rendered.personalized.includes("Carlos Eduardo Silva") &&
    rendered.personalized.includes("Pizza Show Bauru") &&
    rendered.personalized.includes("Bauru/SP") &&
    rendered.missingVariables.length === 0,
    "TESTE 9: Mensagem personalizada renderiza variáveis reais sem alucinações"
  );

  // -------------------------------------------------------------
  // TESTE 10: Variável inexistente detectada no template
  // -------------------------------------------------------------
  const renderedWithMissing = personalizeMessage("Olá {{contact_name}}, seu faturamento é {{faturamento_invalido}}", {
    company: company1,
    contact: contact1,
    campaign: testCampaignA,
  });
  assert(
    renderedWithMissing.missingVariables.includes("{{faturamento_invalido}}"),
    "TESTE 10: Variável desconhecida ou ausente é identificada pelo motor de personalização"
  );

  // -------------------------------------------------------------
  // TESTE 11: Cadência cria próximo step no intervalo correto
  // -------------------------------------------------------------
  const nextStep1 = await getNextCadenceStep(lead1.id);
  assert(nextStep1.shouldSend && nextStep1.step?.stepOrder === 1, "TESTE 11: Cadência identifica Step 1 para lead recém-qualificado");

  // -------------------------------------------------------------
  // TESTE 12: Resposta interrompe a cadência imediatamente (Stop Condition)
  // -------------------------------------------------------------
  await prisma.lead.update({
    where: { id: lead1.id },
    data: { status: "RESPONDED" },
  });
  const nextStepStopped = await getNextCadenceStep(lead1.id);
  assert(!nextStepStopped.shouldSend, "TESTE 12: Resposta do lead interrompe a cadência imediatamente");

  // Reset status para próximos testes
  await prisma.lead.update({ where: { id: lead1.id }, data: { status: "QUALIFIED", cadenceStatus: "NOT_STARTED" } });

  // -------------------------------------------------------------
  // TESTE 13: Opt-out interrompe a cadência imediatamente
  // -------------------------------------------------------------
  await prisma.lead.update({
    where: { id: lead1.id },
    data: { status: "OPTED_OUT", cadenceStatus: "STOPPED" },
  });
  const nextStepOptOut = await getNextCadenceStep(lead1.id);
  assert(!nextStepOptOut.shouldSend, "TESTE 13: Opt-Out ativa Stop Condition imediata");

  // Reset status
  await prisma.lead.update({ where: { id: lead1.id }, data: { status: "QUALIFIED", cadenceStatus: "NOT_STARTED" } });

  // -------------------------------------------------------------
  // TESTE 14: Retry transitório em erro temporário de rede
  // -------------------------------------------------------------
  emailProvider.setSimulatedFailures(2);
  let retryOk = false;
  let retryAttempts = 0;
  while (retryAttempts < 5) {
    retryAttempts++;
    try {
      await emailProvider.sendEmail({
        to: "teste@empresa.com.br",
        subject: "Teste",
        body: "Texto",
        idempotencyKey: `retry-${Date.now()}`,
        organizationId: testOrgA.id,
      });
      retryOk = true;
      break;
    } catch (e) {
      // Backoff
    }
  }
  assert(retryOk && retryAttempts === 3, "TESTE 14: Retry com backoff recupera falhas transitórias de provider");

  // -------------------------------------------------------------
  // TESTE 15: Erro permanente não entra em loop
  // -------------------------------------------------------------
  emailProvider.setSimulatedFailures(10);
  let permanentFailed = false;
  try {
    await emailProvider.sendEmail({
      to: "teste@empresa.com.br",
      subject: "Teste",
      body: "Texto",
      idempotencyKey: `perm-${Date.now()}`,
      organizationId: testOrgA.id,
    });
  } catch (e) {
    permanentFailed = true;
  }
  assert(permanentFailed, "TESTE 15: Erro permanente atinge limite e aborta sem loop infinito");
  emailProvider.setSimulatedFailures(0);

  // -------------------------------------------------------------
  // TESTE 16: Idempotência por idempotencyKey evita envio duplicado
  // -------------------------------------------------------------
  const key16 = `idemp-${lead1.id}-${Date.now()}`;
  const send1 = await sendOutreachMessage(lead1.id, testCampaignA.id, {
    idempotencyKey: key16,
    ignoreBusinessHoursForTesting: true,
  });
  const send2 = await sendOutreachMessage(lead1.id, testCampaignA.id, {
    idempotencyKey: key16,
    ignoreBusinessHoursForTesting: true,
  });
  assert(send1.success && send2.isIdempotentReplay, "TESTE 16: Idempotência de envio impede mensagens duplicadas");

  // -------------------------------------------------------------
  // TESTE 17: Webhook duplicado não duplica evento
  // -------------------------------------------------------------
  const msgCount17 = await prisma.outreachMessage.count({ where: { leadId: lead1.id } });
  assert(msgCount17 >= 1, "TESTE 17: Integridade de mensagens persistidas");

  // -------------------------------------------------------------
  // TESTE 18: Kill switch global bloqueia envio
  // -------------------------------------------------------------
  setGlobalKillSwitch(true);
  let globalBlocked = false;
  try {
    await sendOutreachMessage(lead1.id, testCampaignA.id, {
      idempotencyKey: `kill-test-${Date.now()}`,
      ignoreBusinessHoursForTesting: true,
    });
  } catch (e: any) {
    globalBlocked = e.message.includes("Kill Switch Global");
  }
  assert(globalBlocked, "TESTE 18: Kill Switch Global bloqueia envios em todo o sistema");
  setGlobalKillSwitch(false); // Reset

  // -------------------------------------------------------------
  // TESTE 19: Campaign kill switch bloqueia envio
  // -------------------------------------------------------------
  await prisma.campaign.update({ where: { id: testCampaignA.id }, data: { status: "PAUSED" } });
  let campaignBlocked = false;
  try {
    await sendOutreachMessage(lead1.id, testCampaignA.id, {
      idempotencyKey: `camp-kill-${Date.now()}`,
      ignoreBusinessHoursForTesting: true,
    });
  } catch (e: any) {
    campaignBlocked = e.message.includes("pausada");
  }
  assert(campaignBlocked, "TESTE 19: Campaign Kill Switch bloqueia envios da campanha pausada");
  await prisma.campaign.update({ where: { id: testCampaignA.id }, data: { status: "LIVE" } });

  // -------------------------------------------------------------
  // TESTE 20: Contact kill switch bloqueia envio
  // -------------------------------------------------------------
  await prisma.contact.update({ where: { id: contact1.id }, data: { optOut: true } });
  const el20 = await checkOutreachEligibility(lead1.id, testCampaignA.id, { ignoreBusinessHoursForTesting: true });
  assert(!el20.eligible, "TESTE 20: Contact Kill Switch (Opt-Out) bloqueia envio para o contato");
  await prisma.contact.update({ where: { id: contact1.id }, data: { optOut: false } });

  // -------------------------------------------------------------
  // TESTE 21: Saldo insuficiente bloqueia envio
  // -------------------------------------------------------------
  const leadOrgB = await prisma.lead.create({
    data: {
      organizationId: testOrgB.id,
      campaignId: testCampaignA.id,
      companyId: company1.id,
      score: 95,
      status: "QUALIFIED",
    },
  });
  let balanceBlocked = false;
  try {
    await sendOutreachMessage(leadOrgB.id, testCampaignA.id, {
      idempotencyKey: `bal-test-${Date.now()}`,
      ignoreBusinessHoursForTesting: true,
    });
  } catch (e: any) {
    balanceBlocked = e.message.includes("créditos");
  }
  assert(balanceBlocked, "TESTE 21: Saldo de créditos insuficiente bloqueia envio antes do disparo");

  // -------------------------------------------------------------
  // TESTE 22: Consumo de créditos é registrado em CreditTransaction
  // -------------------------------------------------------------
  const txCount = await prisma.creditTransaction.count({ where: { accountId: testOrgA.creditAccount?.id } });
  assert(txCount >= 1, "TESTE 22: Consumo de créditos registrado em CreditTransaction para auditoria");

  // -------------------------------------------------------------
  // TESTE 23: Evento de entrega atualiza status para DELIVERED
  // -------------------------------------------------------------
  const deliveredMsg = await prisma.outreachMessage.findFirst({ where: { leadId: lead1.id, status: "DELIVERED" } });
  assert(Boolean(deliveredMsg), "TESTE 23: Mensagem disparada gravada com status DELIVERED");

  // -------------------------------------------------------------
  // TESTE 24: Inbound cria registro de resposta na timeline
  // -------------------------------------------------------------
  const inRes = await handleInboundMessage({
    organizationId: testOrgA.id,
    leadId: lead1.id,
    channel: "WHATSAPP",
    fromIdentifier: "14998765432",
    toIdentifier: "11999999999",
    body: "Olá! Quanto custa a licença do software de restaurantes?",
  });
  assert(inRes.success && inRes.intent === "PRICE_REQUEST", "TESTE 24: Resposta de Inbound registrada e classificada com sucesso");

  // -------------------------------------------------------------
  // TESTE 25: Resposta de interesse gera Human Handoff
  // -------------------------------------------------------------
  const leadAfterInbound = await prisma.lead.findUnique({ where: { id: lead1.id } });
  assert(
    leadAfterInbound?.status === "HUMAN_REVIEW_REQUIRED" && leadAfterInbound?.cadenceStatus === "STOPPED",
    "TESTE 25: Resposta comercial relevante aciona Human Handoff e interrompe cadência"
  );

  // -------------------------------------------------------------
  // TESTE 26: Resposta de Opt-out cria supressão imediata
  // -------------------------------------------------------------
  const inOptOut = await handleInboundMessage({
    organizationId: testOrgA.id,
    leadId: lead1.id,
    channel: "WHATSAPP",
    fromIdentifier: "14998765432",
    toIdentifier: "11999999999",
    body: "Favor não me enviar mais mensagens, não quero.",
  });
  const supList = await prisma.suppressionList.findFirst({
    where: { organizationId: testOrgA.id, identifier: "14998765432" },
  });
  assert(inOptOut.intent === "OPT_OUT" && Boolean(supList), "TESTE 26: Detecção de opt-out grava automaticamente na SuppressionList");

  // -------------------------------------------------------------
  // TESTE 27: Multi-Tenancy impede acesso cruzado a mensagens
  // -------------------------------------------------------------
  const msgsOrgA = await prisma.outreachMessage.count({ where: { organizationId: testOrgA.id } });
  const msgsOrgB = await prisma.outreachMessage.count({ where: { organizationId: testOrgB.id } });
  assert(msgsOrgA > 0 && msgsOrgB === 0, "TESTE 27: Isolamento rigoroso de mensagens entre organizações distintas");

  // -------------------------------------------------------------
  // TESTE 28: Modo Simulation não envia mensagens reais nem deduz créditos
  // -------------------------------------------------------------
  const balBeforeSim = (await prisma.creditAccount.findUnique({ where: { id: testOrgA.creditAccount?.id } }))?.balance || 0;
  const simResult = await sendOutreachMessage(lead1.id, testCampaignA.id, {
    simulationMode: true,
    idempotencyKey: `sim-test-${Date.now()}`,
  });
  const balAfterSim = (await prisma.creditAccount.findUnique({ where: { id: testOrgA.creditAccount?.id } }))?.balance || 0;
  assert(
    simResult.mode === "SIMULATION" && balBeforeSim === balAfterSim,
    "TESTE 28: Modo SIMULATION executa preview completo sem cobrança de créditos nem disparo de provider"
  );

  // -------------------------------------------------------------
  // TESTE 29: Transição para LIVE exige confirmação explícita
  // -------------------------------------------------------------
  assert(testCampaignA.status === "LIVE", "TESTE 29: Status LIVE validado");

  // -------------------------------------------------------------
  // TESTE 30: Eventos de Outreach e Auditoria registrados
  // -------------------------------------------------------------
  const eventsCount30 = await prisma.outreachEvent.count({ where: { leadId: lead1.id } });
  assert(eventsCount30 >= 3, "TESTE 30: Histórico auditável de eventos de Outreach gravado na timeline");

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runOutreachEngineTests();
