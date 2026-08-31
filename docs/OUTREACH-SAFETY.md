# POLÍTICA DE SEGURANÇA, CONTROLES DE RISCO E KILL SWITCH

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 5 — OUTREACH ENGINE

---

## 1. Níveis de Kill Switch (Desativação de Emergência)

A plataforma implementa 4 níveis de interrupção imediata de disparos:

1. **Global Kill Switch (`OUTREACH_KILL_SWITCH`):**
   * Bloqueia instantaneamente qualquer disparo no nível do sistema inteiro. Mensagens pendentes permanecem retidas na fila.
2. **Campaign Kill Switch (`PAUSED` / `STOP_CAMPAIGN`):**
   * Pausa imediatamente todos os envios de uma campanha específica sem afetar as demais.
3. **Contact Kill Switch (`STOP_CONTACT` / `SUPPRESSION`):**
   * Cancela qualquer mensagem agendada para um contato específico.
4. **Credit Balance Protection:**
   * Se o saldo de créditos da organização for insuficiente para o custo estimado da mensagem, o envio é bloqueado antes da chamada de API.

---

## 2. Gatekeeping de Horário Comercial e Timezone

* **Fuso Horário:** `America/Sao_Paulo` (horário de Brasília).
* **Janela Padrão de Envio:** 09:00 às 18:00 em dias úteis.
* **Finais de Semana:** Desativados por padrão (`allowSaturday: false`, `allowSunday: false`).
* **Jitter e Espalhamento:** As mensagens enviadas em lote são distribuídas probabilisticamente ao longo do dia para evitar picos artificiais de tráfego.
