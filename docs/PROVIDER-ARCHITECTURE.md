# ARQUITETURA DE PROVEDORES DE DADOS (PROVIDER ARCHITECTURE)

> **Projeto:** Proactive Lead Engine  
> **Fase:** FASE 3 — DATA INGESTION ENGINE

---

## 1. Interface Canônica `CompanySourceProvider`

Para evitar acoplamento do sistema a qualquer fornecedor específico, todas as integrações devem implementar a interface:

```typescript
export interface CompanySourceProvider {
  name: string;
  healthCheck(): Promise<ProviderHealth>;
  discoverCompanies(query: DiscoveryQuery): Promise<ProviderDiscoveryResult>;
  getCompanyByCnpj(cnpj: string): Promise<RawCompanyRecord | null>;
}
```

---

## 2. Adapters Disponíveis

1. **`MockSandboxProvider` (`src/services/data-providers/mock-sandbox-provider.ts`):**
   * Gera empresas brasileiras com CNPJs válidos matematicamente.
   * Suporta simulação de falhas de rede para teste de retries com backoff.
   * Paginação por cursor.
2. **`PublicDatasetAdapter`:**
   * Conector para espelhos e arquivos da Receita Federal / BrasilAPI.
3. **`CommercialApiAdapter` (Próximas Fases):**
   * Conector para provedores pagos em tempo real (CNPJ.ws, BigDataCorp, Assertiva).
