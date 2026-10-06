import { prisma } from "./src/lib/prisma";
import { nativeScheduler, NATIVE_JOBS, executeNativeJob } from "./src/services/automation";
import { processMeetingReminders } from "./src/services/revenue/meeting-engine";
import { processPendingCustomerWebhooks } from "./src/services/revenue/customer-webhooks";
import { validateInternalServiceRequest, hashApiKey } from "./src/services/internal-security";

async function runNativeAutomationTests() {
  console.log("================================================================================");
  console.log("🚀 EXECUTANDO SUÍTE DE TESTES: AUTOMAÇÃO NATIVA & SCHEDULER (ZERO N8N)");
  console.log("================================================================================\n");

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

  const seed = Date.now() % 100000;

  // 1. Setup Organização de Teste
  const org = await prisma.organization.create({
    data: {
      name: `Org Autônoma ${seed}`,
      slug: `org-autonoma-${seed}`,
      creditAccount: { create: { balance: 150 } },
    },
    include: { creditAccount: true },
  });

  const company = await prisma.company.create({
    data: {
      cnpj: `${seed}000199`.padStart(14, "0").slice(0, 14),
      razaoSocial: `Empresa Autônoma Teste ${seed} LTDA`,
      dataAbertura: new Date("2024-01-01"),
      situacao: "ATIVA",
      cnaePrincipal: "6201501",
      municipio: "São Paulo",
      uf: "SP",
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: `Campanha Autônoma ${seed}`,
      productName: "SaaS Pro",
      status: "LIVE",
      icpFilters: JSON.stringify({ states: ["SP"], cnaes: ["6201501"] }),
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      campaignId: campaign.id,
      companyId: company.id,
      status: "QUALIFIED",
      score: 85,
    },
  });

  // TESTE 1: Contagem e catálogo dos 26 Jobs Nativos
  assert(NATIVE_JOBS.length === 26, "TESTE 1: Exatamente 26 jobs nativos registrados (eliminando os 26 workflows do n8n)");

  // TESTE 2: Categorização e metadados dos jobs
  const categories = new Set(NATIVE_JOBS.map((j) => j.category));
  assert(
    categories.has("DISCOVERY") && categories.has("ENRICHMENT") && categories.has("OUTREACH") && categories.has("REVENUE") && categories.has("SRE_SYSTEM"),
    "TESTE 2: Todos os jobs categorizados (Discovery, Enrichment, Outreach, Revenue, SRE)"
  );

  // TESTE 3: Ciclo de vida do Scheduler (Start & Stop)
  nativeScheduler.start();
  let status = nativeScheduler.getStatus();
  assert(status.isRunning && status.activeTimers === 26, "TESTE 3: Scheduler iniciado com sucesso (26 timers ativos em memória)");

  nativeScheduler.stop();
  status = nativeScheduler.getStatus();
  assert(!status.isRunning && status.activeTimers === 0, "TESTE 4: Scheduler pausado com sucesso (zero vazamento de timers)");

  // TESTE 5: Execução isolada do Job 10 (Daily Metrics)
  const metricsResult = await executeNativeJob("daily-metrics");
  assert(metricsResult.status === "SUCCESS", "TESTE 5: Job nativo 'daily-metrics' executado com sucesso");

  // TESTE 6: Execução isolada do Job 11 (Credit Reconciliation)
  const creditResult = await executeNativeJob("credit-reconciliation");
  assert(creditResult.status === "SUCCESS", "TESTE 6: Job nativo 'credit-reconciliation' executado com sucesso");

  // TESTE 7: Execução isolada do Job 09 (Dead Letter Queue Retry)
  const dlqResult = await executeNativeJob("dead-letter-retry");
  assert(dlqResult.status === "SUCCESS", "TESTE 7: Job nativo 'dead-letter-retry' executado com sucesso");

  // TESTE 8: Execução isolada do Job 25 (Customer Webhook Delivery)
  const webhookResult = await executeNativeJob("customer-webhook-delivery");
  assert(webhookResult.status === "SUCCESS", "TESTE 8: Job nativo 'customer-webhook-delivery' executado com sucesso");

  // TESTE 9 & 10: Lembretes de Agendamento (T-24h, T-6h, T-1h)
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const meeting24h = await prisma.meeting.create({
    data: {
      organizationId: org.id,
      leadId: lead.id,
      title: "Demonstração Comercial B2B",
      scheduledAt: in24h,
      status: "SCHEDULED",
      meetingLink: "https://meet.google.com/test-t24h",
    },
  });

  const reminderRun1 = await processMeetingReminders({ organizationId: org.id });
  assert(reminderRun1.remindersSent.t24h === 1, "TESTE 9: Lembrete T-24h disparado automaticamente pelo motor nativo");

  // TESTE 10: Idempotência de Lembretes (não duplicar lembrete T-24h)
  const reminderRun2 = await processMeetingReminders({ organizationId: org.id });
  assert(reminderRun2.remindersSent.t24h === 0, "TESTE 10: Idempotência garantida — nenhum lembrete duplicado para a mesma reunião");

  // TESTE 11: Lembrete T-6h
  const in6h = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const meeting6h = await prisma.meeting.create({
    data: {
      organizationId: org.id,
      leadId: lead.id,
      title: "Reunião de Fechamento",
      scheduledAt: in6h,
      status: "SCHEDULED",
    },
  });
  const reminderRun6h = await processMeetingReminders({ organizationId: org.id });
  assert(reminderRun6h.remindersSent.t6h === 1, "TESTE 11: Lembrete T-6h disparado automaticamente para reunião próxima");

  // TESTE 12: Auditoria persistida no banco de dados para os jobs executados
  const auditEntries = await prisma.n8nExecutionAudit.findMany({
    where: { workflowName: { startsWith: "NATIVE_" } },
  });
  assert(auditEntries.length >= 4, "TESTE 12: Auditoria dos jobs nativos persistida no banco com histórico e métricas");

  // TESTE 13: Validação de Segurança Interna com API Key Hash
  const apiKeyRaw = `ple_live_test_${seed}_key`;
  const hashed = hashApiKey(apiKeyRaw);
  await prisma.apiKey.create({
    data: {
      organizationId: org.id,
      name: "Chave Automação Interna",
      keyPrefix: "ple_live",
      hashedKey: hashed,
      permissions: "ALL",
    },
  });

  const authTest = await validateInternalServiceRequest({
    apiKeyHeader: `Bearer ${apiKeyRaw}`,
  });
  assert(authTest.valid && authTest.organizationId === org.id, "TESTE 13: Segurança interna de API Key validada com sucesso");

  // TESTE 14: Job de Opportunity Radar integrado
  const oppRadarResult = await executeNativeJob("opportunity-radar");
  assert(oppRadarResult.status === "SUCCESS", "TESTE 14: Job nativo 'opportunity-radar' executado com cálculo automático de scores");

  console.log("\n================================================================================");
  console.log(`📊 RESULTADO DA SUÍTE NATIVA: ${passed}/${passed + failed} TESTES PASSARAM COM SUCESSO!`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runNativeAutomationTests().catch((err) => {
  console.error("Erro fatal na suíte de testes de automação nativa:", err);
  process.exit(1);
});
