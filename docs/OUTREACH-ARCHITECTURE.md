# ARQUITETURA DO INTELLIGENT OUTREACH ENGINE

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 5 — OUTREACH ENGINE

---

## 1. Visão Geral da Arquitetura

O **Intelligent Outreach Engine** orquestra o envio de abordagens comerciais contextualizadas através de múltiplos canais (E-mail e WhatsApp) para leads aprovados no ICP Engine e no Contact & Enrichment Engine.

```text
+-----------------------+
|  Lead Qualificado ICP |
+-----------+-----------+
            |
            v
+-----------------------+
|    Lead Safety Gate   | -> Valida ICP, Contatabilidade, Supressão, Limites Diários, Janela Comercial
+-----------+-----------+
            | (Elegível)
            v
+-----------------------+
| Message Personalizer  | -> Renderiza templates com dados reais (Sem alucinações de IA)
+-----------+-----------+
            |
            v
+-----------------------+
|  Cadence & Queue Svc  | -> Sequenciamento de passos (Step 1 -> Intervalo -> Step 2)
+-----------+-----------+
            |
            v
+-----------------------+
| Provider Abstraction  | -> EmailProvider / WhatsAppProvider (Resend / Cloud API / Mock)
+-----------+-----------+
            |
            v
+-----------------------+
| Webhook & Inbound Svc | -> Recebe eventos de entrega, aberturas, cliques e respostas
+-----------+-----------+
            |
            v
+-----------------------+
|  Reply Classification | -> Classifica intenção (INTERESTED, PRICE_REQUEST, OPT_OUT)
+-----------+-----------+
            |
      +-----+-----+
      |           |
(Interessado)  (Opt-Out)
      |           |
      v           v
+-----------+   +-------------------+
| Human     |   | Interromper       |
| Handoff   |   | Cadência &        |
| (Inbox)   |   | Adicionar         |
+-----------+   | SuppressionList   |
                +-------------------+
```

---

## 2. Abstrações de Provedores

* **`EmailProvider`:**
  * `sendEmail(payload: EmailSendPayload): Promise<SendResult>`
  * `getDeliveryStatus(providerMessageId: string): Promise<DeliveryStatus>`
  * `getProviderHealth(): Promise<ProviderHealth>`
* **`WhatsAppProvider`:**
  * `sendMessage(payload: WhatsAppSendPayload): Promise<SendResult>`
  * `getMessageStatus(providerMessageId: string): Promise<DeliveryStatus>`
  * `getProviderHealth(): Promise<ProviderHealth>`
