# CUSTOMER WEBHOOKS — DOCUMENTAÇÃO DE INTEGRAÇÃO

## 1. Segurança e Assinatura HMAC-SHA256
Cada evento enviado aos webhooks configurados pelo cliente possui assinatura gerada através do segredo compartilhado:
`X-Signature: sha256(timestamp.payload, secret)`

## 2. Eventos Suportados
* `lead.created`
* `lead.qualified`
* `lead.contacted`
* `lead.replied`
* `lead.interested`
* `meeting.created`
* `deal.won`
* `credits.low`
* `campaign.completed`
