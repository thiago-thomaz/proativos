import { prisma } from "@/lib/prisma";
import { RawCompanyRecord } from "../data-providers/provider-interface";
import {
  normalizeCnpj,
  validateCnpj,
  normalizePhone,
  normalizeEmail,
  normalizeStatus,
  normalizeCnae,
  normalizeDate,
} from "./normalizer";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { ICPStructuredDefinition } from "@/lib/types";

export interface IngestionOptions {
  providerName: string;
  mode?: "FULL" | "INCREMENTAL" | "ON_DEMAND";
  dryRun?: boolean;
  checkpoint?: string;
  correlationId?: string;
  autoMatchICP?: boolean; // Padrão: true
}

export interface IngestionSummary {
  jobId: string;
  status: "COMPLETED" | "FAILED" | "SIMULATION";
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  leadsCreated: number;
  errors: { cnpj?: string; reason: string }[];
  durationMs: number;
}

/**
 * Motor Central de Ingestão de Dados Empresariais (Fase 3)
 */
export async function processCompanyBatch(
  rawRecords: RawCompanyRecord[],
  options: IngestionOptions
): Promise<IngestionSummary> {
  const startTime = Date.now();
  const provider = options.providerName || "RECEITA_FEDERAL";
  const mode = options.mode || "INCREMENTAL";
  const isDryRun = Boolean(options.dryRun);

  // 1. Criar IngestionJob para rastreabilidade e data lineage
  let job: any = null;
  if (!isDryRun) {
    job = await prisma.ingestionJob.create({
      data: {
        provider,
        mode,
        status: "RUNNING",
        recordsRead: rawRecords.length,
        checkpoint: options.checkpoint || null,
        correlationId: options.correlationId || `corr-${Date.now()}`,
      },
    });
  }

  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;
  let leadsCreated = 0;
  const errors: { cnpj?: string; reason: string }[] = [];

  // Buscar campanhas ativas para o auto-matching de ICP
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      status: { in: ["LIVE", "SIMULATION"] },
    },
  });

  const now = new Date();

  for (const raw of rawRecords) {
    try {
      // 2. Normalização
      const cleanCnpj = normalizeCnpj(raw.cnpj);
      const normalizedPhone = normalizePhone(raw.telefone);
      const normalizedEmail = normalizeEmail(raw.email);
      const normalizedStatus = normalizeStatus(raw.situacao);
      const normalizedCnae = normalizeCnae(raw.cnaePrincipal);
      const normalizedOpeningDate = normalizeDate(raw.dataAbertura);

      // 3. Validação Rigorosa (Hard Validation)
      if (!validateCnpj(cleanCnpj)) {
        recordsFailed++;
        const reason = `CNPJ '${raw.cnpj}' possui dígitos verificadores inválidos.`;
        errors.push({ cnpj: raw.cnpj, reason });
        if (job) {
          await prisma.ingestionEvent.create({
            data: { jobId: job.id, type: "INVALID_RECORD", cnpj: raw.cnpj, detail: reason },
          });
        }
        continue;
      }

      if (!normalizedOpeningDate) {
        recordsFailed++;
        const reason = `Data de abertura '${raw.dataAbertura}' é inválida ou não pôde ser interpretada.`;
        errors.push({ cnpj: cleanCnpj, reason });
        if (job) {
          await prisma.ingestionEvent.create({
            data: { jobId: job.id, type: "INVALID_RECORD", cnpj: cleanCnpj, detail: reason },
          });
        }
        continue;
      }

      // Bloquear datas no futuro (> agora + 24h tolerância)
      if (normalizedOpeningDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
        recordsFailed++;
        const reason = `Data de abertura '${normalizedOpeningDate.toISOString()}' está no futuro.`;
        errors.push({ cnpj: cleanCnpj, reason });
        if (job) {
          await prisma.ingestionEvent.create({
            data: { jobId: job.id, type: "INVALID_RECORD", cnpj: cleanCnpj, detail: reason },
          });
        }
        continue;
      }

      if (!raw.uf || !raw.municipio) {
        recordsFailed++;
        const reason = "UF e Município são obrigatórios.";
        errors.push({ cnpj: cleanCnpj, reason });
        if (job) {
          await prisma.ingestionEvent.create({
            data: { jobId: job.id, type: "INVALID_RECORD", cnpj: cleanCnpj, detail: reason },
          });
        }
        continue;
      }

      // Se for modo Dry Run / Simulação, não altera banco
      if (isDryRun) {
        recordsCreated++;
        continue;
      }

      // 4. Deduplicação e Verificação de Existência no Banco
      const existingCompany = await prisma.company.findUnique({
        where: { cnpj: cleanCnpj },
      });

      let targetCompany: any = null;

      if (!existingCompany) {
        // Criar Nova Company com Data Lineage
        targetCompany = await prisma.company.create({
          data: {
            cnpj: cleanCnpj,
            razaoSocial: raw.razaoSocial || `Empresa ${cleanCnpj}`,
            nomeFantasia: raw.nomeFantasia || null,
            dataAbertura: normalizedOpeningDate,
            situacao: normalizedStatus,
            naturezaJuridica: raw.naturezaJuridica || null,
            porte: raw.porte || "ME",
            capitalSocial: raw.capitalSocial || 0,
            cnaePrincipal: raw.cnaePrincipal,
            cnaesSecundarios: typeof raw.cnaesSecundarios === "object" ? JSON.stringify(raw.cnaesSecundarios) : raw.cnaesSecundarios || null,
            endereco: raw.endereco || null,
            numero: raw.numero || null,
            complemento: raw.complemento || null,
            bairro: raw.bairro || null,
            municipio: raw.municipio,
            uf: raw.uf.toUpperCase(),
            cep: raw.cep || null,
            telefone: normalizedPhone.phone,
            email: normalizedEmail.email,
            fonte: "DATA_INGESTION_ENGINE",
            sourceProvider: provider,
            sourceRecordId: raw.sourceRecordId || null,
            sourceUpdatedAt: raw.sourceUpdatedAt ? new Date(raw.sourceUpdatedAt) : new Date(),
          },
        });

        // Registrar CompanyEvent de Criação
        await prisma.companyEvent.create({
          data: {
            companyId: targetCompany.id,
            eventType: "COMPANY_CREATED",
            source: provider,
            newValue: JSON.stringify({ cnpj: cleanCnpj, razaoSocial: targetCompany.razaoSocial }),
          },
        });

        recordsCreated++;
      } else {
        // Detectar Alterações Relevantes (Diff)
        const diffs: { type: string; oldVal: string; newVal: string }[] = [];

        if (existingCompany.situacao !== normalizedStatus) {
          diffs.push({ type: "STATUS_CHANGED", oldVal: existingCompany.situacao, newVal: normalizedStatus });
        }
        if (existingCompany.cnaePrincipal !== raw.cnaePrincipal) {
          diffs.push({ type: "CNAE_CHANGED", oldVal: existingCompany.cnaePrincipal, newVal: raw.cnaePrincipal });
        }
        if (raw.porte && existingCompany.porte !== raw.porte) {
          diffs.push({ type: "PORTE_CHANGED", oldVal: existingCompany.porte || "", newVal: raw.porte });
        }
        if (raw.capitalSocial !== undefined && raw.capitalSocial !== null && existingCompany.capitalSocial !== raw.capitalSocial) {
          diffs.push({ type: "CAPITAL_CHANGED", oldVal: String(existingCompany.capitalSocial), newVal: String(raw.capitalSocial) });
        }

        if (diffs.length > 0) {
          targetCompany = await prisma.company.update({
            where: { id: existingCompany.id },
            data: {
              situacao: normalizedStatus,
              cnaePrincipal: raw.cnaePrincipal,
              porte: raw.porte || existingCompany.porte,
              capitalSocial: raw.capitalSocial ?? existingCompany.capitalSocial,
              telefone: normalizedPhone.phone || existingCompany.telefone,
              email: normalizedEmail.email || existingCompany.email,
              sourceUpdatedAt: new Date(),
            },
          });

          for (const d of diffs) {
            await prisma.companyEvent.create({
              data: {
                companyId: targetCompany.id,
                eventType: d.type,
                oldValue: d.oldVal,
                newValue: d.newVal,
                source: provider,
              },
            });
          }

          recordsUpdated++;
        } else {
          recordsSkipped++;
          targetCompany = existingCompany;
        }
      }

      // 5. Integração com o ICP Engine: Avaliar Campanhas Ativas Automaticamente
      if (options.autoMatchICP !== false && targetCompany) {
        for (const camp of activeCampaigns) {
          let icpConfig: any = {};
          try {
            icpConfig = JSON.parse(camp.icpFilters);
          } catch {}

          const evalResult = evaluateCompanyAgainstICP(
            {
              cnpj: targetCompany.cnpj,
              razaoSocial: targetCompany.razaoSocial,
              nomeFantasia: targetCompany.nomeFantasia,
              dataAbertura: targetCompany.dataAbertura,
              situacao: targetCompany.situacao,
              cnaePrincipal: targetCompany.cnaePrincipal,
              cnaesSecundarios: targetCompany.cnaesSecundarios,
              municipio: targetCompany.municipio,
              uf: targetCompany.uf,
              porte: targetCompany.porte,
              capitalSocial: targetCompany.capitalSocial,
              telefone: targetCompany.telefone,
              email: targetCompany.email,
            },
            icpConfig,
            now
          );

          if (evalResult.matched && evalResult.score >= camp.minScore) {
            // Verificar se o Lead já existe (Chave única: organizationId + campaignId + companyId)
            const existingLead = await prisma.lead.findUnique({
              where: {
                organizationId_campaignId_companyId: {
                  organizationId: camp.organizationId,
                  campaignId: camp.id,
                  companyId: targetCompany.id,
                },
              },
            });

            if (!existingLead) {
              const newLead = await prisma.lead.create({
                data: {
                  organizationId: camp.organizationId,
                  campaignId: camp.id,
                  companyId: targetCompany.id,
                  score: evalResult.score,
                  status: "QUALIFIED",
                  qualificationReason: JSON.stringify({
                    score: evalResult.score,
                    reasons: evalResult.reasons,
                    rejections: evalResult.rejections,
                  }),
                },
              });

              // Criar LeadEvent
              await prisma.leadEvent.create({
                data: {
                  leadId: newLead.id,
                  type: "DETECTED",
                  description: `Empresa identificada e qualificada com Score ${evalResult.score}% para a campanha '${camp.name}'.`,
                  metadata: JSON.stringify({ provider, score: evalResult.score }),
                },
              });

              leadsCreated++;
            }
          }
        }
      }
    } catch (rowErr) {
      recordsFailed++;
      errors.push({ cnpj: raw.cnpj, reason: String(rowErr) });
    }
  }

  // 6. Atualizar IngestionJob com Métricas Finais
  if (job) {
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: recordsFailed > 0 && recordsCreated === 0 && recordsUpdated === 0 ? "FAILED" : "COMPLETED",
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        finishedAt: new Date(),
      },
    });

    // Atualizar ProviderConfig
    await prisma.providerConfig.upsert({
      where: { providerName: provider },
      create: {
        providerName: provider,
        healthStatus: "HEALTHY",
        lastSyncAt: new Date(),
        lastLatencyMs: Date.now() - startTime,
      },
      update: {
        healthStatus: "HEALTHY",
        lastSyncAt: new Date(),
        lastLatencyMs: Date.now() - startTime,
      },
    });
  }

  return {
    jobId: job ? job.id : "dry-run-job",
    status: isDryRun ? "SIMULATION" : recordsFailed > 0 && recordsCreated === 0 && recordsUpdated === 0 ? "FAILED" : "COMPLETED",
    recordsRead: rawRecords.length,
    recordsCreated,
    recordsUpdated,
    recordsSkipped,
    recordsFailed,
    leadsCreated,
    errors,
    durationMs: Date.now() - startTime,
  };
}
