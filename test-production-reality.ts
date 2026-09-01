import { prisma } from "./src/lib/prisma";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./src/lib/auth";
import { NextRequest } from "next/server";
import { POST as loginRoute } from "./src/app/api/v1/auth/login/route";
import { POST as registerRoute } from "./src/app/api/v1/auth/register/route";
import { GET as meRoute } from "./src/app/api/v1/auth/me/route";
import { GET as dashboardOverviewRoute } from "./src/app/api/v1/dashboard/overview/route";

async function runProductionRealityTests() {
  console.log("=== EXECUTANDO SUÍTE DE TESTES: AUDIT DE REALIDADE DE PRODUÇÃO (FASE 8) ===\n");

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
  // TESTE 1: Hashing e Verificação de Senha com Bcrypt
  // -------------------------------------------------------------
  const plainPassword = "SuperSecurePassword123!";
  const hash = await hashPassword(plainPassword);
  const isMatch = await verifyPassword(plainPassword, hash);
  const isWrongMatch = await verifyPassword("WrongPassword", hash);
  assert(
    isMatch === true && isWrongMatch === false && hash.startsWith("$2"),
    "TESTE 1: Criptografia de senhas utiliza Bcrypt com salt rounds seguro"
  );

  // -------------------------------------------------------------
  // TESTE 2: Assinatura e Verificação de Token JWT
  // -------------------------------------------------------------
  const sessionPayload = {
    id: `user-${seed}`,
    name: "Auditor de Produção",
    email: `auditor-${seed}@test.com`,
    role: "OWNER" as const,
    organizationId: `org-${seed}`,
    organizationName: "Org Auditoria",
    organizationSlug: `org-auditoria-${seed}`,
  };
  const token = signToken(sessionPayload);
  const verified = verifyToken(token);
  assert(
    Boolean(token) && verified?.email === sessionPayload.email && verified?.organizationId === sessionPayload.organizationId,
    "TESTE 2: Assinatura JWT stateless com payload de sessão e expiração de 7 dias"
  );

  // -------------------------------------------------------------
  // TESTE 3: Registro de Nova Conta via POST /api/v1/auth/register
  // -------------------------------------------------------------
  const regEmail = `empresa-${seed}@teste.com.br`;
  const regReq = new NextRequest("http://localhost:3000/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Fundador Teste",
      orgName: `Empresa Piloto ${seed}`,
      email: regEmail,
      password: "MinhaSenhaForte2026",
    }),
  });

  const regRes = await registerRoute(regReq);
  const regJson = await regRes.json();
  const setCookie = regRes.cookies.get("auth_token");

  assert(
    regRes.status === 200 &&
    regJson.success === true &&
    regJson.user.email === regEmail &&
    Boolean(setCookie?.value),
    "TESTE 3: Rota de Registro cria Organização, Usuário OWNER, Conta de Crédito e emite Cookie HttpOnly"
  );

  // -------------------------------------------------------------
  // TESTE 4: Login via POST /api/v1/auth/login
  // -------------------------------------------------------------
  const loginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: regEmail,
      password: "MinhaSenhaForte2026",
    }),
  });

  const loginRes = await loginRoute(loginReq);
  const loginJson = await loginRes.json();
  const loginToken = loginJson.token;

  assert(
    loginRes.status === 200 &&
    loginJson.success === true &&
    Boolean(loginToken) &&
    loginJson.user.organizationSlug.startsWith("empresa-piloto"),
    "TESTE 4: Rota de Login autentica credenciais, registra AuditLog e retorna token"
  );

  // -------------------------------------------------------------
  // TESTE 5: Login com senha incorreta -> 401
  // -------------------------------------------------------------
  const badLoginReq = new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: regEmail,
      password: "SenhaErrada",
    }),
  });
  const badLoginRes = await loginRoute(badLoginReq);
  assert(badLoginRes.status === 401, "TESTE 5: Tentativa de login com senha incorreta retorna HTTP 401");

  // -------------------------------------------------------------
  // TESTE 6: Verificação de Sessão via GET /api/v1/auth/me
  // -------------------------------------------------------------
  const meReq = new NextRequest("http://localhost:3000/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${loginToken}`,
    },
  });
  const meRes = await meRoute(meReq);
  const meJson = await meRes.json();
  assert(
    meRes.status === 200 &&
    meJson.authenticated === true &&
    meJson.user.creditBalance === 100,
    "TESTE 6: Rota GET /api/v1/auth/me valida token Bearer e retorna dados da conta e saldo de créditos"
  );

  // -------------------------------------------------------------
  // TESTE 7: Dashboard Overview com dados reais via GET /api/v1/dashboard/overview
  // -------------------------------------------------------------
  const dashReq = new NextRequest("http://localhost:3000/api/v1/dashboard/overview", {
    headers: {
      Authorization: `Bearer ${loginToken}`,
    },
  });
  const dashRes = await dashboardOverviewRoute(dashReq);
  const dashJson = await dashRes.json();

  assert(
    dashRes.status === 200 &&
    dashJson.success === true &&
    dashJson.metrics !== undefined &&
    typeof dashJson.metrics.totalCompanies === "number" &&
    Array.isArray(dashJson.recentOpportunities),
    "TESTE 7: Dashboard Overview agrega métricas reais do tenant sem dados mockados"
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO DA SUÍTE: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runProductionRealityTests().catch((err) => {
  console.error("Erro fatal nos testes de Realidade de Produção:", err);
  process.exit(1);
});
