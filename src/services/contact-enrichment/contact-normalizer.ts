import { prisma } from "@/lib/prisma";
import { normalizePhone, normalizeEmail } from "@/services/data-ingestion/normalizer";
import {
  ContactType,
  VerificationStatus,
  WhatsAppStatus,
  EnrichedContactPayload,
} from "@/lib/types";

export interface CleanContactData {
  nome: string;
  cargo: string | null;
  tipo: ContactType;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  emailStatus: VerificationStatus;
  whatsappStatus: WhatsAppStatus;
  phoneStatus: VerificationStatus;
  confidenceScore: number;
  sourceProvider: string;
  sourceRecordId: string | null;
  nameSource: string | null;
  roleSource: string | null;
  emailSource: string | null;
  phoneSource: string | null;
  whatsappSource: string | null;
  isSuppressed: boolean;
}

/**
 * Normaliza e enriquece um payload bruto de contato, aplicando regras de conformidade e supressão
 */
export async function normalizeAndAuditContact(
  raw: EnrichedContactPayload,
  organizationId?: string | null
): Promise<CleanContactData> {
  const normPhone = normalizePhone(raw.telefone || raw.whatsapp);
  const normEmail = normalizeEmail(raw.email);

  let phoneStatus: VerificationStatus = raw.phoneStatus || (normPhone.phone ? "FORMAT_VALID" : "UNKNOWN");
  let emailStatus: VerificationStatus = raw.emailStatus || (normEmail.isValidFormat ? "FORMAT_VALID" : "UNKNOWN");
  let whatsappStatus: WhatsAppStatus = raw.whatsappStatus || "UNKNOWN";

  // Se o telefone é celular válido e status ainda não foi testado em API de WhatsApp
  if (normPhone.isCellPhone && whatsappStatus === "UNKNOWN") {
    whatsappStatus = "LIKELY";
  }

  // Verificação de Supressão / Opt-Out na base da organização
  let isSuppressed = false;
  const identifiersToCheck: string[] = [];
  if (normPhone.phone) identifiersToCheck.push(normPhone.phone);
  if (normEmail.email) identifiersToCheck.push(normEmail.email);

  if (identifiersToCheck.length > 0) {
    const suppressed = await prisma.suppressionList.findFirst({
      where: {
        identifier: { in: identifiersToCheck },
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (suppressed) {
      isSuppressed = true;
      phoneStatus = "SUPPRESSED";
      emailStatus = "SUPPRESSED";
      whatsappStatus = "SUPPRESSED";
    }
  }

  // Sanitização de Nome e Cargo
  const cleanName = (raw.nome || "Contato Empresarial").trim();
  const cleanRole = raw.cargo ? raw.cargo.trim() : null;

  // Classificação rigorosa de tipo de contato
  let tipo: ContactType = raw.tipo || "UNKNOWN";
  if (cleanRole && /s[oó]cio|administrador|diretor|propriet[aá]rio|presidente|gerente/i.test(cleanRole)) {
    tipo = "DECISION_MAKER";
  } else if (!cleanRole && tipo === "DECISION_MAKER") {
    tipo = "INSTITUTIONAL_CONTACT";
  }

  return {
    nome: cleanName,
    cargo: cleanRole,
    tipo,
    email: normEmail.email,
    telefone: normPhone.phone,
    whatsapp: normPhone.phone && (whatsappStatus === "VERIFIED" || whatsappStatus === "LIKELY") ? normPhone.phone : null,
    emailStatus,
    whatsappStatus,
    phoneStatus,
    confidenceScore: Math.min(100, Math.max(0, raw.confidenceScore || 60)),
    sourceProvider: raw.sourceProvider || "CADASTRO_RECEITA",
    sourceRecordId: raw.sourceRecordId || null,
    nameSource: raw.nameSource || raw.sourceProvider,
    roleSource: raw.roleSource || (cleanRole ? raw.sourceProvider : null),
    emailSource: raw.emailSource || (normEmail.email ? raw.sourceProvider : null),
    phoneSource: raw.phoneSource || (normPhone.phone ? raw.sourceProvider : null),
    whatsappSource: raw.whatsappSource || (whatsappStatus === "VERIFIED" ? raw.sourceProvider : null),
    isSuppressed,
  };
}
