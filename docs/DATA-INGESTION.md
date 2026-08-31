# GUIA DE INGESTÃO DE DADOS — DATA INGESTION ENGINE

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 3 — DATA INGESTION ENGINE  
> **Data:** 31/08/2026

---

## 1. Visão Geral do Pipeline

O **Data Ingestion Engine** é o subsistema responsável por coletar, normalizar, validar, deduplicar e gravar novos CNPJs abertos no Brasil, acionando automaticamente a avaliação do **ICP Engine** para gerar leads qualificados em tempo real.

```text
+-----------------------+
|  Fonte de Dados / API |
+-----------+-----------+
            | (Lote de CNPJs brutos)
            v
+-----------------------+
|   Normalizer Service  | -> CNPJ 14 dígitos, Telefone (E.164), E-mail, Status, CNAE
+-----------+-----------+
            |
            v
+-----------------------+
|   Validator Service   | -> Valida dígitos verificadores, datas, UF, Município
+-----------+-----------+
            |
            v
+-----------------------+
|  Deduplicator Service | -> Verifica existência de CNPJ no banco de dados
+-----+-----------+-----+
      |           |
 (Novo)      (Existente)
      |           |
      v           v
+-----------+   +-------------------+
| Criar     |   | Detectar Diffs    |
| Company   |   | e CompanyEvents   |
+-----+-----+   +---------+---------+
      |                   |
      +---------+---------+
                |
                v
+-----------------------+
| ICP Matching Engine   | -> Avalia contra campanhas ativas
+-----------+-----------+
            | (Score >= Threshold)
            v
+-----------------------+
| Criar Lead Único      | -> (org_id + campaign_id + company_id)
+-----------------------+
```

---

## 2. Modos de Ingestão Suportados

1. **`FULL`:** Carga histórica completa de bases públicas.
2. **`INCREMENTAL`:** Ingestão periódica de empresas abertas ou atualizadas desde o último `checkpoint` (`lastSuccessfulSync`).
3. **`ON_DEMAND`:** Consulta pontual de um CNPJ individual solicitada via API ou usuário.

---

## 3. Endpoints da API

* `POST /api/v1/companies/ingest`: Ingestão direta de lotes com suporte a `dryRun`, `checkpoint` e `correlationId`.
* `GET /api/v1/admin/data-engine`: Métricas operacionais e histórico de jobs.
* `POST /api/v1/admin/data-engine`: Disparo manual de jobs de ingestão pelo Super Admin.
