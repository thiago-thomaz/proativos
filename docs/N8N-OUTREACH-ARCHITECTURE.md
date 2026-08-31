# ARQUITETURA DE INTEGRAÇÃO DO N8N COM O OUTREACH ENGINE

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 5 — OUTREACH ENGINE

---

## 1. Princípio Fundamental de Separação de Responsabilidades

* **O Backend Decide:** Todas as regras de conformidade, validação de ICP, pontuação de contatabilidade, checagem de horários comerciais, lista de supressão e limites diários são executadas de forma imutável pelo backend.
* **O n8n Orquestra:** O n8n é utilizado como executor de agendamentos (`cron`), polling de filas assíncronas e roteador de webhooks externos.

---

## 2. Fluxo Operacional do Workflow

```text
[n8n Cron Trigger (A cada 5 min em horário comercial)]
      |
      v
[HTTP Request: GET /api/v1/outreach/eligible-leads]
      |
      v
[HTTP Request: POST /api/v1/outreach/prepare-messages]
      |
      v
[IF: Campanha em modo SIMULATION ou APPROVAL_REQUIRED]
      |--- Sim ---> [Gravar Notificação / Aguardar Aprovação Humana]
      |--- Não ---> [HTTP Request: POST /api/v1/outreach/dispatch-batch]
                         |
                         v
                    [Receber Status & Atualizar Timeline]
```
