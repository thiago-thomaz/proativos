# ARQUITETURA DE CONTATOS E ENRIQUECIMENTO

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 4 — CONTACT & ENRICHMENT ENGINE

---

## 1. Visão Geral da Arquitetura

O módulo de contatos desacopla completamente os dados da empresa (`Company`) dos múltiplos canais de comunicação (`Contact`).

```text
+------------------------------------+
|               Company              |
+-----------------+------------------+
                  | (1 : N)
                  v
+-----------------+------------------+
|               Contact              |
|  - tipo: DECISION_MAKER / COMPANY  |
|  - whatsappStatus: VERIFIED        |
|  - emailStatus: FORMAT_VALID       |
|  - confidenceScore: 0 - 100        |
|  - nameSource / roleSource         |
|  - phoneSource / emailSource       |
+-----------------+------------------+
                  |
                  v
+-----------------+------------------+
|     Contactability Engine          |
|  - Score: 0 a 100                  |
|  - Readiness: READY / NOT_READY    |
|  - Priority: 60% ICP + 40% Contat. |
+------------------------------------+
```

---

## 2. Estratégia de Enriquecimento de Custo Eficiente (`ENRICH_ON_LEAD`)

Para maximizar a eficiência orçamentária:
1. **Fase de Ingestão:** Apenas os dados cadastrais públicos do DBE são capturados.
2. **Fase de ICP Engine:** Avalia se a empresa atende aos critérios da campanha (`Score >= minScore`).
3. **Fase de Enriquecimento:** Somente as empresas que se tornaram **Leads qualificados** recebem enriquecimento de QSA, WhatsApp e validação de canais.
