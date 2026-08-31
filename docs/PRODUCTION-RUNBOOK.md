# GUIA OPERACIONAL DE PRODUÇÃO (PRODUCTION RUNBOOK)

Instruções diretas para a equipe de operações gerenciar o Proactive Lead Engine no dia a dia.

---

## 1. Modos de Operação

| Modo | Efeito Prático | Quando Usar |
| :--- | :--- | :--- |
| **DRAFT** | Nenhuma chamada de ingestão ou disparo. Campanha em configuração. | Criação de novos ICPs e copies. |
| **SIMULATION** | Executa Discovery, ICP, Enriquecimento e personalização. **Não dispara mensagens reais e não consome créditos.** | Validação de volume de leads e assertividade do copy. |
| **LIVE** | Execução real completa com validação rigorosa de segurança, Lead Gatekeeper e cobrança de créditos. | Operação comercial ativa. |
| **DRY RUN** | Calcula o impacto projetado (`wouldSend`, `estimatedCost`) via API sem persistir alterações. | Teste de carga e previsão de orçamento. |

---

## 2. Procedimento de Emergência (Como Desligar Tudo)

Se for necessário interromper imediatamente todos os envios no sistema:
1. Acesse `/admin` ou faça um `POST /api/v1/outreach/kill-switch`:
   ```json
   { "target": "GLOBAL", "active": true }
   ```
2. Todos os disparos serão bloqueados instantaneamente no core, independente de chamadas vindas do n8n.

---

## 3. Gerenciamento da Dead Letter Queue (DLQ)

1. Acesse o painel de administração em `/admin`.
2. Verifique a contagem de mensagens pendentes na DLQ.
3. Para reprocessar falhas corrigidas: clique em **Retentar (Retry)**.
4. Para descartar payloads corrompidos: clique em **Ignorar (Ignore)** ou **Resolver (Resolve)**.
