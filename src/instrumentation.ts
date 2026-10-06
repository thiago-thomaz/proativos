export async function register() {
  // Apenas executar no runtime Node.js (não no Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const enableScheduler = process.env.ENABLE_INTERNAL_SCHEDULER !== "false";

    if (enableScheduler) {
      const { nativeScheduler } = await import("@/services/automation");
      console.log("🚀 [Instrumentation] Inicializando Native Autonomous Scheduler (Zero n8n)...");
      nativeScheduler.start();
      const status = nativeScheduler.getStatus();
      console.log(`✅ [Instrumentation] Scheduler nativo ativo com ${status.totalJobs} jobs autônomos.`);
    } else {
      console.log("ℹ️ [Instrumentation] Scheduler interno desativado via ENABLE_INTERNAL_SCHEDULER=false.");
    }
  }
}
