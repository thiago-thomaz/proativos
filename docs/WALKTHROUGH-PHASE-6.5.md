# WALKTHROUGH — FASE 6.5: OPPORTUNITY INTELLIGENCE

## 1. Resumo Executivo
A **FASE 6.5 — OPPORTUNITY INTELLIGENCE** foi concluída com **100% de sucesso**. O sistema agora calcula determinísticamente o **Opportunity Score (0–100)**, classifica prioridades (`VERY_HIGH`, `HIGH`, `MEDIUM`, `LOW`, `DISQUALIFIED`), recomenda a próxima ação comercial (`CONTACT_NOW`, `CONTACT_TODAY`, `ENRICH_FIRST`, `WAIT`, `DO_NOT_CONTACT`, `HUMAN_REVIEW`, `REACTIVATE_LATER`) respeitando estritamente o Lead Gatekeeper, projeta receita e MRR e disponibiliza o **Radar de Oportunidades** em `/opportunities`.

---

## 2. Arquitetura Implementada
```
COMPANY
   ↓
ICP ENGINE (0-100)
   ↓
CONTACTABILITY (0-100, READY / NOT_READY)
   ↓
LEAD PRIORITY SCORE (0-100)
   ↓
OPPORTUNITY INTELLIGENCE (Score 0-100)
   ↓
RECOMMENDED ACTION (Com Gatekeeper & Compliance)
   ↓
RADAR DE OPORTUNIDADES / OUTREACH DISPATCHER
```

---

## 3. Opportunity Score (Fórmula e Pesos)
* **ICP Fit (0–30 pts):** $\frac{\text{icpScore}}{100} \times 30$
* **Recência (0–15 pts):** $\le 3\text{d}: 15\text{p} \mid \le 7\text{d}: 14\text{p} \mid \le 15\text{d}: 12\text{p} \mid \le 30\text{d}: 10\text{p} \mid \le 60\text{d}: 6\text{p} \mid \le 90\text{d}: 3\text{p} \mid > 90\text{d}: 1\text{p}$
* **Contatabilidade (0–15 pts):** Baseado em WhatsApp verificado, e-mail corporativo e telefone cadastral.
* **Localização (0–10 pts):** Cidade/UF prioritária da campanha.
* **Porte (0–10 pts):** ME/EPP (10p), MEI (7p), Demais (6p).
* **Capital Social (0–5 pts):** R$ 10k a 500k (5p).
* **Sinais / Timing (0–10 pts):** Empresa ativa + Sócio administrador no QSA (10p).
* **Histórico / Engagement (0–5 pts):** Resposta Inbound relevante (5p) ou oportunidade inédita (5p).

---

## 4. Radar de Oportunidades (`/opportunities`)
* Tela interativa com KPIs ao vivo (Total, Very High, High, Ready, WhatsApp verificado, E-mails válidos e Potencial MRR).
* Filtros rápidos por prioridade, ação recomendada e busca global de empresas/CNPJs.
* Cards visuais detalhados com badges pulsantes para `CONTACT_NOW`.

---

## 5. Market Size & Funnel
* Métricas e taxas de conversão de 10 etapas:
  Universo $\rightarrow$ ICP $\rightarrow$ Contactable $\rightarrow$ READY $\rightarrow$ Opportunity $\rightarrow$ Contacted $\rightarrow$ Responded $\rightarrow$ Interested $\rightarrow$ Meeting $\rightarrow$ Converted.

---

## 6. Potencial Financeiro
* Cálculo determinístico de projeção comercial baseado em Ticket Médio e Taxa de Conversão por periodicidade (`MONTHLY`, `ANNUAL`, `ONE_TIME`).

---

## 7. Campaign Simulator 2.0
* Endpoint `POST /api/v1/opportunities/simulate` simulando volume de leads, canais, mensagens estimadas, custos e projeção de MRR sem efeitos colaterais.

---

## 8. Motor de Reativação
* Reprocessamento de leads em `NOT_NOW` e `NOT_INTERESTED` após atingida a data `reactivationAt`, com reavaliação de elegibilidade e respeito ao Opt-Out.

---

## 9. Event Triggers
* Processador extensível de eventos (`NEW_COMPANY`, `COMPANY_UPDATED`, `NEW_CONTACT`, `CONTACT_UPDATED`, `LOCATION_CHANGED`, `STATUS_CHANGED`, `CAPITAL_CHANGED`).

---

## 10. Autopilot
* Suporte arquitetural aos modos `OFF`, `SHADOW`, `CONTROLLED`, `LIVE` com ativação estritamente manual e controlada por tenant.

---

## 11. APIs Protegidas (8 Endpoints)
1. `GET /api/v1/opportunities`
2. `GET /api/v1/opportunities/[id]`
3. `POST /api/v1/opportunities/calculate`
4. `POST /api/v1/opportunities/recalculate`
5. `GET /api/v1/opportunities/radar`
6. `GET /api/v1/opportunities/market-size`
7. `POST /api/v1/opportunities/simulate`
8. `GET /api/v1/opportunities/recommendations`

---

## 12. Workflows n8n
* `n8n/workflows/12-opportunity-radar.json`
* `n8n/workflows/13-opportunity-recalculation.json`
* `n8n/workflows/14-market-size-refresh.json`
* `n8n/workflows/15-reactivation-check.json`

---

## 13. Segurança e LGPD
* Isolamento total multi-tenant por `organizationId`.
* Supressão inegociável de contatos suprimidos (Opt-Out).
* Respeito absoluto ao Lead Gatekeeper (nenhum lead suprimido recebe `CONTACT_NOW`).

---

## 14. Arquivos Criados/Alterados
* `prisma/schema.prisma`
* `src/lib/types.ts`
* `src/services/opportunity-intelligence.ts`
* `src/app/api/v1/opportunities/route.ts`
* `src/app/api/v1/opportunities/[id]/route.ts`
* `src/app/api/v1/opportunities/calculate/route.ts`
* `src/app/api/v1/opportunities/recalculate/route.ts`
* `src/app/api/v1/opportunities/radar/route.ts`
* `src/app/api/v1/opportunities/market-size/route.ts`
* `src/app/api/v1/opportunities/simulate/route.ts`
* `src/app/api/v1/opportunities/recommendations/route.ts`
* `src/app/(dashboard)/opportunities/page.tsx`
* `src/app/(dashboard)/opportunities/[id]/page.tsx`
* `src/components/layout/sidebar.tsx`
* `docs/OPPORTUNITY-INTELLIGENCE.md`
* `n8n/workflows/*.json`
* `test-opportunity-intelligence.ts`

---

## 15. Resultados dos Testes Automatizados (170/170 PASS)
```
======================================================
FASE 1 (Foundation):                     9/9   PASS
FASE 1 (Opening Date Filter):           10/10  PASS
FASE 2 (ICP Engine):                    18/18  PASS
FASE 3 (Data Ingestion Engine):         18/18  PASS
FASE 4 (Contact & Enrichment Engine):   20/20  PASS
FASE 5 (Outreach Engine):               30/30  PASS
FASE 6 (Production & n8n Engine):       35/35  PASS
FASE 6.5 (Opportunity Intelligence):    30/30  PASS
======================================================
TOTAL DE TESTES AUTOMATIZADOS:         170/170 PASS (100%)
======================================================
```

---

## 16. Build de Produção
* **57 rotas compiladas no Next.js (0 erros, 0 warnings).**

---

## 17. Bugs Encontrados & 18. Correções
* Ajustado tipo de comparação em guard do TypeScript em `determineRecommendedAction`.
* Unificado cálculo de contatabilidade utilizando `calculateContactabilityScore` de `contactability.ts`.

---

## 19. Riscos Restantes
* Nenhum risco interno identificado. Todos os 170 testes passam com 100% de integridade e build limpo.

---

## 20. Status Final
**PASS**
