import { prisma } from "./src/lib/prisma";
import { signToken } from "./src/lib/auth";
import { NextRequest } from "next/server";
import { GET as leadsRoute } from "./src/app/api/v1/leads/route";
import { GET as leadByIdRoute, PATCH as updateLeadRoute } from "./src/app/api/v1/leads/[id]/route";
import { GET as campaignsRoute, PATCH as updateCampaignRoute } from "./src/app/api/v1/campaigns/route";
import { GET as inboxRoute } from "./src/app/api/v1/inbox/route";
import { GET as billingCreditsRoute } from "./src/app/api/v1/billing/credits/route";

async function runMultiTenancySecurityTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: MULTI-TENANCY & ISOLAMENTO RIGOROSO (FASE 8) ===\n");

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

  // Setup: 2 Organizações Distintas
  const orgAlpha = await prisma.organization.create({
    data: { name: `Alpha Corp ${seed}`, slug: `alpha-corp-${seed}` },
  });
  const userAlpha = await prisma.user.create({
    data: {
      organizationId: orgAlpha.id,
      name: "Alpha Admin",
      email: `admin-alpha-${seed}@alpha.com`,
      passwordHash: "$2b$10$abcdef",
      role: "OWNER",
    },
  });
  const tokenAlpha = signToken({
    id: userAlpha.id,
    name: userAlpha.name,
    email: userAlpha.email,
    role: "OWNER",
    organizationId: orgAlpha.id,
    organizationName: orgAlpha.name,
    organizationSlug: orgAlpha.slug,
  });

  const orgBeta = await prisma.organization.create({
    data: { name: `Beta Corp ${seed}`, slug: `beta-corp-${seed}` },
  });
  const userBeta = await prisma.user.create({
    data: {
      organizationId: orgBeta.id,
      name: "Beta Admin",
      email: `admin-beta-${seed}@beta.com`,
      passwordHash: "$2b$10$abcdef",
      role: "OWNER",
    },
  });
  const tokenBeta = signToken({
    id: userBeta.id,
    name: userBeta.name,
    email: userBeta.email,
    role: "OWNER",
    organizationId: orgBeta.id,
    organizationName: orgBeta.name,
    organizationSlug: orgBeta.slug,
  });

  // Criar Dados confidenciais na Org Alpha
  const companyAlpha = await prisma.company.create({
    data: {
      cnpj: `888888${String(seed).slice(-8)}`,
      razaoSocial: "Alpha Tech Client Ltda",
      dataAbertura: new Date(),
      situacao: "ATIVA",
      cnaePrincipal: "6201501",
      municipio: "Campinas",
      uf: "SP",
    },
  });

  const campaignAlpha = await prisma.campaign.create({
    data: {
      organizationId: orgAlpha.id,
      name: "Campanha Secreta Alpha",
      productName: "Alpha ERP",
      status: "LIVE",
      icpFilters: "{}",
    },
  });

  const leadAlpha = await prisma.lead.create({
    data: {
      organizationId: orgAlpha.id,
      campaignId: campaignAlpha.id,
      companyId: companyAlpha.id,
      score: 95,
      status: "QUALIFIED",
    },
  });

  // -------------------------------------------------------------
  // TESTE 1: Org Beta não vê campanhas da Org Alpha
  // -------------------------------------------------------------
  const campReq = new NextRequest("http://localhost:3000/api/v1/campaigns", {
    headers: { Authorization: `Bearer ${tokenBeta}` },
  });
  const campRes = await campaignsRoute(campReq);
  const campJson = await campRes.json();
  assert(
    campRes.status === 200 &&
    !campJson.campaigns.some((c: any) => c.id === campaignAlpha.id),
    "TESTE 1: GET /api/v1/campaigns filtra estritamente por organizationId da sessão"
  );

  // -------------------------------------------------------------
  // TESTE 2: Org Beta não consegue alterar status de campanha da Org Alpha
  // -------------------------------------------------------------
  const patchCampReq = new NextRequest("http://localhost:3000/api/v1/campaigns", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenBeta}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: campaignAlpha.id, status: "PAUSED" }),
  });
  const patchCampRes = await updateCampaignRoute(patchCampReq);
  assert(
    patchCampRes.status === 404,
    "TESTE 2: PATCH /api/v1/campaigns rejeita alteração de campanha pertencente a outro tenant (404)"
  );

  // -------------------------------------------------------------
  // TESTE 3: Org Beta não vê Leads da Org Alpha
  // -------------------------------------------------------------
  const leadsReq = new NextRequest("http://localhost:3000/api/v1/leads", {
    headers: { Authorization: `Bearer ${tokenBeta}` },
  });
  const leadsRes = await leadsRoute(leadsReq);
  const leadsJson = await leadsRes.json();
  assert(
    leadsRes.status === 200 &&
    !leadsJson.leads.some((l: any) => l.id === leadAlpha.id),
    "TESTE 3: GET /api/v1/leads não expõe leads entre organizações concorrentes"
  );

  // -------------------------------------------------------------
  // TESTE 4: Org Beta não consegue acessar Lead específico da Org Alpha via ID
  // -------------------------------------------------------------
  const leadIdReq = new NextRequest(`http://localhost:3000/api/v1/leads/${leadAlpha.id}`, {
    headers: { Authorization: `Bearer ${tokenBeta}` },
  });
  const leadIdRes = await leadByIdRoute(leadIdReq, { params: Promise.resolve({ id: leadAlpha.id }) });
  assert(
    leadIdRes.status === 404,
    "TESTE 4: GET /api/v1/leads/[id] retorna 404 ao tentar inspecionar lead de outro tenant"
  );

  // -------------------------------------------------------------
  // TESTE 5: Org Beta não consegue alterar status de Lead da Org Alpha
  // -------------------------------------------------------------
  const patchLeadReq = new NextRequest(`http://localhost:3000/api/v1/leads/${leadAlpha.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenBeta}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "CONVERTED" }),
  });
  const patchLeadRes = await updateLeadRoute(patchLeadReq, { params: Promise.resolve({ id: leadAlpha.id }) });
  assert(
    patchLeadRes.status === 404,
    "TESTE 5: PATCH /api/v1/leads/[id] rejeita manipulação indevida de pipeline cross-tenant"
  );

  // -------------------------------------------------------------
  // TESTE 6: Isolamento de Créditos Financeiros
  // -------------------------------------------------------------
  const credReq = new NextRequest("http://localhost:3000/api/v1/billing/credits", {
    headers: { Authorization: `Bearer ${tokenBeta}` },
  });
  const credRes = await billingCreditsRoute(credReq);
  const credJson = await credRes.json();
  assert(
    credRes.status === 200 &&
    credJson.balance === 100,
    "TESTE 6: Conta de Créditos e Faturamento estritamente isolada por tenant"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runMultiTenancySecurityTests().catch((err) => {
  console.error("Erro fatal nos testes de Multi-Tenancy:", err);
  process.exit(1);
});
