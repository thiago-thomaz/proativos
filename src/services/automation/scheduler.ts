import { AppLogger } from "@/lib/logger";
import { NATIVE_JOBS, executeNativeJob } from "./job-registry";
import { AutomationJobId, JobExecutionResult, SchedulerMetrics } from "./types";

const schedulerLogger = new AppLogger("native-scheduler");

export class NativeJobScheduler {
  private static instance: NativeJobScheduler;
  private isRunning: boolean = false;
  private startedAt?: Date;
  private timers: Map<AutomationJobId, NodeJS.Timeout> = new Map();
  private runningJobs: Set<AutomationJobId> = new Set();
  private lastResults: Map<AutomationJobId, JobExecutionResult> = new Map();

  private totalExecutions: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;

  private constructor() {}

  public static getInstance(): NativeJobScheduler {
    if (!NativeJobScheduler.instance) {
      NativeJobScheduler.instance = new NativeJobScheduler();
    }
    return NativeJobScheduler.instance;
  }

  /**
   * Inicia o motor de agendamento nativo com todos os timers em memória
   */
  public start(): void {
    if (this.isRunning) {
      schedulerLogger.warn("SCHEDULER_ALREADY_RUNNING");
      return;
    }

    this.isRunning = true;
    this.startedAt = new Date();
    schedulerLogger.info("SCHEDULER_STARTED", { totalJobs: NATIVE_JOBS.length });

    for (const job of NATIVE_JOBS) {
      // Configurar timer baseado no defaultIntervalMs
      const timer = setInterval(async () => {
        if (!this.isRunning) return;
        await this.runJob(job.id);
      }, job.defaultIntervalMs);

      // Desreferenciar timer para não bloquear encerramento do processo
      if (timer.unref) {
        timer.unref();
      }

      this.timers.set(job.id, timer);
    }
  }

  /**
   * Encerra todos os timers ativos (Graceful Shutdown)
   */
  public stop(): void {
    if (!this.isRunning) return;

    for (const [jobId, timer] of this.timers.entries()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.isRunning = false;
    schedulerLogger.info("SCHEDULER_STOPPED");
  }

  /**
   * Executa um job específico sob demanda com proteção de concorrência
   */
  public async runJob(jobId: AutomationJobId): Promise<JobExecutionResult> {
    if (this.runningJobs.has(jobId)) {
      schedulerLogger.warn("JOB_ALREADY_IN_PROGRESS", { jobId });
      return {
        jobId,
        jobName: jobId,
        status: "FAILED",
        durationMs: 0,
        recordsCount: 0,
        errorMessage: "Job já se encontra em execução simultânea.",
        executedAt: new Date(),
      };
    }

    this.runningJobs.add(jobId);
    try {
      const result = await executeNativeJob(jobId);
      this.totalExecutions++;
      if (result.status === "SUCCESS") {
        this.successfulExecutions++;
      } else {
        this.failedExecutions++;
      }
      this.lastResults.set(jobId, result);
      return result;
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Executa todos os 26 jobs sequencialmente (útil para auditoria ou inicialização)
   */
  public async runAllJobs(): Promise<JobExecutionResult[]> {
    schedulerLogger.info("SCHEDULER_RUN_ALL_REQUESTED");
    const results: JobExecutionResult[] = [];
    for (const job of NATIVE_JOBS) {
      const res = await this.runJob(job.id);
      results.push(res);
    }
    return results;
  }

  /**
   * Retorna o status e métricas operacionais do agendador
   */
  public getStatus(): SchedulerMetrics & {
    jobs: Array<{
      id: AutomationJobId;
      name: string;
      category: string;
      intervalMinutes: number;
      lastStatus?: "SUCCESS" | "FAILED";
      lastRunAt?: Date;
      lastDurationMs?: number;
    }>;
  } {
    const uptimeSeconds = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : 0;

    let latestRun: Date | undefined;
    for (const res of this.lastResults.values()) {
      if (!latestRun || res.executedAt > latestRun) {
        latestRun = res.executedAt;
      }
    }

    const jobStatuses = NATIVE_JOBS.map((j) => {
      const last = this.lastResults.get(j.id);
      return {
        id: j.id,
        name: j.name,
        category: j.category,
        intervalMinutes: Math.round(j.defaultIntervalMs / 60000),
        lastStatus: last?.status,
        lastRunAt: last?.executedAt,
        lastDurationMs: last?.durationMs,
      };
    });

    return {
      totalJobs: NATIVE_JOBS.length,
      activeTimers: this.timers.size,
      isRunning: this.isRunning,
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      uptimeSeconds,
      lastExecutionAt: latestRun,
      jobs: jobStatuses,
    };
  }
}

export const nativeScheduler = NativeJobScheduler.getInstance();
