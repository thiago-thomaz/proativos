import { EnrichedContactPayload, EnrichmentResult } from "@/lib/types";

export interface CompanyEnrichmentTarget {
  companyId: string;
  cnpj: string;
  razaoSocial: string;
  municipio: string;
  uf: string;
  telefone?: string | null;
  email?: string | null;
  dataAbertura?: Date | string;
}

export interface EnrichmentProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "DISABLED";
  latencyMs: number;
  lastCheckedAt: Date;
  message?: string;
}

export interface ContactEnrichmentProvider {
  name: string;
  healthCheck(): Promise<EnrichmentProviderHealth>;
  enrichCompany(target: CompanyEnrichmentTarget): Promise<EnrichmentResult>;
  validatePhone(phone: string): Promise<{ isCellPhone: boolean; whatsappStatus: "VERIFIED" | "INVALID" | "LIKELY" }>;
  validateEmail(email: string): Promise<{ isValid: boolean; emailStatus: "VERIFIED" | "INVALID" | "FORMAT_VALID" }>;
}
