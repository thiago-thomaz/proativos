# WALKTHROUGH — FASE 6: PRODUCTION DATA & N8N ORCHESTRATION

## 1. Resumo Executivo
A **FASE 6 — PRODUCTION DATA & N8N ORCHESTRATION** foi implementada e validada com **100% de sucesso**. O sistema desacopla perfeitamente o **Next.js (Control Plane / SaaS / API)** do **n8n (Execution Plane / Orquestrador)**.

---

## 2. Arquitetura Desacoplada
* **Control Plane (Next.js / Core Backend):** Regras de negócio inegociáveis, Lead Gatekeeper (8 regras de segurança), Scoring ICP, Enriquecimento, Deduplicação, Controle de Créditos em duas fases, Dead Letter Queue e Kill Switches.
* **Execution Plane (n8n):** Orquestração temporal, agendamento de cron, failover, repetição de lotes e consumo de APIs protegidas via HTTP com API Key e assinatura HMAC-SHA256.

---

## 3. Providers e Abstração
* Camada unificada `UniversalProvider` com interfaces canônicas para:
  * `CompanyDiscoveryProvider`
  * `ContactEnrichmentProvider`
  * `EmailProvider`
  * `WhatsAppProvider`
* Monitoramento de integridade dinâmico: `HEALTHY`, `DEGRADED`, `DOWN`.

---

## 4. Workflows n8n Entregues
11 workflows documentados e exportados na pasta `n8n/workflows/`:
1. `PLE - Daily Company Discovery`
2. `PLE - Company Ingestion`
3. `PLE - Lead Qualification`
4. `PLE - Contact Enrichment`
5. `PLE - Outreach Dispatcher`
6. `PLE - Cadence Scheduler`
7. `PLE - Inbound Processor`
8. `PLE - Provider Health Check`
9. `PLE - Dead Letter Retry`
10. `PLE - Daily Metrics`
11. `PLE - Credit Reconciliation`

---

## 5. APIs Novas e Aprimoradas
* `POST /api/v1/discovery/run` (Execução de descoberta com checkpoints)
* `POST /api/v1/cadence/process` (Processamento de lotes de cadência)
* `GET /api/v1/admin/dead-letter` & `POST /api/v1/admin/dead-letter/retry` (Gestão de DLQ)
* `GET /api/v1/admin/overview` (Painel executivo de saúde operacional)

---

## 6. Segurança e Proteção de APIs
* **Autenticação:** API Keys prefixadas e hasheadas em SHA-256 no banco.
* **Assinatura Digital:** HMAC-SHA256 sobre o payload bruto.
* **Tolerância de Skew de Timestamp:** Rejeição de requisições com diferença superior a 5 minutos.
* **Replay Protection:** Bloqueio de reexecuções com o mesmo `X-Request-Id`.

---

## 7. Multi-Tenancy
* Isolamento total e estrito entre organizações para campanhas, leads, contatos, mensagens, chaves de API e créditos.

---

## 8. Controle de Créditos e Custos
* Sistema de créditos em duas fases: `Estimação` $\rightarrow$ `Reserva Atômica (Lock)` $\rightarrow$ `Commit ou Reembolso`.

---

## 9. Descoberta Resiliente
* Suporte completo a todos os filtros de abertura (`TODAY`, `LAST_3_DAYS`, ..., `CUSTOM`, `FROM_DATE`, `UNTIL_DATE`) no fuso `America/Sao_Paulo`.
* Persistência de checkpoints com modelo `DiscoveryCheckpoint` para retormada automática.

---

## 10. Enriquecimento de Contatos
* Consulta com comprovação de proveniência (`sourceProvider`, `confidenceScore`) e classificação de `LeadReadiness` (`READY`, `PARTIALLY_READY`, `NOT_READY`).

---

## 11. Outreach e Lead Gatekeeper
* 8 camadas de validação pré-disparo: ICP qualificado $\rightarrow$ Empresa ATIVA $\rightarrow$ Canal verificado $\rightarrow$ Sem Opt-Out $\rightarrow$ Modo LIVE $\rightarrow$ Horário comercial $\rightarrow$ Limite diário $\rightarrow$ Intervalo de frequência $\rightarrow$ Saldo.

---

## 12. Inbound & Human Handoff
* Classificação automática de intenção: `OPT_OUT`, `MEETING_REQUEST`, `PRICE_REQUEST`, `INTERESTED`, `QUESTION`.
* Parada instantânea de cadência em caso de opt-out e encaminhamento para `/inbox` em caso de interesse.

---

## 13. Observabilidade e Auditoria
* Rastreamento auditável em `N8nExecutionAudit` e `LeadEvent`.

---

## 14. Dead Letter Queue (DLQ)
* Rastreamento e retenção de falhas com suporte a reprocessamento manual ou agendado.

---

## 15. Testes Automatizados (140/140 PASS)
```
FASE 1 Foundation:                    9/9 PASS
FASE 1 Opening Date:                10/10 PASS
FASE 2 ICP Engine:                   18/18 PASS
FASE 3 Data Ingestion:               18/18 PASS
FASE 4 Contact Enrichment:            20/20 PASS
FASE 5 Outreach Engine:              30/30 PASS
FASE 6 Production Orchestration:     35/35 PASS

TOTAL ACUMULADO: 140/140 TESTES PASS (100%)
```

---

## 16. Build de Produção
* **49 rotas compiladas no Next.js (0 erros, 0 warnings).**

---

## 17. Bugs Encontrados & 18. Correções
* Ajustado tipo de argumentos em queries de discovery para suportar `fromDate`, `toDate` e `page`.
* Aplicado `.unref()` nos timers de limpeza de nonces do middleware de segurança para fechamento limpo do processo Node.js.

---

## 19. Arquivos Alterados e Criados
* `prisma/schema.prisma`
* `src/services/n8n-security.ts`
* `src/services/dlq-engine.ts`
* `src/services/provider-orchestrator.ts`
* `src/services/discovery-engine.ts`
* `src/services/cost-controller.ts`
* `src/services/dry-run.ts`
* `src/app/api/v1/discovery/run/route.ts`
* `src/app/api/v1/cadence/process/route.ts`
* `src/app/api/v1/admin/dead-letter/route.ts`
* `src/app/api/v1/admin/overview/route.ts`
* `test-phase6-production-orchestration.ts`
* `docs/PHASE-6-AUDIT.md`, `docs/N8N-WORKFLOWS.md`, `docs/N8N-SETUP.md`, `docs/PRODUCTION-RUNBOOK.md`, `docs/PROVIDER-INTEGRATION.md`, `docs/INCIDENT-RESPONSE.md`, `docs/DATA-COMPLIANCE.md`, `docs/COST-CONTROL.md`
* `.env.example`, `n8n/README.md`, `n8n/environment.example`, `n8n/workflows/*.json`

---

## 20. Pendências Externas
* `BLOCKED_EXTERNAL`: Inserção de chaves reais de provedores (Meta WhatsApp Cloud API e Resend) nas variáveis de ambiente antes da ativação em modo LIVE de produção.

---

## 21. Como Executar em Simulation
* Defina a campanha com `status: "SIMULATION"`. O motor executará toda a descoberta, qualificação e renderização de mensagens sem efetuar envios nem debitar créditos.

---

## 22. Como Preparar para Live
1. Cadastre as credenciais oficiais no `.env`.
2. Alterne a campanha para `status: "LIVE"`.
3. Verifique se o **Global Kill Switch** está desligado (`false`).
4. Ative os triggers do n8n.

---

## 23. Riscos Conhecidos
* Alterações de políticas de mensagens da Meta resolvidas pelo uso obrigatório de templates oficiais homologados.
