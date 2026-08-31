# OPPORTUNITY INTELLIGENCE ENGINE — DOCUMENTAÇÃO TÉCNICA (FASE 6.5)

## 1. Visão Geral
O **Opportunity Intelligence Engine** eleva o *Proactive Lead Engine* além de um simples sistema de prospecção, atuando como um classificador preditivo e determinístico das empresas com maior probabilidade de gerar receita imediata.

---

## 2. Hierarquia Arquitetural
```
COMPANY
   ↓
ICP ENGINE (Score 0-100)
   ↓
CONTACTABILITY ENGINE (Score 0-100, Readiness: READY/NOT_READY)
   ↓
LEAD PRIORITY SCORE (0-100)
   ↓
OPPORTUNITY INTELLIGENCE (Score 0-100)
   ↓
RECOMMENDED ACTION (Com Lead Gatekeeper)
   ↓
RADAR / OUTREACH EXECUTION
```

---

## 3. Composição Matemática do Opportunity Score (0 a 100)

| Componente | Peso Máximo | Critério de Pontuação |
| :--- | :--- | :--- |
| **ICP Fit** | 30 pts | $\frac{\text{icpScore}}{100} \times 30$ |
| **Recência de Abertura** | 15 pts | $\le 3\text{d}: 15\text{p} \mid \le 7\text{d}: 14\text{p} \mid \le 15\text{d}: 12\text{p} \mid \le 30\text{d}: 10\text{p} \mid \le 60\text{d}: 6\text{p} \mid \le 90\text{d}: 3\text{p}$ |
| **Contatabilidade** | 15 pts | $\frac{\text{contactabilityScore}}{100} \times 15$ (WhatsApp verificado, E-mail corporativo) |
| **Localização Prioritária** | 10 pts | Cidade foco: 10 pts; Estado foco: 8 pts; Brasil: 5 pts |
| **Porte da Empresa** | 10 pts | ME / EPP: 10 pts; MEI: 7 pts; Demais: 6 pts |
| **Capital Social** | 5 pts | R$ 10k a 500k: 5 pts; $> 500k$: 4 pts; $< 10k$: 2 pts |
| **Sinais de Oportunidade** | 10 pts | Empresa Ativa + Sócio no QSA: 10 pts; Ativa sem QSA: 7 pts; Inativa: 0 pts |
| **Histórico / Engagement** | 5 pts | Resposta Inbound Relevante: 5 pts; Lead Inédito: 4 pts; Opt-Out: 0 pts |

*Empresas inativas, baixadas ou suprimidas recebem pontuação máxima limitada a 20 pts e recomendação `DO_NOT_CONTACT`.*

---

## 4. Faixas de Prioridade
* `90–100`: **VERY_HIGH**
* `75–89`: **HIGH**
* `60–74`: **MEDIUM**
* `40–59`: **LOW**
* `0–39`: **DISQUALIFIED**

---

## 5. Ações Comerciais Recomendadas
* `CONTACT_NOW`: Score $\ge 75$, Lead `READY`, canal verificado e dentro do horário comercial.
* `CONTACT_TODAY`: Score $\ge 60$, Lead `READY` ou `PARTIALLY_READY`.
* `ENRICH_FIRST`: Score promissor, porém com canais insuficientes (Contatabilidade $< 50$).
* `WAIT`: Aguardando janela de disparo ou intervalo de cadência.
* `DO_NOT_CONTACT`: Lead suprimido (Opt-Out) ou empresa inativa.
* `HUMAN_REVIEW`: Resposta inbound com solicitação de proposta/reunião.
* `REACTIVATE_LATER`: Lead temporariamente frio com data agendada de reativação.

---

## 6. Projeção Financeira e Tamanho de Mercado
* **Estimativa Financeira:**
  $$\text{MRR Estimado} = \text{Ticket Médio} \times (\text{Taxa Conversão Base} \times \text{Multiplicador de Score})$$
* **Funil de 10 Etapas:**
  $$\text{Universo} \rightarrow \text{ICP} \rightarrow \text{Contactable} \rightarrow \text{READY} \rightarrow \text{Opportunity} \rightarrow \text{Contacted} \rightarrow \text{Responded} \rightarrow \text{Interested} \rightarrow \text{Meeting} \rightarrow \text{Converted}$$

---

## 7. Motor de Reativação e Triggers de Eventos
* Suporte a eventos de ciclo de vida: `NEW_COMPANY`, `COMPANY_UPDATED`, `NEW_CONTACT`, `CONTACT_UPDATED`, `LOCATION_CHANGED`, `STATUS_CHANGED`, `CAPITAL_CHANGED`.
* Reavaliação automática com preservação estrita da lista de supressão (LGPD).
