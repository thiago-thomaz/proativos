export interface RawCompanyRecord {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  dataAbertura: string | Date;
  situacao?: string | null;
  dataSituacao?: string | Date | null;
  naturezaJuridica?: string | null;
  porte?: string | null;
  capitalSocial?: number | null;
  cnaePrincipal: string;
  cnaesSecundarios?: string[] | string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio: string;
  uf: string;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  sourceRecordId?: string;
  sourceUpdatedAt?: string | Date;
  rawData?: any;
}

export interface DiscoveryQuery {
  mode?: "FULL" | "INCREMENTAL" | "ON_DEMAND";
  sinceDate?: Date | string;
  fromDate?: Date | string;
  toDate?: Date | string;
  limit?: number;
  cursor?: string;
  page?: number;
  uf?: string;
  cnae?: string;
}

export interface ProviderDiscoveryResult {
  records: RawCompanyRecord[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalEstimated?: number;
}

export interface ProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "DISABLED";
  latencyMs: number;
  lastCheckedAt: Date;
  message?: string;
}

export interface CompanySourceProvider {
  name: string;
  healthCheck(): Promise<ProviderHealth>;
  discoverCompanies(query: DiscoveryQuery): Promise<ProviderDiscoveryResult>;
  getCompanyByCnpj(cnpj: string): Promise<RawCompanyRecord | null>;
}
