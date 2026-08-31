# POLÍTICA DE PRIVACIDADE E CONFORMIDADE DE DADOS DE CONTATO (LGPD)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 4 — CONTACT & ENRICHMENT ENGINE  
> **Data:** 31/08/2026

---

## 1. Princípios Fundamentais

O **Proactive Lead Engine** adota práticas de *Privacy by Design* e estrita observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD):

1. **Minimização de Dados (Art. 6º, III):**
   * A plataforma coleta e armazena estritamente dados de contatos comerciais necessários para prospecção B2B (Nome, Cargo, Telefone Corporativo, E-mail Corporativo).
   * **Não são coletados:** CPF de sócios, endereço residencial, dados bancários de pessoas físicas, dados sensíveis (origem racial, convicção religiosa, saúde ou filiação partidária).

2. **Base Legal para Tratamento B2B (Art. 7º, IX da LGPD):**
   * O tratamento de contatos de decisores em contexto estritamente comercial fundamenta-se no **Legítimo Interesse** do controlador para oferta de soluções correlatas à atividade econômica da pessoa jurídica recém-aberta, com prévia avaliação de razoabilidade e salvaguardas.

3. **Direito de Opt-Out Universal e Imediato (Art. 18):**
   * Qualquer contato pode solicitar a supressão de suas comunicações através do link de descadastro ou endpoint `POST /api/v1/compliance/opt-out`.
   * Uma vez solicitada, a informação é gravada na `SuppressionList` e o status de todos os canais vinculados é alterado para `SUPPRESSED`, bloqueando permanentemente qualquer tentativa de contato.

4. **Field-Level Provenance & Rastreabilidade:**
   * Cada campo de contato (`nameSource`, `roleSource`, `emailSource`, `phoneSource`) possui registro imutável do provedor e data de captura para auditoria de conformidade.
