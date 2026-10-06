import { nativeScheduler } from "./scheduler";
import { AppLogger } from "@/lib/logger";

const workerLogger = new AppLogger("automation-worker");

async function main() {
  workerLogger.info("INICIANDO WORKER DE AUTOMAÇÕES NATIVAS (ZERO N8N)...");

  // Iniciar agendador
  nativeScheduler.start();
  const status = nativeScheduler.getStatus();
  workerLogger.info(`Scheduler iniciado com sucesso: ${status.totalJobs} jobs carregados e ativos.`);

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    workerLogger.info(`Sinal de encerramento recebido (${signal}). Parando timers...`);
    nativeScheduler.stop();
    workerLogger.info("Worker encerrado com sucesso.");
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  // Manter processo vivo
  setInterval(() => {
    const s = nativeScheduler.getStatus();
    workerLogger.debug(`Heartbeat do scheduler: ${s.totalExecutions} execuções (${s.successfulExecutions} ok, ${s.failedExecutions} falhas).`);
  }, 60000);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Erro fatal no worker de automação:", err);
    process.exit(1);
  });
}
