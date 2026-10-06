import { spawn, ChildProcess } from "child_process";

interface SmokeResult {
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number;
  durationMs: number;
  success: boolean;
  sampleBody?: any;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch {
      // Servidor ainda iniciando
    }
    await sleep(800);
  }
  return false;
}

async function runLiveServerSmoke() {
  console.log("================================================================================");
  console.log("🌐 INICIANDO AUDITORIA LIVE SERVER & HTTP SMOKE TEST (PORTA 3000)");
  console.log("================================================================================\n");

  const port = 3000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`🚀 Subindo servidor Next.js em modo produção (porta ${port})...`);
  const serverProcess: ChildProcess = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "start", "-p", String(port)],
    {
      shell: true,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let serverLogs = "";
  serverProcess.stdout?.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });
  serverProcess.stderr?.on("data", (chunk) => {
    serverLogs += chunk.toString();
  });

  const cleanup = () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    const isReady = await waitForServer(`${baseUrl}/health`);
    if (!isReady) {
      console.error("❌ Servidor não respondeu dentro do timeout de 25s.");
      console.error("Logs do servidor:\n", serverLogs);
      process.exit(1);
    }
    console.log("✅ Servidor respondendo 200 OK na porta 3000!\n");

    const results: SmokeResult[] = [];
    let authToken = "";

    // 1. GET /health (Root Health / Coolify Monitor)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      results.push({
        endpoint: "/health",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && body.coolify === "ready",
        sampleBody: body,
      });
    }

    // 2. GET /api/health (Service Health)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/health`);
      const body = await res.json();
      results.push({
        endpoint: "/api/health",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && body.status === "healthy",
        sampleBody: body,
      });
    }

    // 3. POST /api/v1/auth/login (Seed User Login)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "thiago@acmecorp.com.br",
          password: "proactive123",
        }),
      });
      const body = await res.json();
      if (body.token) {
        authToken = body.token;
      }
      results.push({
        endpoint: "/api/v1/auth/login",
        method: "POST",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && Boolean(body.token),
        sampleBody: { user: body.user, tokenReceived: Boolean(body.token) },
      });
    }

    // 4. GET /api/v1/auth/me (Authenticated Profile)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      results.push({
        endpoint: "/api/v1/auth/me",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && body.user?.email === "thiago@acmecorp.com.br",
        sampleBody: { email: body.user?.email, role: body.user?.role },
      });
    }

    // 5. GET /api/v1/companies (Database Records)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/companies?limit=5`);
      const body = await res.json();
      results.push({
        endpoint: "/api/v1/companies?limit=5",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && Array.isArray(body.companies),
        sampleBody: { total: body.total, countReturned: body.companies?.length },
      });
    }

    // 6. GET /api/v1/leads (Tenant Leads)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/leads`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      results.push({
        endpoint: "/api/v1/leads",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && Array.isArray(body.leads),
        sampleBody: { leadsFound: body.leads?.length },
      });
    }

    // 7. GET /api/v1/dashboard/overview (Dashboard Metrics)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/dashboard/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      results.push({
        endpoint: "/api/v1/dashboard/overview",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && Boolean(body.metrics),
        sampleBody: body.metrics,
      });
    }

    // 8. GET /api/v1/automation/scheduler (Autonomous Scheduler Status)
    {
      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/api/v1/automation/scheduler`, {
        headers: { "X-API-Key": process.env.INTERNAL_API_KEY || "ple_internal_service_key_sec_994827" },
      });
      const body = await res.json();
      results.push({
        endpoint: "/api/v1/automation/scheduler",
        method: "GET",
        status: res.status,
        expectedStatus: 200,
        durationMs: Date.now() - t0,
        success: res.status === 200 && body.status?.totalJobs === 26,
        sampleBody: { totalJobs: body.status?.totalJobs, running: body.status?.running },
      });
    }

    console.log("📊 RESULTADOS DAS REQUISIÇÕES HTTP REAIS:");
    console.log("--------------------------------------------------------------------------------");
    let allPassed = true;
    for (const r of results) {
      const mark = r.success ? "✅ PASSOU" : "❌ FALHOU";
      if (!r.success) allPassed = false;
      console.log(
        `${mark} | ${r.method.padEnd(4)} ${r.endpoint.padEnd(35)} | Status: ${r.status} (${r.durationMs}ms) | Payload: ${JSON.stringify(r.sampleBody)}`
      );
    }
    console.log("--------------------------------------------------------------------------------\n");

    if (!allPassed) {
      console.error("❌ Um ou mais testes de rota falharam.");
      process.exit(1);
    } else {
      console.log("🎉 TODOS OS 8 ENDPOINTS TESTADOS RETORNARAM 200 OK COM PAYLOADS VÁLIDOS!");
    }
  } finally {
    console.log("\n🛑 Encerrando processo do servidor de teste...");
    cleanup();
    await sleep(1000);
  }
}

runLiveServerSmoke().catch((err) => {
  console.error("Erro fatal no teste live de servidor:", err);
  process.exit(1);
});
