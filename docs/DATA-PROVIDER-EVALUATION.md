# MATRIZ DE AVALIAÇÃO DE PROVEDORES DE DADOS EMPRESARIAIS (BRASIL)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 3 — DATA INGESTION ENGINE  
> **Data:** 31/08/2026  
> **Objetivo:** Avaliar viabilidade técnica, legalidade, SLA, cobertura, periodicidade e custos das fontes de dados para ingestão contínua de novos CNPJs.

---

## 1. Matriz Comparativa de Provedores

| Provider | Cobertura | Atualização | API / Formato | Custo Estimado | Uso Comercial | Telefone | E-mail | CNAE | Data Abertura | Situação Cadastral | Observações & Avaliação de Risco |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Receita Federal (Dados Abertos)** | 100% Brasil (~55M CNPJs) | Mensal (D+15 a D+45) | CSV / ZIP Lote (~5GB comp.) | Gratuito (Gov) | **Permitido** (LAI / Open Data) | Sim (DBE) | Sim (DBE) | Sim (Prim/Sec) | Sim | Sim | Fonte primária oficial. Excelente para carga inicial `FULL` e baseline histórica. Latência alta para prospecção no mesmo dia. |
| **BrasilAPI / Minha Receita** | 100% Brasil | Mensal (Espelho Gov) | REST JSON | Gratuito (Open Source) | **Permitido** (MIT) | Sim | Sim | Sim | Sim | Sim | Excelente para desenvolvimento e enriquecimento pontual `ON_DEMAND`. Sem SLA formal para pipelines de produção crítica. |
| **CNPJ.ws** | 100% Brasil | Semanal / Contínua | REST JSON + Search API | R$ 49 a R$ 499 / mês | **Permitido** (Termos B2B) | Sim | Sim | Sim | Sim | Sim | Excelente relação custo-benefício. Permite buscas filtradas por data e UF na API. |
| **ReceitaWS** | 100% Brasil | Diária / Sob Demanda | REST JSON | R$ 0,02 a R$ 0,05 / consulta | **Permitido** | Sim | Sim | Sim | Sim | Sim | Focado em consulta direta unitária por CNPJ. Não possui endpoint nativo de descoberta em lote por data de abertura. |
| **BigDataCorp / Assertiva** | 100% Brasil + Juntas Comerciais | Diária (D+1) | REST JSON / Webhooks | Corporativo (> R$ 1.500/mês) | **Permitido** (LGPD B2B) | Sim (Enriquecido) | Sim (Enriquecido) | Sim | Sim | Sim | Provedor de alta performance e baixa latência (novas empresas em D+1). Ideal para fase de escala de produção com contrato comercial. |
| **Mock / Sandbox Provider (Nativo Engine)** | Parametrizável (Lotes 100 a 10.000) | Instantâneo / Determinístico | Adapter TypeScript Nativo | R$ 0,00 | **Total** | Sim | Sim | Sim | Sim | Sim | Provedor canônico do sistema para testes de carga, simulação de lotes, validação de checkpoints, retry e auditoria sem custos de API. |

---

## 2. Critérios de Conformidade Legal & LGPD (Dados B2B)

1. **Dados de Pessoa Jurídica (CNPJ, Razão Social, CNAE, Endereço Comercial):** São dados públicos empresariais protegidos pelo princípio da publicidade dos atos constitutivos (Art. 5º, XXXIII da CF/88 e Lei 12.527/2011).
2. **Telefone e E-mail Institucionais:** Podem ser tratados sob a base legal do **Legítimo Interesse** (Art. 7º, IX da LGPD) e **Execução de Contrato/Diligências Pré-Contratuais** para fins estritamente B2B (oferta de serviços relevantes ao novo estabelecimento).
3. **Não Coleta de Dados Sensíveis:** O Ingestion Engine não armazena CPF de sócios, score de crédito pessoal, patrimônio de pessoas físicas ou qualquer dado sensível (Art. 5º, II da LGPD).
4. **Mecanismo de Opt-Out:** Toda comunicação e lead gerado preserva o link universal de `opt-out` já validado na Fase 1.

---

## 3. Arquitetura de Adapters Proposta (`CompanySourceProvider`)

```text
                  +-----------------------------------+
                  |       CompanySourceProvider       | (Interface Abstrata)
                  +-----------------------------------+
                  | + discoverCompanies(query)        |
                  | + getIncrementalData(checkpoint)  |
                  | + getCompany(cnpj)                |
                  | + healthCheck()                   |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
+-----------v-----------+                       +-----------v-----------+
|  PublicDatasetAdapter |                       |   MockSandboxAdapter  |
| (Receita / BrasilAPI) |                       | (Carga, Testes & Dev) |
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                        +-----------v-----------+
                        |  CommercialApiAdapter |
                        | (CNPJ.ws / BigData)   |
                        +-----------------------+
```

---

## 4. Estratégia de Ingestão por Fases

1. **Desenvolvimento e Testes (Fase 3):**
   * Implementação do `MockSandboxAdapter` e `PublicDatasetAdapter` para suportar cargas `FULL`, `INCREMENTAL` e `ON_DEMAND` com persistência de checkpoints e deduplicação estrita.
2. **Homologação e Sandbox do Cliente:**
   * Ingestão de lotes de 100 a 10.000 registros via API protegida e upload de CSV.
3. **Produção (Fases Futuras):**
   * Configuração de credenciais do provider comercial escolhido via variáveis de ambiente seguras sem alteração na lógica do core engine.
