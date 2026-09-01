import { prisma } from "./src/lib/prisma";
import { signToken, verifyToken, hasPermission } from "./src/lib/auth";
import { validateOutreachCompliance } from "./src/services/compliance";
import { UserRole } from "./src/lib/types";

async function runSecurityHardeningTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: SECURITY & COMPLIANCE HARDENING (FASE 8) ===\n");

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

  // -------------------------------------------------------------
  // TESTE 1: RBAC Hierarchy e Matriz de Permissões
  // -------------------------------------------------------------
  assert(
    hasPermission("SUPER_ADMIN", "OWNER") === true &&
    hasPermission("OWNER", "ADMIN") === true &&
    hasPermission("ADMIN", "OPERATOR") === true &&
    hasPermission("ADMIN", "OWNER") === false &&
    hasPermission("OPERATOR", "ADMIN") === false,
    "TESTE 1: RBAC rigoroso com segregação de funções hierárquicas (SUPER_ADMIN > OWNER > ADMIN > OPERATOR)"
  );

  // -------------------------------------------------------------
  // TESTE 2: Rejeição de Token JWT Adulterado / Falsificado
  // -------------------------------------------------------------
  const validToken = signToken({
    id: "usr-sec-1",
    name: "User Safe",
    email: "safe@test.com",
    role: "OPERATOR",
    organizationId: "org-1",
    organizationName: "Org 1",
    organizationSlug: "org-1",
  });

  const parts = validToken.split(".");
  // Adulterar a assinatura
  const tamperedToken = `${parts[0]}.${parts[1]}.fakeSignature1234567890`;
  const tamperedResult = verifyToken(tamperedToken);
  assert(tamperedResult === null, "TESTE 2: Rejeição imediata de JWT com assinatura violada/adulterada");

  // -------------------------------------------------------------
  // TESTE 3: Rejeição de Token Expirado
  // -------------------------------------------------------------
  const expiredPayload = {
    id: "usr-sec-2",
    name: "User Expired",
    email: "expired@test.com",
    role: "OPERATOR" as UserRole,
    organizationId: "org-1",
    organizationName: "Org 1",
    organizationSlug: "org-1",
    exp: Math.floor(Date.now() / 1000) - 3600, // Expirado há 1 hora
  };
  const jwt = require("jsonwebtoken");
  const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET || "default-secret-change-in-prod");
  const expiredResult = verifyToken(expiredToken);
  assert(expiredResult === null, "TESTE 3: Rejeição estrita de token expirado");

  // -------------------------------------------------------------
  // TESTE 4: Proteção contra SQL Injection via Prisma ORM
  // -------------------------------------------------------------
  const sqlInjectionInput = "'; DROP TABLE \"Company\"; --";
  const safeQuery = await prisma.company.findMany({
    where: { razaoSocial: { contains: sqlInjectionInput } },
  });
  const tableStillExists = await prisma.company.count();
  assert(
    Array.isArray(safeQuery) && typeof tableStillExists === "number",
    "TESTE 4: Consultas parametrizadas impedem ataques de SQL Injection"
  );

  // -------------------------------------------------------------
  // TESTE 5: Armazenamento seguro de dados sem execução de scripts (XSS Safe)
  // -------------------------------------------------------------
  const xssPayload = "<script>alert('XSS Attack!')</script>";
  const testOrg = await prisma.organization.create({
    data: {
      name: `Org XSS Safe ${xssPayload}`,
      slug: `org-xss-${seed}`,
    },
  });
  const retrievedOrg = await prisma.organization.findUnique({ where: { id: testOrg.id } });
  assert(
    retrievedOrg?.name.includes("<script>") === true,
    "TESTE 5: Armazenamento seguro de payloads sem execução de código não confiável"
  );

  // -------------------------------------------------------------
  // TESTE 6: LGPD / Opt-Out & Lista de Supressão
  // -------------------------------------------------------------
  const testCompany = await prisma.company.create({
    data: {
      cnpj: `999999${String(seed).slice(-8)}`,
      razaoSocial: "Empresa Opt-Out Teste",
      dataAbertura: new Date(),
      situacao: "ATIVA",
      cnaePrincipal: "5611201",
      municipio: "São Paulo",
      uf: "SP",
      telefone: "11999991111",
      email: "optout@teste.com.br",
    },
  });

  const testCampaign = await prisma.campaign.create({
    data: {
      organizationId: testOrg.id,
      name: "Campanha Compliance",
      productName: "ERP",
      status: "LIVE",
      icpFilters: "{}",
    },
  });

  const testLead = await prisma.lead.create({
    data: {
      organizationId: testOrg.id,
      campaignId: testCampaign.id,
      companyId: testCompany.id,
      score: 90,
      status: "QUALIFIED",
    },
  });

  // 1. Inserir na lista de supressão por Opt-out
  await prisma.suppressionList.create({
    data: {
      organizationId: testOrg.id,
      channel: "EMAIL",
      identifier: "optout@teste.com.br",
      reason: "OPT_OUT_REQUESTED",
      source: "USER_REQUEST",
    },
  });

  const complianceCheck = await validateOutreachCompliance({
    organizationId: testOrg.id,
    campaignId: testCampaign.id,
    leadId: testLead.id,
    channel: "EMAIL",
    identifier: "optout@teste.com.br",
  });

  assert(
    complianceCheck.allowed === false && Boolean(complianceCheck.blockedReason?.includes("opt-out")),
    "TESTE 6: Compliance LGPD bloqueia envio imediato para contatos presentes na lista de supressão"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runSecurityHardeningTests().catch((err) => {
  console.error("Erro fatal nos testes de Segurança:", err);
  process.exit(1);
});
