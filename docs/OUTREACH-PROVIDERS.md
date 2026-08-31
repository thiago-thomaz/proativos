# MATRIZ DE AVALIAÇÃO DE PROVEDORES DE OUTREACH (EMAIL & WHATSAPP)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 5 — OUTREACH ENGINE  
> **Data:** 31/08/2026  
> **Objetivo:** Avaliar canais de comunicação B2B (E-mail e WhatsApp), rastreabilidade de entrega, webhooks de inbound, custos, termos de uso e conformidade anti-spam/LGPD.

---

## 1. Matriz Comparativa de Provedores de E-mail

| Provedor | Tipo / API | Tracking (Open/Click) | Inbound Webhook | Taxa de Entrega / Reputação | Custo Estimado | Conformidade & Termos |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Resend** | REST API Moderna | **Sim (Nativo)** | **Sim (MX Inbound)** | Excelente (SPF/DKIM/DMARC) | Grátis até 3k/mês; $20 / 50k | Total conformidade para B2B e transacional. Bloqueia spam não segmentado. |
| **Amazon SES** | REST / SMTP | Sim (via SNS/S3) | Sim (via S3/Lambda) | Alta (Requer Warm-up) | $0,10 / 1.000 e-mails | Exige manutenção de bounce rate < 5% e spam complaint < 0,1%. |
| **Postmark** | REST / SMTP | Sim | Sim (Inbound Parse) | Premium (Foco transacional) | $15 / 10.000 e-mails | Extremamente rigoroso contra spam. |
| **Mock Email Provider (Nativo)** | Adapter TypeScript | Sim (Simulado) | Sim (Eventos de teste) | 100% controlado | R$ 0,00 | Ideal para testes determinísticos de cadência, renderização e simulação sem disparos reais. |

---

## 2. Matriz Comparativa de Provedores de WhatsApp

| Provedor | Tipo / Protocolo | Templates Obrigatórios | Inbound Webhook | Risco de Bloqueio | Custo Estimado | Conformidade & Termos |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Meta WhatsApp Cloud API (Oficial)** | Graph REST API | **Sim (Aprovação Meta)** | **Sim (Oficial 24h)** | **Zero (Canal Oficial)** | ~$0,06 / conversa de marketing no Brasil | Conformidade total com os Termos de Serviço da Meta. Exige opt-out claro. |
| **Z-API / Zenvia / Twilio (BSPs)** | REST Gateway BSP | Sim (para Cloud) | Sim | Muito Baixo | R$ 0,08 a R$ 0,15 / msg | Provedores de solução oficial homologados. |
| **Evolution API / Waha** | Gateway REST | Não (Mensagem livre) | Sim | Médio/Alto se abusivo | Infraestrutura própria | Exige moderação estrita, rate limiting, horário comercial e opt-out instantâneo. |
| **Mock WhatsApp Provider (Nativo)** | Adapter TypeScript | Simulado | Simulado | **Zero** | R$ 0,00 | Emulador determinístico de envio, entrega (`DELIVERED`), leitura (`OPENED`) e resposta (`REPLIED`). |

---

## 3. Diretrizes de Segurança, Anti-Spam e LGPD no Outreach

1. **Gatekeeping de Elegibilidade (`Lead Gate`):**
   * Nenhum e-mail ou mensagem de WhatsApp é disparado sem prévia aprovação de 8 critérios: Lead qualificado pelo ICP, Contatabilidade $\ge$ threshold, Verificação de canal, ausência de Opt-Out na `SuppressionList`, Campanha em modo `LIVE`, Horário comercial válido (`America/Sao_Paulo`), Limite diário não atingido e Intervalo mínimo de frequência entre contatos.
2. **Opt-Out Universal Imediato:**
   * Qualquer resposta contendo intenção de recusa ("não quero", "sair", "pare", "unsubscribe") aciona o cancelamento instantâneo da cadência e inclusão imediata na `SuppressionList`.
3. **Respeito aos Horários Comerciais e Timezone:**
   * Envio restrito à janela comercial padrão (09:00 às 18:00 no fuso `America/Sao_Paulo`), com bloqueio por padrão aos finais de semana e feriados.
