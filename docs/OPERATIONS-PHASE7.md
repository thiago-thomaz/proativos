# OPERATIONAL GUIDE — FASE 7: REVENUE & AUTONOMOUS SALES

## 1. Monitoramento de Operações
* **Billing & Créditos:** Verificar reservas ativas em `CreditReservation` e alertas de saldo baixo via n8n workflow 17.
* **CRM Deals:** Acompanhar pipeline diário em `/crm` e relatório de unit economics em `/revenue`.
* **Marketplace:** Monitorar lotes disponíveis e atender solicitações de estorno pendentes em `/api/v1/marketplace/refunds`.
* **Webhooks & n8n:** Acompanhar fila de entregas em `CustomerWebhookDelivery` e incidentes na Dead Letter Queue (`DeadLetterMessage`).
