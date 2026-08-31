# MATRIZ DE AVALIAÇÃO DE PROVEDORES DE ENRIQUECIMENTO E CONTATOS (BRASIL)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 4 — CONTACT & ENRICHMENT ENGINE  
> **Data:** 31/08/2026  
> **Objetivo:** Avaliar viabilidade técnica, legalidade, cobertura, verificação de canais (Telefone, WhatsApp, E-mail, QSA/Decisor) e custos de provedores de enriquecimento B2B no Brasil.

---

## 1. Matriz Comparativa de Provedores de Enriquecimento

| Provider | Telefone | WhatsApp | E-mail | Decisor (QSA) | Cargo | Atualização | API / Formato | Custo Estimado | Uso Comercial | Observações & Avaliação de Risco |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **Receita Federal (QSA Oficial)** | Não (Apenas DBE) | Não | Não (Apenas DBE) | **Sim (100% oficial)** | Sim (Sócio-Adm, Diretor) | Mensal | CSV / Dados Abertos | Gratuito | **Permitido** | Fonte primária jurídica para identificar Sócios-Administradores e Diretores registrados na Junta Comercial. Base de verdade institucional. |
| **BrasilAPI / Minha Receita** | Sim (Cadastral) | Não | Sim (Cadastral) | **Sim (QSA)** | Sim | Mensal | REST JSON | Gratuito | **Permitido** | Excelente para extração automatizada de QSA público e dados cadastrais sem custo. Não valida atividade de WhatsApp. |
| **CNPJ.ws (Enriquecimento B2B)** | Sim | Não | Sim | **Sim (QSA)** | Sim | Contínua | REST JSON | R$ 0,01 a R$ 0,03 / consulta | **Permitido** | Rápido, retorna sócios e dados cadastrais formatados. Ideal para primeira camada de enriquecimento. |
| **Assertiva / BigDataCorp** | **Sim (Operadora)** | **Sim (Verificado)** | **Sim (Validado)** | **Sim (Decisores)** | Sim (Executivos) | Diária / D+1 | REST JSON / Batch | R$ 0,10 a R$ 0,35 / enriquecimento | **Permitido (LGPD B2B)** | Provedor de alta precisão para validação de WhatsApp ativo em operadoras e e-mails verificados via SMTP/MX. |
| **Mock Sandbox Provider (Nativo Engine)** | Sim | Sim (Simulado) | Sim | Sim | Sim | Instantâneo | Adapter TypeScript | R$ 0,00 | **Total** | Provedor determinístico canônico para testes de cálculo de Contactability Score, Lead Readiness, Field Provenance e Supressão. |

---

## 2. Princípios de Distinção Rigorosa de Contatos

1. **`COMPANY_PHONE` / `COMPANY_EMAIL`:** Dados públicos do estabelecimento cadastrados no CNPJ/DBE. Não devem ser rotulados como decisores sem evidência.
2. **`DECISION_MAKER`:** Contato com evidência factual comprovada (ex: Sócio-Administrador no QSA da Receita Federal ou Diretor com cargo formalizado).
3. **`INSTITUTIONAL_CONTACT`:** E-mails genéricos de departamentos (`contato@`, `vendas@`, `financeiro@`, `sac@`).
4. **`UNKNOWN`:** Contatos capturados sem classificação de cargo ou evidência de decisor.

---

## 3. Estados de Verificação dos Canais

* **WhatsApp:**
  * `UNKNOWN`: Telefone cadastrado, status de WhatsApp ainda não consultado.
  * `LIKELY`: Número de celular brasileiro com DDD e 9 dígitos (potencial WhatsApp).
  * `VERIFIED`: Confirmado ativamente via API de validação do provider.
  * `INVALID`: Não possui conta ativa de WhatsApp.
  * `SUPPRESSED`: Número presente na `SuppressionList` (Opt-Out).
* **E-mail:**
  * `UNKNOWN`: Não verificado.
  * `FORMAT_VALID`: Estrutura sintática de e-mail válida (RFC 5322).
  * `VERIFIED`: Caixa postal e MX confirmados pelo provider.
  * `INVALID`: Caixa postal inexistente ou bounce reportado.
  * `SUPPRESSED`: E-mail presente na `SuppressionList`.

---

## 4. Arquitetura de Contactability & Lead Readiness

A plataforma manterá dois scores desacoplados para evitar distorções comerciais:

$$\text{ICP Score (Aderência do Perfil)} \quad \times \quad \text{Contactability Score (Qualidade dos Canais)}$$

* **Contactability Score (0 a 100):**
  * Telefone empresarial verificado: +20 pts
  * Celular / WhatsApp verificado: +30 pts (ou LIKELY: +15 pts)
  * E-mail institucional / corporativo: +20 pts
  * Decisor identificado no QSA com nome e cargo: +25 pts
  * Recência do dado (< 30 dias): +5 pts
* **Lead Readiness Classification:**
  * **`READY`:** Contactability $\ge 70$ e Decisor ou WhatsApp identificado.
  * **`PARTIALLY_READY`:** Contactability entre $40$ e $69$ (Possui ao menos 1 canal institucional).
  * **`NOT_READY`:** Contactability $< 40$ (Necessita enriquecimento adicional antes do outreach).
