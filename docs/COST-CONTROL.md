# CONTROLE DE CUSTOS & SALDO DE CRÉDITOS (COST CONTROL)

Diretrizes de proteção financeira e controle orçamentário.

---

## 1. Operação de Créditos em Duas Fases

Para evitar cobranças indevidas caso um provedor externo falhe durante o processamento:

```
[Estimativa de Custo] ---> [Reserva de Saldo (Lock)] ---> [Execução do Provider]
                                                                  │
                                   ┌──────────────────────────────┴──────────────────────────────┐
                                   ▼                                                             ▼
                        [Sucesso: Commit Reserva]                                     [Falha: Reembolso Imediato]
```

---

## 2. Matriz de Custos Estimados (Exemplo Configurável)
* **Company Discovery:** R$ 0,00 / 0 créditos (Fontes abertas).
* **Email Enrichment:** R$ 0,02 / 1 crédito por consulta.
* **Phone Enrichment:** R$ 0,05 / 1 crédito por consulta.
* **WhatsApp Verification:** R$ 0,01 / 1 crédito por checagem.
* **Disparo E-mail Transacional:** R$ 0,01 / 1 crédito.
* **Disparo WhatsApp:** R$ 0,05 / 1 crédito.
