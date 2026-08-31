import {
  ContactEnrichmentProvider,
  CompanyEnrichmentTarget,
  EnrichmentProviderHealth,
} from "./provider-interface";
import { EnrichmentResult, EnrichedContactPayload } from "@/lib/types";

export class MockEnrichmentProvider implements ContactEnrichmentProvider {
  name = "MOCK_ENRICHMENT_PROVIDER";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async healthCheck(): Promise<EnrichmentProviderHealth> {
    const start = Date.now();
    return {
      status: "HEALTHY",
      latencyMs: Date.now() - start + 8,
      lastCheckedAt: new Date(),
      message: "Provedor de enriquecimento operacional (Sandbox Local).",
    };
  }

  async validatePhone(phone: string): Promise<{ isCellPhone: boolean; whatsappStatus: "VERIFIED" | "INVALID" | "LIKELY" }> {
    const clean = phone.replace(/\D/g, "");
    const isCell = clean.length === 11 && clean[2] === "9";
    return {
      isCellPhone: isCell,
      whatsappStatus: isCell ? "VERIFIED" : "INVALID",
    };
  }

  async validateEmail(email: string): Promise<{ isValid: boolean; emailStatus: "VERIFIED" | "INVALID" | "FORMAT_VALID" }> {
    const isCorp = !email.includes("gmail") && !email.includes("hotmail") && email.includes("@");
    return {
      isValid: true,
      emailStatus: isCorp ? "VERIFIED" : "FORMAT_VALID",
    };
  }

  async enrichCompany(target: CompanyEnrichmentTarget): Promise<EnrichmentResult> {
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      throw new Error(`[MOCK_ENRICHMENT] Erro temporário de rede simulado (${this.failureSimulationCount}/${this.shouldFailNext})`);
    }

    const contacts: EnrichedContactPayload[] = [];
    const fieldsFound: string[] = [];

    // 1. Contato Institucional / Telefone Cadastral
    if (target.telefone) {
      contacts.push({
        nome: `${target.razaoSocial} (Sede)`,
        cargo: "Central Telefônica / Atendimento",
        tipo: "COMPANY_PHONE",
        telefone: target.telefone,
        phoneStatus: "FORMAT_VALID",
        whatsappStatus: "UNKNOWN",
        confidenceScore: 65,
        sourceProvider: "RECEITA_FEDERAL_DBE",
        phoneSource: "RECEITA_FEDERAL_DBE",
      });
      fieldsFound.push("TELEFONE_CADASTRAL");
    }

    // 2. E-mail Institucional
    if (target.email) {
      contacts.push({
        nome: "Departamento Administrativo",
        cargo: "Contato Institucional",
        tipo: "INSTITUTIONAL_CONTACT",
        email: target.email,
        emailStatus: "FORMAT_VALID",
        confidenceScore: 70,
        sourceProvider: "RECEITA_FEDERAL_DBE",
        emailSource: "RECEITA_FEDERAL_DBE",
      });
      fieldsFound.push("EMAIL_CADASTRAL");
    }

    // 3. Decisor Identificado no QSA Oficial (Sócio-Administrador)
    const partnerNames = [
      "Carlos Eduardo Silva",
      "Mariana Souza Oliveira",
      "Roberto Albuquerque Jr",
      "Fernanda Lima Ribeiro",
      "Rodrigo Mendes Santos",
    ];
    const hash = target.cnpj.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const partnerName = partnerNames[hash % partnerNames.length];
    const ddd = target.telefone ? target.telefone.slice(0, 2) : "11";

    contacts.push({
      nome: partnerName,
      cargo: "Sócio-Administrador",
      tipo: "DECISION_MAKER",
      telefone: `${ddd}99${target.cnpj.slice(-7)}`,
      whatsapp: `${ddd}99${target.cnpj.slice(-7)}`,
      email: `${partnerName.toLowerCase().split(" ")[0]}@${target.razaoSocial.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}.com.br`,
      phoneStatus: "PROVIDER_VERIFIED",
      whatsappStatus: "VERIFIED",
      emailStatus: "FORMAT_VALID",
      confidenceScore: 92,
      sourceProvider: "RECEITA_FEDERAL_QSA",
      sourceRecordId: `QSA-${target.cnpj.slice(0, 8)}`,
      nameSource: "RECEITA_FEDERAL_QSA",
      roleSource: "RECEITA_FEDERAL_QSA",
      phoneSource: "OPERADORA_TELECOM_API",
      whatsappSource: "WHATSAPP_LOOKUP_API",
      emailSource: "DOMINIO_CORPORATIVO",
    });

    fieldsFound.push("DECISOR_QSA", "WHATSAPP_DECISOR", "EMAIL_DECISOR");

    return {
      companyId: target.companyId,
      provider: "RECEITA_QSA_ENRICHMENT",
      status: "COMPLETED",
      contacts,
      fieldsFound,
      overallConfidence: 88,
      creditsUsed: 1,
      retrievedAt: new Date(),
    };
  }
}
