# RESPOSTA A INCIDENTES E RECUPERAÇÃO DE FALHAS

Procedimentos diretos para mitigação de falhas em ambiente de produção.

---

## 1. Classificação de Severidade

* **SEV-1 (Crítico):** Disparos em massa fora do horário comercial, violação de opt-out ou falha generalizada de autenticação.
  * *Ação:* Acionar imediatamente o **Kill Switch Global** (`POST /api/v1/outreach/kill-switch` com `{"target": "GLOBAL", "active": true}`).
* **SEV-2 (Alto):** Provedor de envio fora do ar (`DOWN`) ou acúmulo excessivo na Dead Letter Queue (> 100 mensagens).
  * *Ação:* Verificar status no painel `/admin`, checar saldo/limites no provedor e chavear para provedor secundário de failover.
* **SEV-3 (Médio):** Timeout esporádico de enriquecimento ou oscilação de latência em APIs de CNPJ.
  * *Ação:* O sistema absorve com retry e backoff exponencial automático. Acompanhar métricas de `IngestionJob`.
