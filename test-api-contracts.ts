import { NextRequest } from "next/server";
import { prisma } from "./src/lib/prisma";
import { signToken } from "./src/lib/auth";
import { GET as healthRoute } from "./src/app/api/health/route";
import { GET as companiesRoute } from "./src/app/api/v1/companies/route";
import { GET as leadsRoute } from "./src/app/api/v1/leads/route";
import { GET as campaignsRoute } from "./src/app/api/v1/campaigns/route";
import { GET as inboxRoute } from "./src/app/api/v1/inbox/route";
import { GET as billingCreditsRoute } from "./src/app/api/v1/billing/credits/route";
import { GET as billingPlansRoute } from "./src/app/api/v1/billing/plans/route";
import { GET as contactsRoute } from "./src/app/api/v1/contacts/route";
import { GET as dashboardOverviewRoute } from "./src/app/api/v1/dashboard/overview/route";

async function runApiContractTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: API CONTRACTS & SCHEMA VALIDATION (FASE 8) ===\n");

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
  const org = await prisma.organization.create({
    data: { name: `Contract Corp ${seed}`, slug: `contract-corp-${seed}` },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "API Tester",
      email: `contract-${seed}@test.com`,
      passwordHash: "$2b$10$abcdef",
      role: "OWNER",
    },
  });

  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: "OWNER",
    organizationId: org.id,
    organizationName: org.name,
    organizationSlug: org.slug,
  });

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 1. Health API
  const healthRes = await healthRoute();
  const healthJson = await healthRes.json();
  assert(
    healthRes.status === 200 && healthJson.status === "healthy" && Boolean(healthJson.version),
    "CONTRATO 1: GET /api/health retorna status 200 e payload healthy com versão"
  );

  // 2. Companies API
  const compReq = new NextRequest("http://localhost:3000/api/v1/companies?limit=10");
  const compRes = await companiesRoute(compReq);
  const compJson = await compRes.json();
  assert(
    compRes.status === 200 && compJson.success === true && Array.isArray(compJson.companies),
    "CONTRATO 2: GET /api/v1/companies retorna array de empresas"
  );

  // 3. Leads API
  const leadsReq = new NextRequest("http://localhost:3000/api/v1/leads", { headers: authHeaders });
  const leadsRes = await leadsRoute(leadsReq);
  const leadsJson = await leadsRes.json();
  assert(
    leadsRes.status === 200 && leadsJson.success === true && Array.isArray(leadsJson.leads),
    "CONTRATO 3: GET /api/v1/leads retorna array de leads com multi-tenant"
  );

  // 4. Campaigns API
  const campReq = new NextRequest("http://localhost:3000/api/v1/campaigns", { headers: authHeaders });
  const campRes = await campaignsRoute(campReq);
  const campJson = await campRes.json();
  assert(
    campRes.status === 200 && campJson.success === true && Array.isArray(campJson.campaigns),
    "CONTRATO 4: GET /api/v1/campaigns retorna campanhas enriquecidas com resolvedDateRange"
  );

  // 5. Contacts API
  const contReq = new NextRequest("http://localhost:3000/api/v1/contacts", { headers: authHeaders });
  const contRes = await contactsRoute(contReq);
  const contJson = await contRes.json();
  assert(
    contRes.status === 200 && contJson.success === true && Array.isArray(contJson.contacts),
    "CONTRATO 5: GET /api/v1/contacts retorna diretório de contatos e decisores"
  );

  // 6. Inbox API
  const inboxReq = new NextRequest("http://localhost:3000/api/v1/inbox", { headers: authHeaders });
  const inboxRes = await inboxRoute(inboxReq);
  const inboxJson = await inboxRes.json();
  assert(
    inboxRes.status === 200 && inboxJson.success === true && inboxJson.summary !== undefined,
    "CONTRATO 6: GET /api/v1/inbox retorna sumário de intenções e mensagens recebidas"
  );

  // 7. Billing Plans API
  const plansReq = new NextRequest("http://localhost:3000/api/v1/billing/plans");
  const plansRes = await billingPlansRoute(plansReq);
  const plansJson = await plansRes.json();
  assert(
    plansRes.status === 200 && plansJson.success === true && Array.isArray(plansJson.plans),
    "CONTRATO 7: GET /api/v1/billing/plans retorna planos de assinatura ativos"
  );

  // 8. Billing Credits API
  const credReq = new NextRequest("http://localhost:3000/api/v1/billing/credits", { headers: authHeaders });
  const credRes = await billingCreditsRoute(credReq);
  const credJson = await credRes.json();
  assert(
    credRes.status === 200 && credJson.success === true && typeof credJson.balance === "number",
    "CONTRATO 8: GET /api/v1/billing/credits retorna saldo de créditos e plano do tenant"
  );

  // 9. Dashboard Overview API
  const dashReq = new NextRequest("http://localhost:3000/api/v1/dashboard/overview", { headers: authHeaders });
  const dashRes = await dashboardOverviewRoute(dashReq);
  const dashJson = await dashRes.json();
  assert(
    dashRes.status === 200 && dashJson.success === true && dashJson.metrics?.totalCompanies !== undefined,
    "CONTRATO 9: GET /api/v1/dashboard/overview retorna métricas unificadas em tempo real"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runApiContractTests().catch((err) => {
  console.error("Erro fatal nos testes de Contratos de API:", err);
  process.exit(1);
});
