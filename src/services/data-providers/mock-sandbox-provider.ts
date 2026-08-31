import {
  CompanySourceProvider,
  DiscoveryQuery,
  ProviderDiscoveryResult,
  ProviderHealth,
  RawCompanyRecord,
} from "./provider-interface";

/**
 * Gerador determinístico de CNPJ válido com cálculo oficial de dígitos verificadores
 */
export function generateValidCnpj(index: number): string {
  const base = String(index).padStart(8, "0") + "0001"; // 12 dígitos
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(base[i]) * weights1[i];
  }
  const mod1 = sum1 % 11;
  const dig1 = mod1 < 2 ? 0 : 11 - mod1;

  const baseWithDig1 = base + String(dig1);
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(baseWithDig1[i]) * weights2[i];
  }
  const mod2 = sum2 % 11;
  const dig2 = mod2 < 2 ? 0 : 11 - mod2;

  return baseWithDig1 + String(dig2);
}

export class MockSandboxProvider implements CompanySourceProvider {
  name = "MOCK_SANDBOX";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    return {
      status: "HEALTHY",
      latencyMs: Date.now() - start + 5,
      lastCheckedAt: new Date(),
      message: "Sandbox provider operacional (100% de disponibilidade local).",
    };
  }

  async discoverCompanies(query: DiscoveryQuery): Promise<ProviderDiscoveryResult> {
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      throw new Error(`[MOCK_SANDBOX] Erro temporário de rede simulado (${this.failureSimulationCount}/${this.shouldFailNext})`);
    }

    const limit = query.limit || 100;
    const startIndex = query.cursor ? parseInt(query.cursor) : 1;
    const records: RawCompanyRecord[] = [];

    const segments = [
      { cnae: "5611201", desc: "Restaurantes e similares", names: ["Cantina", "Pizzaria", "Bistrô", "Churrascaria"] },
      { cnae: "6201501", desc: "Desenvolvimento de programas de computador", names: ["Tech", "Software", "SaaS", "Apps"] },
      { cnae: "4711302", desc: "Comércio varejista de mercadorias", names: ["Mercado", "Empório", "Loja", "Magazine"] },
      { cnae: "8630503", desc: "Atividade médica ambulatorial", names: ["Clínica", "Consultório", "Saúde", "Centro Médico"] },
      { cnae: "4930202", desc: "Transporte rodoviário de carga", names: ["Logística", "Transportes", "Express", "Cargas"] },
    ];

    const cities = [
      { city: "Bauru", uf: "SP" },
      { city: "São Paulo", uf: "SP" },
      { city: "Campinas", uf: "SP" },
      { city: "Rio de Janeiro", uf: "RJ" },
      { city: "Belo Horizonte", uf: "MG" },
      { city: "Curitiba", uf: "PR" },
    ];

    const now = new Date();

    for (let i = 0; i < limit; i++) {
      const idx = startIndex + i;
      const seg = segments[idx % segments.length];
      const loc = cities[idx % cities.length];
      const daysAgo = idx % 28; // Dentro de 28 dias
      const openingDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      records.push({
        cnpj: generateValidCnpj(idx + 1000),
        razaoSocial: `${seg.names[idx % seg.names.length]} Modelo ${idx} Ltda`,
        nomeFantasia: `${seg.names[idx % seg.names.length]} ${loc.city}`,
        dataAbertura: openingDate.toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: `${seg.cnae} - ${seg.desc}`,
        cnaesSecundarios: JSON.stringify(["5611203 - Lanchonetes"]),
        municipio: loc.city,
        uf: loc.uf,
        porte: idx % 3 === 0 ? "MEI" : idx % 3 === 1 ? "ME" : "EPP",
        capitalSocial: 10000 + (idx % 10) * 15000,
        telefone: `11988${String(idx).padStart(6, "0")}`,
        email: `contato@empresa${idx}.com.br`,
        sourceRecordId: `MOCK-${idx}`,
        sourceUpdatedAt: new Date().toISOString(),
      });
    }

    const nextCursor = String(startIndex + limit);

    return {
      records,
      nextCursor,
      hasMore: startIndex + limit < 10000,
      totalEstimated: 10000,
    };
  }

  async getCompanyByCnpj(cnpj: string): Promise<RawCompanyRecord | null> {
    return {
      cnpj,
      razaoSocial: "Empresa Consultada Sob Demanda Ltda",
      dataAbertura: new Date().toISOString().split("T")[0],
      situacao: "ATIVA",
      cnaePrincipal: "5611201 - Restaurantes e similares",
      municipio: "São Paulo",
      uf: "SP",
      porte: "ME",
      capitalSocial: 50000,
      telefone: "11999998888",
      email: "contato@empresa.com.br",
    };
  }
}
