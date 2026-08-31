import { prisma } from "@/lib/prisma";
import { MockEnrichmentProvider } from "./mock-enrichment-provider";
import { normalizeAndAuditContact } from "./contact-normalizer";
import { calculateContactabilityScore } from "@/services/contactability";
import { EnrichmentResult, EnrichedContactPayload } from "@/lib/types";

export interface EnrichmentEngineOptions {
  providerName?: string;
  forceRefresh?: boolean;
  correlationId?: string;
  organizationId?: string | null;
  dryRun?: boolean;
}

/**
 * Orquestrador Central de Enriquecimento de Contatos (Fase 4)
 */
export async function enrichCompanyContacts(
  companyId: string,
  options: EnrichmentEngineOptions = {}
): Promise<{ success: boolean; result: EnrichmentResult; contactability: any }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { contacts: true },
  });

  if (!company) {
    throw new Error(`Empresa com ID '${companyId}' não encontrada.`);
  }

  const providerName = options.providerName || "MOCK_ENRICHMENT_PROVIDER";
  const correlationId = options.correlationId || `enrich-${Date.now()}`;

  // Criar EnrichmentJob
  const job = await prisma.enrichmentJob.create({
    data: {
      companyId: company.id,
      provider: providerName,
      status: options.dryRun ? "SIMULATION" : "RUNNING",
      fieldsRequested: JSON.stringify(["DECISOR_QSA", "WHATSAPP", "EMAIL"]),
      correlationId,
    },
  });

  try {
    const provider = new MockEnrichmentProvider();
    const result = await provider.enrichCompany({
      companyId: company.id,
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial,
      municipio: company.municipio,
      uf: company.uf,
      telefone: company.telefone,
      email: company.email,
      dataAbertura: company.dataAbertura,
    });

    if (!options.dryRun) {
      // Normalizar e Persistir Contatos no Banco de Dados
      for (const raw of result.contacts) {
        const clean = await normalizeAndAuditContact(raw, options.organizationId);

        // Deduplicação: Buscar contato existente com mesmo telefone ou e-mail na empresa
        const existing = await prisma.contact.findFirst({
          where: {
            companyId: company.id,
            OR: [
              ...(clean.telefone ? [{ telefone: clean.telefone }] : []),
              ...(clean.email ? [{ email: clean.email }] : []),
              { nome: clean.nome },
            ],
          },
        });

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              nome: clean.nome,
              cargo: clean.cargo || existing.cargo,
              tipo: clean.tipo !== "UNKNOWN" ? clean.tipo : existing.tipo,
              email: clean.email || existing.email,
              telefone: clean.telefone || existing.telefone,
              whatsapp: clean.whatsapp || existing.whatsapp,
              emailStatus: clean.emailStatus,
              whatsappStatus: clean.whatsappStatus,
              phoneStatus: clean.phoneStatus,
              confidenceScore: Math.max(existing.confidenceScore, clean.confidenceScore),
              sourceProvider: providerName,
              nameSource: clean.nameSource || existing.nameSource,
              roleSource: clean.roleSource || existing.roleSource,
              emailSource: clean.emailSource || existing.emailSource,
              phoneSource: clean.phoneSource || existing.phoneSource,
              whatsappSource: clean.whatsappSource || existing.whatsappSource,
              optOut: clean.isSuppressed,
              lastEnrichedAt: new Date(),
            },
          });
        } else {
          await prisma.contact.create({
            data: {
              companyId: company.id,
              organizationId: options.organizationId || null,
              nome: clean.nome,
              cargo: clean.cargo,
              tipo: clean.tipo,
              email: clean.email,
              telefone: clean.telefone,
              whatsapp: clean.whatsapp,
              emailStatus: clean.emailStatus,
              whatsappStatus: clean.whatsappStatus,
              phoneStatus: clean.phoneStatus,
              confidenceScore: clean.confidenceScore,
              sourceProvider: providerName,
              sourceRecordId: clean.sourceRecordId,
              nameSource: clean.nameSource,
              roleSource: clean.roleSource,
              emailSource: clean.emailSource,
              phoneSource: clean.phoneSource,
              whatsappSource: clean.whatsappSource,
              optOut: clean.isSuppressed,
              lastEnrichedAt: new Date(),
            },
          });
        }
      }

      // Atualizar IngestionJob
      await prisma.enrichmentJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          fieldsFound: JSON.stringify(result.fieldsFound),
          confidence: result.overallConfidence,
          creditsUsed: result.creditsUsed,
          finishedAt: new Date(),
        },
      });
    }

    // Buscar lista atualizada de contatos para cálculo de Contactability
    const updatedContacts = await prisma.contact.findMany({
      where: { companyId: company.id },
    });

    // Atualizar Leads associados a esta empresa
    const leads = await prisma.lead.findMany({
      where: { companyId: company.id },
    });

    let contactability: any = null;

    for (const lead of leads) {
      contactability = calculateContactabilityScore(updatedContacts, lead.score);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          contactabilityScore: contactability.contactabilityScore,
          priorityScore: contactability.priorityScore,
          readiness: contactability.leadReadiness,
        },
      });
    }

    if (!contactability) {
      contactability = calculateContactabilityScore(updatedContacts, 70);
    }

    return {
      success: true,
      result,
      contactability,
    };
  } catch (err: any) {
    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: String(err),
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

/**
 * Suprime um contato imediatamente (Opt-Out universal / organização)
 */
export async function suppressContact(
  contactId: string,
  reason: string = "USER_OPT_OUT",
  organizationId?: string | null
) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new Error(`Contato '${contactId}' não encontrado.`);
  }

  // Atualizar contato no banco
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      optOut: true,
      phoneStatus: "SUPPRESSED",
      emailStatus: "SUPPRESSED",
      whatsappStatus: "SUPPRESSED",
    },
  });

  // Gravar na SuppressionList da organização
  if (contact.email) {
    await prisma.suppressionList.upsert({
      where: {
        organizationId_identifier_channel: {
          organizationId: organizationId || contact.organizationId || "global",
          identifier: contact.email,
          channel: "EMAIL",
        },
      },
      create: {
        organizationId: organizationId || contact.organizationId || "global",
        identifier: contact.email,
        channel: "EMAIL",
        reason,
        source: "OPT_OUT_REQUEST",
      },
      update: { reason },
    });
  }

  if (contact.telefone) {
    await prisma.suppressionList.upsert({
      where: {
        organizationId_identifier_channel: {
          organizationId: organizationId || contact.organizationId || "global",
          identifier: contact.telefone,
          channel: "WHATSAPP",
        },
      },
      create: {
        organizationId: organizationId || contact.organizationId || "global",
        identifier: contact.telefone,
        channel: "WHATSAPP",
        reason,
        source: "OPT_OUT_REQUEST",
      },
      update: { reason },
    });
  }

  return { success: true, contactId: contact.id, status: "SUPPRESSED" };
}
