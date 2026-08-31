# PUBLIC API — GUIA DE INTEGRAÇÃO VERSIONADA (/api/public/v1)

## 1. Autenticação
Todas as requisições para a API pública devem conter uma API Key no formato:
`Authorization: Bearer ple_live_...` ou header `x-api-key: ple_live_...`.

## 2. Endpoints Disponíveis
* `GET /api/public/v1/opportunities`: Lista oportunidades filtradas por score.
* `GET /api/public/v1/leads`: Lista leads qualificados.
* `GET /api/public/v1/campaigns`: Lista campanhas ativas.
* `POST /api/public/v1/campaigns`: Cria uma nova campanha programaticamente.
* `GET /api/public/v1/credits`: Consulta saldo de créditos disponível.
* `POST /api/public/v1/enrichment`: Executa enriquecimento de contatos.
* `POST /api/public/v1/outreach/preview`: Simula elegibilidade de disparo.
