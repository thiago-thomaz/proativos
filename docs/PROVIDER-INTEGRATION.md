# INTEGRAÇÃO DE PROVEDORES REAIS (PROVIDER INTEGRATION GUIDE)

Orientações para conectar credenciais e provedores de terceiros no Proactive Lead Engine.

---

## 1. Onde Configurar Credenciais

No arquivo `.env` da aplicação Next.js (nunca commitar valores reais no Git):

```bash
# Provedor de E-mail (Resend / AWS SES)
EMAIL_PROVIDER="RESEND"
RESEND_API_KEY="re_123456789"
EMAIL_FROM_DEFAULT="comercial@suaempresa.com.br"

# Provedor de WhatsApp (Meta Cloud API Oficial)
WHATSAPP_PROVIDER="META_CLOUD"
META_WHATSAPP_TOKEN="EAAxxxxxxx"
META_WHATSAPP_PHONE_NUMBER_ID="10987654321"
META_WHATSAPP_WABA_ID="20987654321"

# Provedor de Dados & Enriquecimento
CNPJ_PROVIDER="RECEITA_FEDERAL"
ASSERTIVA_API_KEY=""
BIGDATACORP_API_KEY=""

# n8n & Webhooks
PLE_N8N_API_KEY="ple_live_secure_key"
PLE_WEBHOOK_SECRET="ple_secret_hmac"
```

---

## 2. Abstração e Failover

O sistema seleciona automaticamente o provedor primário configurado no `ProviderConfig`. Em caso de instabilidade (`DEGRADED` ou `DOWN`), o orquestrador tenta o secundário cadastrado antes de direcionar a falha para a Dead Letter Queue.
