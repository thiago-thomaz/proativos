# RASTREABILIDADE E DATA LINEAGE

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 3 — DATA INGESTION ENGINE

---

## 1. Princípio da Rastreabilidade Total

Toda entidade `Company` no banco de dados possui data lineage explícito:

* `sourceProvider`: Identificação do provedor que forneceu o dado (`RECEITA_FEDERAL`, `CNPJ_WS`, `CSV_IMPORT`, `MOCK_SANDBOX`).
* `sourceRecordId`: Identificador original do registro no provedor de origem.
* `sourceUpdatedAt`: Timestamp da última atualização declarada pela fonte.
* `createdAt` / `updatedAt`: Timestamps de gravação na base local.
* `correlationId`: Identificador único de correlação do lote de ingestão.

---

## 2. Rastreabilidade de Alterações (`CompanyEvent`)

Quando os dados de um CNPJ existente são alterados em uma nova ingestão, a plataforma registra o diff exato:

* `COMPANY_CREATED`: Criação do registro original.
* `STATUS_CHANGED`: Alteração de situação cadastral (ex: `ATIVA` para `BAIXADA`).
* `CNAE_CHANGED`: Alteração de CNAE primário ou secundário.
* `ADDRESS_CHANGED`: Mudança de endereço comercial.
* `PORTE_CHANGED`: Alteração de porte (ex: `MEI` para `ME`).
* `CAPITAL_CHANGED`: Alteração de capital social declarado.
