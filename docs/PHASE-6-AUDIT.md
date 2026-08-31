# AUDITORIA TÉCNICA E ARQUITETURAL — FASE 6

## 1. Arquitetura Atual (Fases 1 a 5)

O **Proactive Lead Engine** concluiu as Fases 1 a 5 com 105 testes automatizados (100% de sucesso) e 45 rotas no build Next.js. A estrutura atual está organizada em:

* **Foundation (Fase 1):** Multi-tenancy por organização, RBAC, autenticação, créditos básicos e conformidade LGPD.
* **Opening Date Filter (Fase 1 Enhancement):** Resolução de períodos rápidos e personalizados no fuso `America/Sao_Paulo`.
* **ICP Engine (Fase 2):** Desacoplamento de Hard Filters (eliminatórios) e Soft Filters (0–100), processamento de linguagem natural (NLP) e cálculo de qualidade de ICP.
* **Data Ingestion Engine (Fase 3):** Ingestão de empresas, normalização, deduplicação por CNPJ, rastreamento de alterações (`CompanyEvent`), checkpoints e lineage.
* **Contact & Enrichment Engine (Fase 4):** Identificação de decisores (QSA), normalização de contatos, cálculo de `ContactabilityScore`, `LeadReadiness` e `LeadPriorityScore`.
* **Outreach Engine (Fase 5):** Lead Gatekeeper (8 regras de segurança), personalização contextual, cadências com Stop Conditions, classificação de respostas e Inbox comercial (`/inbox`).

---

## 2. Mapeamento de Mocks vs Pontos de Conexão Real

| Módulo | Mock Atual | Ponto de Injeção / Provider Real | Capacidades Exigidas |
| :--- | :--- | :--- | :--- |
| **Descoberta de Empresas** | `MockSandboxProvider` | APIs de CNPJ (ReceitaWS, CNPJ.ws, Minha Receita, CSV Ingestion) | Filtro por data de abertura, UF, CNAE, Porte, Município, Paginação |
| **Enriquecimento de Contatos** | `MockEnrichmentProvider` | Receita QSA, Assertiva, BigDataCorp, Provedores de Consulta | Extração de QSA, Validação de WhatsApp/Telefone, E-mail Corporativo |
| **Envio de E-mail** | `MockEmailProvider` | Resend, Amazon SES, Postmark | Disparo transacional, webhooks de tracking (delivery/open/click/bounce), inbound MX |
| **Envio de WhatsApp** | `MockWhatsAppProvider` | Meta Cloud API Oficial, Z-API, Evolution API | Templates HSM homologados, envio de texto, webhooks de status e inbound |

---

## 3. Mapeamento de Entidades do Banco (`prisma/schema.prisma`)

* **Multi-tenancy:** `Organization`, `User`, `CreditAccount`, `CreditTransaction`, `Integration`, `WebhookEndpoint`, `AuditLog`.
* **Empresas & Contatos:** `Company`, `CompanyEvent`, `Contact`, `EnrichmentJob`, `SuppressionList`.
* **Ingestão & Provedores:** `IngestionJob`, `IngestionEvent`, `ProviderConfig`.
* **Campanhas & Leads:** `Campaign`, `Lead`, `LeadEvent`, `Template`.
* **Outreach & Inbound:** `OutreachMessage`, `InboundMessage`, `OutreachEvent`.
* **Novas Entidades para Fase 6:**
  * `DeadLetterMessage` (Fila de mensagens e jobs falhos com retry/ignore/resolve).
  * `DiscoveryCheckpoint` (Cursor resiliente de paginação e batching para o n8n).
  * `N8nExecutionAudit` (Auditoria de execução fim a fim dos workflows).
  * `ApiKey` (Autenticação robusta n8n $\leftrightarrow$ API com HMAC, secret e rate limits).

---

## 4. Análise de Riscos e Gaps Identificados

1. **Risco de Bypass pelo Orquestrador (n8n):** O n8n nunca deve disparar mensagens diretamente para os provedores sem validação do Lead Gatekeeper.
   * *Mitigação:* O n8n apenas invoca os endpoints do Next.js (`POST /api/v1/outreach/send`). O core avalia as 8 regras e executa a chamada ao provider.
2. **Risco de Repetição de Disparos em Falhas de Rede:** Se o n8n sofrer timeout e retentar a requisição.
   * *Mitigação:* Chaves de idempotência universais (`idempotencyKey`) e tokens de execução (`executionId`).
3. **Risco de Consumo Excessivo de Créditos:** Chamadas simultâneas que excedam o saldo.
   * *Mitigação:* Motor de duas fases com `Credit Reservation` (Estimação $\rightarrow$ Reserva $\rightarrow$ Confirmação/Reembolso).
4. **Isolamento de Tenants (Multi-Tenancy):**
   * *Mitigação:* Validação mandatória de `ApiKey` vinculada à `organizationId` com verificação de assinatura HMAC e rejeição de tokens expirados.

---

## 5. Plano de Implementação da Fase 6

1. **Etapa 1:** Atualização do Schema Prisma (`DeadLetterMessage`, `DiscoveryCheckpoint`, `N8nExecutionAudit`, `ApiKey`) e sincronização.
2. **Etapa 2:** Implementação do middleware de segurança n8n com assinatura HMAC e proteção contra replay.
3. **Etapa 3:** Camada de abstração unificada de provedores (`ProviderOrchestrator`) com health checks e failover.
4. **Etapa 4:** Motor de Descoberta com persistência de checkpoints e paginação resiliente.
5. **Etapa 5:** Fila de Tratamento de Falhas (Dead Letter Queue - DLQ) com APIs de consulta e reprocessamento.
6. **Etapa 6:** Motor de controle de custos de enriquecimento e reserva atômica de créditos.
7. **Etapa 7:** Implementação do modo `DRY_RUN` global para simulação segura sem custo.
8. **Etapa 8:** Exportação de workflows JSON para o n8n (`n8n/workflows/`), documentação operacional e runbooks.
9. **Etapa 9:** Expansão do Painel Administrativo (`/admin`) e Funil de Conversão de Campanhas (`/campaigns/[id]`).
10. **Etapa 10:** Implementação da suíte de 35 testes automatizados (`test-phase6-production-orchestration.ts`).
11. **Etapa 11:** Execução de todas as suítes de regressão (140 testes no total) e build de produção (0 erros).
