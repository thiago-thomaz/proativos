# N8N ORCHESTRATION DIRECTORY — PROACTIVE LEAD ENGINE

Esta pasta contém as definições de ambiente e templates exportados dos **26 workflows prontos para importação direta no n8n**.

---

## Estrutura de Workflows (26 Módulos)

```
n8n/
├── workflows/
│   ├── 01-daily-company-discovery.json       # Descoberta diária de novas empresas
│   ├── 02-company-ingestion.json              # Ingestão em lote de dados cadastrais
│   ├── 03-lead-qualification.json             # Qualificação e pontuação ICP
│   ├── 04-contact-enrichment.json             # Enriquecimento de decisores
│   ├── 05-outreach-dispatcher.json            # Disparo de mensagens multicanal
│   ├── 06-cadence-scheduler.json              # Progressão de passos da cadência
│   ├── 07-inbound-processor.json              # Roteador de respostas e classificação
│   ├── 08-provider-health-check.json          # Monitoramento e failover de provedores
│   ├── 09-dead-letter-retry.json              # Reprocessamento automático da DLQ
│   ├── 10-daily-metrics.json                  # Consolidação de métricas diárias
│   ├── 11-credit-reconciliation.json          # Auditoria e reconciliação de créditos
│   ├── 12-opportunity-radar.json              # Radar de oportunidades B2B
│   ├── 13-opportunity-recalculation.json      # Recálculo periódico de scores
│   ├── 14-market-size-refresh.json            # Atualização de TAM/SAM/SOM
│   ├── 15-reactivation-check.json             # Reativação de leads adormecidos
│   ├── 16-billing-usage-aggregation.json      # Agregação de consumo SaaS
│   ├── 17-low-credit-alert.json               # Alertas de saldo baixo de créditos
│   ├── 18-lead-routing-dispatcher.json        # Distribuição de leads e round-robin
│   ├── 19-meeting-reminders.json              # Lembretes automáticos de reuniões
│   ├── 20-revenue-synchronization.json        # Sincronização de receita e deals
│   ├── 21-marketplace-fulfillment.json        # Entrega de pacotes do marketplace
│   ├── 22-refund-processing.json              # Processamento de estornos de leads
│   ├── 23-campaign-optimizer.json             # Otimização e declaração de testes A/B
│   ├── 24-notification-dispatcher.json        # Envio de notificações inteligentes
│   ├── 25-customer-webhook-delivery.json      # Disparo de webhooks para clientes
│   └── 26-autonomous-sales-loop.json          # Ciclo autônomo de vendas
├── environment.example
└── README.md
```

---

## Como Importar
1. Copie `environment.example` para `.env` do seu n8n e configure `PLE_API_BASE_URL` e `PLE_API_KEY`.
2. Na UI do n8n, utilize a opção **Import from File** para importar cada workflow da pasta `workflows/`.
3. Ative os gatilhos (Cron/Webhook).
