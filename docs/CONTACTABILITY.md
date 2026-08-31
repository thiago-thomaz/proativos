# GUIA DO MOTOR DE CONTATABILIDADE E LEAD READINESS

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 4 — CONTACT & ENRICHMENT ENGINE

---

## 1. Definição do Contactability Score (0 a 100)

O **Contactability Score** quantifica a probabilidade de estabelecer contato efetivo com uma empresa recém-aberta através de canais validados.

| Critério | Pontuação Máxima | Condição de Atribuição |
| :--- | :---: | :--- |
| **Decisor Identificado (QSA)** | +25 pts | Sócio-Administrador, Diretor ou Presidente comprovado no QSA oficial. |
| **WhatsApp Verificado** | +30 pts | Linha móvel confirmada como conta ativa de WhatsApp (+15 se LIKELY). |
| **Telefone Cadastral** | +20 pts | Linha telefônica com formato canônico válido e não suprimida. |
| **E-mail Corporativo** | +20 pts | E-mail com sintaxe RFC 5322 válida (+25 se validado via MX/SMTP). |
| **Alta Confiança / Recência** | +5 pts | Dados capturados de fontes de alta integridade há menos de 30 dias. |

---

## 2. Classificação de Lead Readiness

* **`READY`:** Contactability $\ge 70$ e possui WhatsApp confirmado ou Decisor identificado no QSA. Apto para disparo de campanhas.
* **`PARTIALLY_READY`:** Contactability entre $40$ e $69$. Possui ao menos um canal institucional válido.
* **`NOT_READY`:** Contactability $< 40$. Nenhum canal confiável identificado; exige enriquecimento manual ou reprocessamento.

---

## 3. Lead Priority Score

$$\text{Lead Priority Score} = \text{round}(0.60 \times \text{ICP Score} + 0.40 \times \text{Contactability Score})$$

Permite ordenar a fila de atendimento priorizando empresas que atendem perfeitamente ao ICP **E** possuem canais diretos com decisores.
