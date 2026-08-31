# N8N ORCHESTRATION DIRECTORY — PROACTIVE LEAD ENGINE

Esta pasta contém as definições de ambiente e templates exportados de workflows prontos para importação direta no n8n.

---

## Estrutura

```
n8n/
├── workflows/
│   ├── 01-daily-company-discovery.json
│   ├── 02-company-ingestion.json
│   ├── 03-lead-qualification.json
│   ├── 04-contact-enrichment.json
│   ├── 05-outreach-dispatcher.json
│   ├── 06-cadence-scheduler.json
│   ├── 07-inbound-processor.json
│   ├── 08-provider-health-check.json
│   ├── 09-dead-letter-retry.json
│   ├── 10-daily-metrics.json
│   └── 11-credit-reconciliation.json
├── environment.example
└── README.md
```

---

## Como Importar
1. Copie `environment.example` para `.env` do seu n8n e configure as chaves.
2. Na UI do n8n, utilize a opção **Import from File** para importar cada workflow da pasta `workflows/`.
3. Ative os gatilhos (Cron/Webhook).
