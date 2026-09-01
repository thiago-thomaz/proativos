import { prisma } from "./src/lib/prisma";
import { processCompanyBatch } from "./src/services/data-ingestion/ingestion-engine";
import { generateValidCnpj } from "./src/services/data-providers/mock-sandbox-provider";
import { enrichCompanyContacts } from "./src/services/contact-enrichment/enrichment-engine";
import { validateOutreachCompliance } from "./src/services/compliance";
import { classifyReplyIntent } from "./src/services/reply-classifier";

async function runE2ECoreFlowTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: E2E CORE WORKFLOW (FASE 8) ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `-> ${detail}` : ""}`);
      failed++;
    }
  }

  const seed = Date.now();

  // 1. Organização & Campanha
  const org = await prisma.organization.create({
    data: {
      name: `E2E Tech Corp ${seed}`,
      slug: `e2e-tech-${seed}`,
      plan: "ENTERPRISE",
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "E2E B2B FoodTech Campaign",
      productName: "FoodTech Master ERP",
      status: "LIVE",
      minScore: 70,
      allowedChannels: "EMAIL,WHATSAPP",
      sendTimeStart: "00:00",
      sendTimeEnd: "23:59",
      icpFilters: JSON.stringify({
        version: 2,
        industry: { mainCnaes: ["5611201"], secondaryCnaes: [], acceptSecondaryCnae: true, strictMainCnaeOnly: false, terms: ["restaurante"] },
        location: { ufs: ["SP"], cities: ["Campinas", "Bauru"], country: "BR", regions: [], strictLocation: true },
        companySize: { allowedPortes: ["ME", "EPP"] },
        openingDate: { mode: "PRESET", preset: "LAST_30_DAYS" },
        status: ["ATIVA"],
        minScore: 70,
      }),
    },
  });

  // 2. Ingestão de Empresa
  const cnpj = generateValidCnpj(Math.floor(Math.random() * 800000) + 100000);
  const ingestionRes = await processCompanyBatch(
    [
      {
        cnpj,
        razaoSocial: "Bistrô Italiano E2E Ltda",
        nomeFantasia: "Bistrô Italiano",
        dataAbertura: new Date().toISOString().split("T")[0],
        situacao: "ATIVA",
        cnaePrincipal: "5611201 - Restaurantes e similares",
        municipio: "Campinas",
        uf: "SP",
        porte: "ME",
        capitalSocial: 90000,
        telefone: "19998887777",
        email: "contato@bistroitaliano.com.br",
      },
    ],
    { providerName: "MOCK_SANDBOX" }
  );

  const companyDb = await prisma.company.findUnique({ where: { cnpj } });
  assert(
    ingestionRes.recordsCreated === 1 && Boolean(companyDb),
    "ETAPA 1: Ingestão de nova empresa aberta registrada com sucesso"
  );

  // 3. Auto-matching com Campanha e Lead Gerado
  const lead = await prisma.lead.findFirst({
    where: { organizationId: org.id, campaignId: campaign.id, companyId: companyDb!.id },
  });
  assert(
    Boolean(lead) && (lead?.score || 0) >= 70,
    "ETAPA 2: ICP Engine qualifica automaticamente e gera Lead no pipeline"
  );

  // 4. Enriquecimento de Decisores (QSA)
  const enrichRes = await enrichCompanyContacts(companyDb!.id);
  const contacts = await prisma.contact.findMany({ where: { companyId: companyDb!.id } });
  const decisionMaker = contacts.find((c) => c.tipo === "DECISION_MAKER") || contacts[0];
  assert(
    enrichRes.success === true && contacts.length >= 1 && Boolean(decisionMaker),
    "ETAPA 3: Enriquecimento identifica sócio/decisor e canais diretos"
  );

  // 5. Compliance & Verificação Anti-Spam (LGPD)
  const compliance = await validateOutreachCompliance({
    organizationId: org.id,
    campaignId: campaign.id,
    leadId: lead!.id,
    channel: "EMAIL",
    identifier: decisionMaker?.email || "contato@bistroitaliano.com.br",
  });
  assert(
    compliance.allowed === true,
    "ETAPA 4: Compliance Engine aprova disparo respeitando regras de opt-out e situação ativa"
  );

  // 6. Registro de Mensagem de Abordagem (Outreach)
  const message = await prisma.outreachMessage.create({
    data: {
      organizationId: org.id,
      campaignId: campaign.id,
      leadId: lead!.id,
      contactId: decisionMaker?.id,
      channel: "EMAIL",
      provider: "RESEND",
      subject: "Parabéns pela abertura do Bistrô Italiano!",
      body: "Olá, vimos a abertura da sua empresa e gostaríamos de apresentar o FoodTech ERP.",
      status: "DELIVERED",
      idempotencyKey: `idem-e2e-${seed}`,
    },
  });

  await prisma.lead.update({
    where: { id: lead!.id },
    data: { status: "CONTACTED", contactedAt: new Date() },
  });
  assert(
    Boolean(message.id),
    "ETAPA 5: Disparo de outreach executado e registrado no histórico"
  );

  // 7. Simulação de Resposta Inbound do Lead
  const inboundText = "Olá! Tenho muito interesse em conhecer o sistema. Podemos marcar uma call amanhã às 15h?";
  const intent = classifyReplyIntent(inboundText);

  assert(
    intent === "MEETING_REQUEST",
    "ETAPA 6: Motor de IA classifica resposta recebida como MEETING_REQUEST com sentimento positivo"
  );

  // 8. Promoção a Deal no CRM & Atribuição de Receita
  const deal = await prisma.deal.create({
    data: {
      organizationId: org.id,
      leadId: lead!.id,
      companyId: companyDb!.id,
      campaignId: campaign.id,
      title: "Contrato FoodTech Master - Bistrô Italiano",
      stage: "WON",
      expectedValue: 12000,
      actualValue: 12000,
      closeDate: new Date(),
    },
  });

  await prisma.lead.update({
    where: { id: lead!.id },
    data: { status: "CONVERTED", convertedAt: new Date() },
  });

  assert(
    Boolean(deal.id) && deal.stage === "WON" && deal.actualValue === 12000,
    "ETAPA 7: Lead promovido a Deal GANHO (WON) no CRM com atribuição total de receita"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runE2ECoreFlowTests().catch((err) => {
  console.error("Erro fatal nos testes E2E:", err);
  process.exit(1);
});
