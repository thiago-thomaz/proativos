# N8N SETUP & INTEGRATION GUIDE

Este guia orienta a configuração do **n8n** como orquestrador do **Proactive Lead Engine** de forma simples e direta.

---

## 1. Variáveis de Ambiente no n8n

No arquivo `.env` da sua instância do n8n ou no painel de configurações, defina:

```bash
PLE_API_BASE_URL=https://app.leads-proativos.com.br/api/v1
PLE_API_KEY=ple_live_0192837465abcdef987654321
PLE_HMAC_SECRET=sua_chave_secreta_hmac_aqui_para_assinatura
PLE_TIMEZONE=America/Sao_Paulo
```

---

## 2. Importação dos Workflows

1. Acesse o n8n (`http://localhost:5678` ou URL do Coolify/Cloud).
2. Vá em **Workflows** $\rightarrow$ **Import from File**.
3. Selecione os arquivos JSON localizados na pasta `n8n/workflows/`:
   * `01-daily-company-discovery.json`
   * `02-company-ingestion.json`
   * `03-lead-qualification.json`
   * `04-contact-enrichment.json`
   * `05-outreach-dispatcher.json`
   * `06-cadence-scheduler.json`
   * `07-inbound-processor.json`
   * `08-provider-health-check.json`
   * `09-dead-letter-retry.json`
   * `10-daily-metrics.json`
   * `11-credit-reconciliation.json`
4. Ative os workflows desejados clicando no toggle **Active**.

---

## 3. Configuração do Header de Autenticação

Em todos os nós HTTP Request do n8n configurados para o Proactive Lead Engine:
* **Header `X-API-Key`:** `={{ $env.PLE_API_KEY }}`
* **Header `X-Timestamp`:** `={{ Date.now() }}`
* **Header `X-Request-Id`:** `={{ $execution.id }}`
* **Header `Content-Type`:** `application/json`
