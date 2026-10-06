export type AutomationJobId =
  | "daily-company-discovery"
  | "company-ingestion"
  | "lead-qualification"
  | "contact-enrichment"
  | "outreach-dispatcher"
  | "cadence-scheduler"
  | "inbound-processor"
  | "provider-health-check"
  | "dead-letter-retry"
  | "daily-metrics"
  | "credit-reconciliation"
  | "opportunity-radar"
  | "opportunity-recalculation"
  | "market-size-refresh"
  | "reactivation-check"
  | "billing-usage-aggregation"
  | "low-credit-alert"
  | "lead-routing-dispatcher"
  | "meeting-reminders"
  | "revenue-synchronization"
  | "marketplace-fulfillment"
  | "refund-processing"
  | "campaign-optimizer"
  | "notification-dispatcher"
  | "customer-webhook-delivery"
  | "autonomous-sales-loop";

export type JobStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";

export interface JobExecutionResult {
  jobId: AutomationJobId;
  jobName: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number;
  recordsCount: number;
  errorMessage?: string;
  details?: any;
  executedAt: Date;
}

export interface NativeJobDefinition {
  id: AutomationJobId;
  name: string;
  description: string;
  defaultIntervalMs: number;
  cronPattern?: string;
  category: "DISCOVERY" | "ENRICHMENT" | "OUTREACH" | "REVENUE" | "SRE_SYSTEM";
  handler: () => Promise<{ recordsCount: number; details?: any }>;
}

export interface SchedulerMetrics {
  totalJobs: number;
  activeTimers: number;
  isRunning: boolean;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  uptimeSeconds: number;
  lastExecutionAt?: Date;
}
