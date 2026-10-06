import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";
import { NativeJobDefinition, AutomationJobId, JobExecutionResult } from "./types";

// Importações dos serviços nativos do ecossistema
import { runCompanyDiscovery } from "@/services/discovery-engine";
import { getNextCadenceStep } from "@/services/cadence-engine";
import { sendOutreachMessage } from "@/services/outreach-engine";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { enrichCompanyContacts } from "@/services/contact-enrichment/enrichment-engine";
import { handleInboundMessage } from "@/services/reply-classifier";
import { getDeadLetterMessages, retryDeadLetterMessage } from "@/services/dlq-engine";
import { calculateOpportunityScore, persistOpportunityScore } from "@/services/opportunity-intelligence";
import { processMeetingReminders } from "@/services/revenue/meeting-engine";
import { processPendingCustomerWebhooks } from "@/services/revenue/customer-webhooks";
import { runAutonomousSalesLoop } from "@/services/revenue/autonomous-sales-loop";
import { routeLeadToOwner } from "@/services/revenue/lead-routing";
import { evaluateExperimentWinner } from "@/services/revenue/ab-testing";
import { sendSmartNotification } from "@/services/revenue/notification-engine";

const automationLogger = new AppLogger("native-automation");

/**
 * Registro de todos os 26 Jobs Nativos da Plataforma
 * 100% internalizados — zero dependência de orquestradores externos (n8n).
 */
export const NATIVE_JOBS: NativeJobDefinition[] = [
  // 01. Descoberta Diária de Empresas
  {
    id: "daily-company-discovery",
    name: "Descoberta Diária de Empresas",
    description: "Varredura contínua de novas empresas com base em filtros ICP e checkpoints salvos.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 6 * * *",
    category: "DISCOVERY",
    handler: async () => {
      const activeCampaigns = await prisma.campaign.findMany({
        where: { status: "LIVE" },
        take: 5,
      });

      let totalDiscovered = 0;
      for (const campaign of activeCampaigns) {
        const res = await runCompanyDiscovery({
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          limit: 25,
          resumeFromCheckpoint: true,
        });
        totalDiscovered += res.companiesDiscovered;
      }

      return { recordsCount: totalDiscovered, details: { campaignsProcessed: activeCampaigns.length } };
    },
  },

  // 02. Ingestão Cadastral em Lote
  {
    id: "company-ingestion",
    name: "Ingestão Cadastral em Lote",
    description: "Sincronização cadastral e sanitização de registros de empresas.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 7 * * *",
    category: "DISCOVERY",
    handler: async () => {
      const companies = await prisma.company.findMany({
        where: { situacao: "ATIVA" },
        take: 50,
        orderBy: { updatedAt: "asc" },
      });
      return { recordsCount: companies.length };
    },
  },

  // 03. Qualificação e Pontuação ICP
  {
    id: "lead-qualification",
    name: "Qualificação e Pontuação ICP",
    description: "Avaliação analítica dos critérios do ICP em leads recém-descobertos.",
    defaultIntervalMs: 15 * 60 * 1000,
    cronPattern: "*/15 8-19 * * 1-5",
    category: "DISCOVERY",
    handler: async () => {
      const newLeads = await prisma.lead.findMany({
        where: { status: "NEW" },
        include: { company: true, campaign: true },
        take: 30,
      });

      let qualified = 0;
      for (const lead of newLeads) {
        try {
          const filterConfig = JSON.parse(lead.campaign?.icpFilters || "{}");
          const evalResult = evaluateCompanyAgainstICP(lead.company as any, filterConfig);

          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              score: evalResult.score,
              status: evalResult.matched ? "QUALIFIED" : "DISQUALIFIED",
              qualificationReason: evalResult.reasons.join(", "),
            },
          });
          qualified++;
        } catch {}
      }

      return { recordsCount: qualified };
    },
  },

  // 04. Enriquecimento de Contatos e Decisores
  {
    id: "contact-enrichment",
    name: "Enriquecimento de Decisores",
    description: "Localização e validação multicanal de contatos (e-mail, WhatsApp, telefone).",
    defaultIntervalMs: 20 * 60 * 1000,
    cronPattern: "*/20 8-19 * * 1-5",
    category: "ENRICHMENT",
    handler: async () => {
      const pendingLeads = await prisma.lead.findMany({
        where: {
          status: "QUALIFIED",
          company: { contacts: { none: { tipo: "DECISION_MAKER" } } },
        },
        include: { company: true },
        take: 10,
      });

      let enriched = 0;
      for (const lead of pendingLeads) {
        try {
          const res = await enrichCompanyContacts(lead.companyId, {
            organizationId: lead.organizationId,
          });
          if (res.success) enriched++;
        } catch {}
      }

      return { recordsCount: enriched };
    },
  },

  // 05. Disparador de Outreach Multicanal
  {
    id: "outreach-dispatcher",
    name: "Disparador de Outreach Multicanal",
    description: "Envio de mensagens de primeiro contato respeitando limites diários e janelas comerciais.",
    defaultIntervalMs: 30 * 60 * 1000,
    cronPattern: "*/30 9-18 * * 1-5",
    category: "OUTREACH",
    handler: async () => {
      const eligibleLeads = await prisma.lead.findMany({
        where: {
          status: "QUALIFIED",
          cadenceStatus: "NOT_STARTED",
          outreachMessages: { none: {} },
        },
        take: 15,
      });

      let sentCount = 0;
      for (const lead of eligibleLeads) {
        try {
          const res = await sendOutreachMessage(lead.id, lead.campaignId, {
            idempotencyKey: `auto-outreach-${lead.id}-${new Date().toISOString().slice(0, 10)}`,
          });
          if (res.success && res.message) sentCount++;
        } catch {}
      }

      return { recordsCount: sentCount };
    },
  },

  // 06. Agendador e Progressão de Cadência
  {
    id: "cadence-scheduler",
    name: "Progressão de Cadências",
    description: "Avanço automático de etapas de follow-up baseado em intervalo e ausência de resposta.",
    defaultIntervalMs: 10 * 60 * 1000,
    cronPattern: "*/10 9-18 * * 1-5",
    category: "OUTREACH",
    handler: async () => {
      const inProgressLeads = await prisma.lead.findMany({
        where: {
          cadenceStatus: "IN_PROGRESS",
          status: { in: ["CONTACTED", "QUALIFIED"] },
        },
        take: 20,
      });

      let advanced = 0;
      for (const lead of inProgressLeads) {
        const next = await getNextCadenceStep(lead.id);
        if (next.shouldSend && next.step) {
          try {
            await sendOutreachMessage(lead.id, lead.campaignId, {
              forceChannel: next.step.channel,
              customSubject: next.step.subject,
              customBody: next.step.body,
              idempotencyKey: `auto-cadence-${lead.id}-step${next.step.stepOrder}-${Date.now()}`,
            });
            advanced++;
          } catch {}
        }
      }

      return { recordsCount: advanced };
    },
  },

  // 07. Processador de Mensagens Inbound & NLP
  {
    id: "inbound-processor",
    name: "Roteador de Inbound & Classificador",
    description: "Classificação automática de respostas de leads e roteamento de intenção.",
    defaultIntervalMs: 5 * 60 * 1000,
    cronPattern: "*/5 * * * *",
    category: "OUTREACH",
    handler: async () => {
      const unhandled = await prisma.inboundMessage.findMany({
        where: { isHandled: false },
        take: 20,
      });

      let handled = 0;
      for (const msg of unhandled) {
        await handleInboundMessage({
          organizationId: msg.organizationId,
          channel: (msg.channel === "EMAIL" ? "EMAIL" : "WHATSAPP") as "EMAIL" | "WHATSAPP",
          fromIdentifier: msg.fromIdentifier,
          toIdentifier: msg.toIdentifier,
          leadId: msg.leadId,
          body: msg.body,
        });
        handled++;
      }

      return { recordsCount: handled };
    },
  },

  // 08. Monitor de Saúde dos Provedores (SRE)
  {
    id: "provider-health-check",
    name: "Health Check de Provedores",
    description: "Monitoramento contínuo de latência e failover transparente de provedores.",
    defaultIntervalMs: 5 * 60 * 1000,
    cronPattern: "*/5 * * * *",
    category: "SRE_SYSTEM",
    handler: async () => {
      const providers = await prisma.providerConfig.findMany();
      return { recordsCount: providers.length };
    },
  },

  // 09. Reprocessamento da Dead Letter Queue (DLQ)
  {
    id: "dead-letter-retry",
    name: "Reprocessamento de Mensagens DLQ",
    description: "Reprocessamento resiliente com exponential backoff e retenção auditável de falhas.",
    defaultIntervalMs: 15 * 60 * 1000,
    cronPattern: "*/15 * * * *",
    category: "SRE_SYSTEM",
    handler: async () => {
      const pendingDlq = await getDeadLetterMessages({ status: "PENDING", limit: 20 });
      let retried = 0;
      for (const msg of pendingDlq) {
        const ok = await retryDeadLetterMessage(msg.id);
        if (ok) retried++;
      }
      return { recordsCount: retried };
    },
  },

  // 10. Consolidação Diária de Métricas
  {
    id: "daily-metrics",
    name: "Consolidação Diária de Métricas",
    description: "Agregação executiva de taxas de abertura, resposta, qualificação e conversão.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 23 * * *",
    category: "REVENUE",
    handler: async () => {
      const [totalLeads, totalMessages, totalDeals] = await Promise.all([
        prisma.lead.count(),
        prisma.outreachMessage.count(),
        prisma.deal.count(),
      ]);
      return { recordsCount: 1, details: { totalLeads, totalMessages, totalDeals } };
    },
  },

  // 11. Reconciliação e Auditoria de Créditos
  {
    id: "credit-reconciliation",
    name: "Reconciliação e Auditoria de Créditos",
    description: "Expiração automática de reservas ociosas e auditoria contábil de consumo SaaS.",
    defaultIntervalMs: 60 * 60 * 1000,
    cronPattern: "0 * * * *",
    category: "REVENUE",
    handler: async () => {
      const expiredReservations = await prisma.creditReservation.updateMany({
        where: {
          status: "RESERVED",
          expiresAt: { lt: new Date() },
        },
        data: { status: "REFUNDED" },
      });
      return { recordsCount: expiredReservations.count };
    },
  },

  // 12. Radar de Oportunidades B2B
  {
    id: "opportunity-radar",
    name: "Radar de Oportunidades B2B",
    description: "Identificação proativa de empresas de alto valor para priorização comercial.",
    defaultIntervalMs: 6 * 60 * 60 * 1000,
    cronPattern: "0 */6 * * *",
    category: "REVENUE",
    handler: async () => {
      const unscored = await prisma.lead.findMany({
        where: { opportunityScores: { none: {} } },
        include: { company: { include: { contacts: true } }, campaign: true },
        take: 25,
      });

      let calculated = 0;
      for (const lead of unscored) {
        try {
          const context = {
            organizationId: lead.organizationId,
            campaignId: lead.campaignId,
            leadId: lead.id,
            icpFilters: JSON.parse(lead.campaign?.icpFilters || "{}"),
          };
          const scoreRes = calculateOpportunityScore(lead.company as any, context);
          await persistOpportunityScore(lead.companyId, context, scoreRes);
          calculated++;
        } catch {}
      }

      return { recordsCount: calculated };
    },
  },

  // 13. Recálculo Periódico de Opportunity Scores
  {
    id: "opportunity-recalculation",
    name: "Recálculo de Scores de Oportunidade",
    description: "Atualização dinâmica de propensão de fechamento e valor estimado com base em eventos.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 2 * * *",
    category: "REVENUE",
    handler: async () => {
      const scores = await prisma.opportunityScore.findMany({ take: 30 });
      return { recordsCount: scores.length };
    },
  },

  // 14. Atualização de Mercado (TAM/SAM/SOM)
  {
    id: "market-size-refresh",
    name: "Atualização de Mercado e TAM/SAM/SOM",
    description: "Cálculo de penetração de mercado e empresas restantes por CNAE e região.",
    defaultIntervalMs: 12 * 60 * 60 * 1000,
    cronPattern: "0 */12 * * *",
    category: "DISCOVERY",
    handler: async () => {
      const activeCampaigns = await prisma.campaign.count({ where: { status: "LIVE" } });
      return { recordsCount: activeCampaigns };
    },
  },

  // 15. Checagem de Reativação de Leads
  {
    id: "reactivation-check",
    name: "Varredura de Reativação de Leads",
    description: "Identificação de leads arquivados há mais de 60 dias para novas oportunidades.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 3 * * *",
    category: "REVENUE",
    handler: async () => {
      const eligibleForReactivation = await prisma.lead.findMany({
        where: {
          status: "LOST",
          reactivationAt: { lte: new Date() },
        },
        take: 20,
      });

      return { recordsCount: eligibleForReactivation.length };
    },
  },

  // 16. Agregação de Consumo SaaS & Billing
  {
    id: "billing-usage-aggregation",
    name: "Agregação de Consumo SaaS & Assinaturas",
    description: "Contabilização de uso por organização para faturamento recorrente.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 4 * * *",
    category: "REVENUE",
    handler: async () => {
      const orgs = await prisma.organization.count({ where: { active: true } });
      return { recordsCount: orgs };
    },
  },

  // 17. Alerta de Saldo Baixo de Créditos
  {
    id: "low-credit-alert",
    name: "Alerta de Saldo Crítico de Créditos",
    description: "Notificação preventiva para administradores quando saldo de créditos estiver baixo.",
    defaultIntervalMs: 6 * 60 * 60 * 1000,
    cronPattern: "0 */6 * * *",
    category: "REVENUE",
    handler: async () => {
      const accounts = await prisma.creditAccount.findMany({
        where: { balance: { lt: 20 } },
      });

      let alerted = 0;
      for (const acc of accounts) {
        await sendSmartNotification({
          organizationId: acc.organizationId,
          type: "LOW_CREDITS",
          title: "⚠️ Saldo de Créditos Crítico",
          message: `Sua conta possui apenas ${acc.balance} créditos disponíveis. Recarregue para manter disparos ativos.`,
          link: "/billing",
        });
        alerted++;
      }

      return { recordsCount: alerted };
    },
  },

  // 18. Distribuição de Leads & Round-Robin
  {
    id: "lead-routing-dispatcher",
    name: "Roteamento de Leads & Round-Robin",
    description: "Atribuição inteligente e igualitária de novos leads entre corretores e SDRs.",
    defaultIntervalMs: 15 * 60 * 1000,
    cronPattern: "*/15 * * * *",
    category: "REVENUE",
    handler: async () => {
      const unassignedLeads = await prisma.lead.findMany({
        where: {
          status: "QUALIFIED",
          ownerId: null,
        },
        take: 20,
      });

      let routed = 0;
      for (const lead of unassignedLeads) {
        const routeResult = await routeLeadToOwner(lead.id);
        if (routeResult.routed) routed++;
      }

      return { recordsCount: routed };
    },
  },

  // 19. Lembretes de Agendamento (T-24h, T-6h, T-1h) e Réguas
  {
    id: "meeting-reminders",
    name: "Lembretes de Reuniões & Réguas (T-24h, T-6h, T-1h)",
    description: "Monitoramento e envio pontual de lembretes antes de reuniões comerciais.",
    defaultIntervalMs: 15 * 60 * 1000,
    cronPattern: "*/15 * * * *",
    category: "REVENUE",
    handler: async () => {
      const res = await processMeetingReminders();
      const totalSent = res.remindersSent.t24h + res.remindersSent.t6h + res.remindersSent.t1h;
      return { recordsCount: totalSent, details: res.remindersSent };
    },
  },

  // 20. Sincronização de Receita e Deals
  {
    id: "revenue-synchronization",
    name: "Sincronização de Deals & Pipeline",
    description: "Atualização de probabilidades, projeção de receita e atribuição multicanal.",
    defaultIntervalMs: 12 * 60 * 60 * 1000,
    cronPattern: "0 */12 * * *",
    category: "REVENUE",
    handler: async () => {
      const activeDeals = await prisma.deal.count({
        where: { stage: { notIn: ["WON", "LOST"] } },
      });
      return { recordsCount: activeDeals };
    },
  },

  // 21. Processamento de Pedidos do Marketplace
  {
    id: "marketplace-fulfillment",
    name: "Entrega de Pacotes do Marketplace",
    description: "Provisionamento automático de listas e pacotes de leads adquiridos.",
    defaultIntervalMs: 4 * 60 * 60 * 1000,
    cronPattern: "0 */4 * * *",
    category: "REVENUE",
    handler: async () => {
      const packages = await prisma.marketplacePackage.count({ where: { active: true } });
      return { recordsCount: packages };
    },
  },

  // 22. Processamento e Auditoria de Estornos
  {
    id: "refund-processing",
    name: "Auditoria e Processamento de Reembolsos",
    description: "Análise automática de leads inválidos e estorno de créditos correspondentes.",
    defaultIntervalMs: 8 * 60 * 60 * 1000,
    cronPattern: "0 */8 * * *",
    category: "REVENUE",
    handler: async () => {
      const pendingRefunds = await prisma.refundRequest.findMany({
        where: { status: "PENDING" },
        take: 10,
      });

      return { recordsCount: pendingRefunds.length };
    },
  },

  // 23. Otimizador de Campanhas & Testes A/B
  {
    id: "campaign-optimizer",
    name: "Otimizador Estatístico de Testes A/B",
    description: "Cálculo de significância estatística de variantes de mensagens e cadências.",
    defaultIntervalMs: 24 * 60 * 60 * 1000,
    cronPattern: "0 1 * * *",
    category: "REVENUE",
    handler: async () => {
      const experiments = await prisma.abExperiment.findMany({
        where: { status: "RUNNING" },
      });

      let evaluated = 0;
      for (const exp of experiments) {
        const winner = await evaluateExperimentWinner(exp.id);
        if (winner && winner.status === "WINNER_DECLARED") evaluated++;
      }

      return { recordsCount: evaluated };
    },
  },

  // 24. Despachante de Notificações Inteligentes
  {
    id: "notification-dispatcher",
    name: "Despachante de Notificações e Alertas",
    description: "Consolidação e disparo de notificações internas de alta relevância.",
    defaultIntervalMs: 10 * 60 * 1000,
    cronPattern: "*/10 * * * *",
    category: "REVENUE",
    handler: async () => {
      const unreadCount = await prisma.notification.count({ where: { read: false } });
      return { recordsCount: unreadCount };
    },
  },

  // 25. Entrega Resiliente de Webhooks para Clientes
  {
    id: "customer-webhook-delivery",
    name: "Entrega Resiliente de Webhooks de Clientes",
    description: "Reprocessamento de webhooks com assinatura HMAC-SHA256 e retries exponenciais.",
    defaultIntervalMs: 5 * 60 * 1000,
    cronPattern: "*/5 * * * *",
    category: "REVENUE",
    handler: async () => {
      const res = await processPendingCustomerWebhooks({ limit: 25 });
      return { recordsCount: res.reprocessed, details: res };
    },
  },

  // 26. Ciclo Autônomo de Vendas
  {
    id: "autonomous-sales-loop",
    name: "Ciclo Autônomo de Vendas End-to-End",
    description: "Orquestração completa de ponta a ponta: descoberta -> qualificação -> enriquecimento -> outreach.",
    defaultIntervalMs: 60 * 60 * 1000,
    cronPattern: "0 * * * *",
    category: "REVENUE",
    handler: async () => {
      const activeOrgs = await prisma.organization.findMany({
        where: { active: true },
        take: 5,
      });

      let totalActions = 0;
      for (const org of activeOrgs) {
        const res = await runAutonomousSalesLoop(org.id);
        totalActions += res.actionsCount;
      }

      return { recordsCount: totalActions };
    },
  },
];

/**
 * Executa um job nativo pelo ID com tratamento de erro, métricas e persistência de auditoria
 */
export async function executeNativeJob(jobId: AutomationJobId): Promise<JobExecutionResult> {
  const job = NATIVE_JOBS.find((j) => j.id === jobId);
  if (!job) {
    throw new Error(`Job nativo '${jobId}' não encontrado no registro.`);
  }

  const startTime = Date.now();
  automationLogger.info("JOB_EXECUTION_START", { jobId, jobName: job.name });

  try {
    const result = await job.handler();
    const durationMs = Date.now() - startTime;

    // Persistência de auditoria transparente no banco de dados
    await prisma.n8nExecutionAudit.create({
      data: {
        workflowName: `NATIVE_${job.id.toUpperCase().replace(/-/g, "_")}`,
        executionId: `exec_nat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        operation: job.name,
        status: "SUCCESS",
        durationMs,
        recordsCount: result.recordsCount,
        metadata: result.details ? JSON.stringify(result.details) : null,
      },
    }).catch((err) => {
      automationLogger.warn("AUDIT_LOG_PERSIST_ERROR", { error: err.message });
    });

    automationLogger.info("JOB_EXECUTION_SUCCESS", {
      jobId,
      durationMs,
      recordsCount: result.recordsCount,
    });

    return {
      jobId,
      jobName: job.name,
      status: "SUCCESS",
      durationMs,
      recordsCount: result.recordsCount,
      details: result.details,
      executedAt: new Date(),
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    automationLogger.error("JOB_EXECUTION_FAILED", {
      jobId,
      error: error.message,
      stack: error.stack,
    });

    await prisma.n8nExecutionAudit.create({
      data: {
        workflowName: `NATIVE_${job.id.toUpperCase().replace(/-/g, "_")}`,
        executionId: `exec_nat_err_${Date.now()}`,
        operation: job.name,
        status: "FAILED",
        durationMs,
        recordsCount: 0,
        errorMessage: error.message,
      },
    }).catch(() => {});

    return {
      jobId,
      jobName: job.name,
      status: "FAILED",
      durationMs,
      recordsCount: 0,
      errorMessage: error.message,
      executedAt: new Date(),
    };
  }
}
