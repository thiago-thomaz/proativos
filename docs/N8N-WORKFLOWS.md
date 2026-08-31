# N8N WORKFLOWS SPECIFICATION — PROACTIVE LEAD ENGINE (FASE 6)

## 1. Princípio Fundamental de Arquitetura

O **n8n** atua estritamente como **Execution Plane (Orquestrador)**. O backend **Next.js** atua como **Control Plane & Decision Engine**.

```
[n8n Cron/Webhook] ---> (HTTP POST + HMAC + API Key) ---> [Next.js API Gatekeeper] ---> [DB / Provider]
```

O n8n nunca toma decisões isoladas de elegibilidade, nunca ignora supressão e nunca conecta diretamente a provedores de mensageria para envio final sem aprovação do Gatekeeper.

---

## 2. Catálogo de Workflows Obrigatórios

### 1. PLE - Daily Company Discovery
* **Gatilho:** Cron Diário (`0 06 * * *` - 06:00 BRT).
* **Função:** Consulta campanhas ativas, resolve filtros de abertura e CNAE, busca novas empresas via provedores e envia lote para `/api/v1/discovery/run`.
* **Resiliência:** Utiliza `DiscoveryCheckpoint` para retormada automática de batches.

### 2. PLE - Company Ingestion
* **Gatilho:** Webhook / Sub-workflow.
* **Função:** Normaliza CNPJ, remove pontuações, valida dígitos verificadores (Módulo 11) e posta em `/api/v1/companies/ingest`.

### 3. PLE - Lead Qualification
* **Gatilho:** Ingestão concluída.
* **Função:** Dispara avaliação de ICP em lote via `/api/v1/icp/score` e registra pontuações no pipeline de leads.

### 4. PLE - Contact Enrichment
* **Gatilho:** Criação de novos leads qualificados.
* **Função:** Reserva créditos no `CostController`, consulta dados do QSA/telefonia via `/api/v1/companies/[id]/enrich` e classifica o `LeadReadiness` (`READY`, `PARTIALLY_READY`, `NOT_READY`).

### 5. PLE - Outreach Dispatcher
* **Gatilho:** Cron de Horário Comercial (a cada 30 min entre 09:00 e 18:00 seg-sex).
* **Função:** Consulta `/api/v1/outreach/eligible-leads`, valida Lead Gatekeeper (8 regras) e despacha via `/api/v1/outreach/send`.

### 6. PLE - Cadence Scheduler
* **Gatilho:** Cron Diário (`0 10 * * 1-5` - 10:00 BRT).
* **Função:** Invoca `/api/v1/cadence/process` para avaliar intervalos de dias e stop conditions para follow-ups.

### 7. PLE - Inbound Processor
* **Gatilho:** Webhooks de E-mail / WhatsApp (`/api/v1/webhooks/email`, `/api/v1/webhooks/whatsapp`).
* **Função:** Valida assinatura digital, identifica lead, classifica intenção via IA/RegEx e aciona parada de cadência (em caso de opt-out) ou Human Handoff (em caso de interesse).

### 8. PLE - Provider Health Check
* **Gatilho:** Intervalo de 5 minutos.
* **Função:** Executa ping nos endpoints de saúde dos provedores cadastrados e atualiza status (`HEALTHY`, `DEGRADED`, `DOWN`).

### 9. PLE - Dead Letter Retry
* **Gatilho:** Cron a cada 1 hora.
* **Função:** Consulta mensagens com status `PENDING` ou `RETRYING` em `/api/v1/admin/dead-letter` e reprocessa falhas transitórias com backoff exponencial.

### 10. PLE - Daily Metrics
* **Gatilho:** Cron Diário (`0 23 * * *` - 23:00 BRT).
* **Função:** Consolida KPIs de descoberta, qualificação, enriquecimento, envios, respostas e custos na tabela `N8nExecutionAudit`.

### 11. PLE - Credit Reconciliation
* **Gatilho:** Cron Semanal.
* **Função:** Audita transações de créditos (`CreditTransaction`) contra saldos atuais (`CreditAccount`) e reporta divergências.
