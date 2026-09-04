import { prisma } from "@/lib/prisma";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  organizationId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
}

export interface LogEntry {
  level: LogLevel;
  module?: string;
  action: string;
  organizationId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  details?: Record<string, unknown> | null;
  durationMs?: number | null;
  error?: unknown;
}

export interface AuditLogEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "bearer",
  "cookie",
  "card",
  "cvv",
  "jwt",
];

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));
      if (isSensitive) {
        sanitizedObj[k] = "***REDACTED***";
      } else {
        sanitizedObj[k] = sanitizeValue(v, depth + 1);
      }
    }
    return sanitizedObj;
  }
  return String(value);
}

function formatError(err: unknown): { message: string; stack?: string; code?: string } | null {
  if (!err) return null;
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      code: (err as any).code || undefined,
    };
  }
  if (typeof err === "string") {
    return { message: err };
  }
  return { message: JSON.stringify(err) };
}

export class AppLogger {
  private baseModule: string;

  constructor(baseModule = "app") {
    this.baseModule = baseModule;
  }

  public child(moduleName: string): AppLogger {
    return new AppLogger(moduleName);
  }

  public log(entry: LogEntry): void {
    const timestamp = new Date().toISOString();
    const sanitizedDetails = entry.details ? (sanitizeValue(entry.details) as Record<string, unknown>) : null;
    const formattedError = formatError(entry.error);
    const moduleName = entry.module || this.baseModule;

    const payload = {
      timestamp,
      level: entry.level,
      module: moduleName,
      action: entry.action,
      organizationId: entry.organizationId || null,
      userId: entry.userId || null,
      requestId: entry.requestId || null,
      durationMs: entry.durationMs !== undefined ? entry.durationMs : null,
      details: sanitizedDetails,
      error: formattedError,
    };

    const prefix = `[PLE-${entry.level.toUpperCase()}] [${timestamp}] [${moduleName}:${entry.action}]`;

    if (entry.level === "error") {
      console.error(prefix, JSON.stringify(payload));
    } else if (entry.level === "warn") {
      console.warn(prefix, JSON.stringify(payload));
    } else if (entry.level === "debug") {
      if (process.env.DEBUG === "true" || process.env.NODE_ENV !== "production") {
        console.debug(prefix, JSON.stringify(payload));
      }
    } else {
      console.log(prefix, JSON.stringify(payload));
    }
  }

  public info(action: string, details?: Record<string, unknown>, context?: LogContext, durationMs?: number): void {
    this.log({
      level: "info",
      module: this.baseModule,
      action,
      details,
      organizationId: context?.organizationId,
      userId: context?.userId,
      requestId: context?.requestId,
      durationMs,
    });
  }

  public warn(action: string, details?: Record<string, unknown>, context?: LogContext, durationMs?: number): void {
    this.log({
      level: "warn",
      module: this.baseModule,
      action,
      details,
      organizationId: context?.organizationId,
      userId: context?.userId,
      requestId: context?.requestId,
      durationMs,
    });
  }

  public error(action: string, error?: unknown, details?: Record<string, unknown>, context?: LogContext, durationMs?: number): void {
    this.log({
      level: "error",
      module: this.baseModule,
      action,
      error,
      details,
      organizationId: context?.organizationId,
      userId: context?.userId,
      requestId: context?.requestId,
      durationMs,
    });
  }

  public debug(action: string, details?: Record<string, unknown>, context?: LogContext): void {
    this.log({
      level: "debug",
      module: this.baseModule,
      action,
      details,
      organizationId: context?.organizationId,
      userId: context?.userId,
      requestId: context?.requestId,
    });
  }

  /**
   * Persiste auditoria regulatória e de segurança no banco de dados de forma não bloqueante
   */
  public async audit(entry: AuditLogEntry): Promise<void> {
    try {
      const sanitizedDetails = entry.details
        ? typeof entry.details === "string"
          ? entry.details
          : JSON.stringify(sanitizeValue(entry.details))
        : null;

      await prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId || null,
          userId: entry.userId || null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId || null,
          details: sanitizedDetails,
          ipAddress: entry.ipAddress || null,
        },
      });

      this.info(`AUDIT_${entry.action}`, {
        entity: entry.entity,
        entityId: entry.entityId,
      }, {
        organizationId: entry.organizationId,
        userId: entry.userId,
      });
    } catch (err) {
      this.error(`AUDIT_PERSIST_FAILED`, err, {
        action: entry.action,
        entity: entry.entity,
      });
    }
  }
}

export const logger = new AppLogger("system");

export function logEvent(entry: LogEntry | { level: "info" | "warn" | "error"; action: string; organizationId?: string; userId?: string; details?: Record<string, unknown>; error?: string }) {
  logger.log({
    level: entry.level as LogLevel,
    action: entry.action,
    organizationId: entry.organizationId,
    userId: entry.userId,
    details: entry.details,
    error: entry.error,
  });
}

/**
 * Wrapper de alta ordem para medição de latência e logging estruturado automático
 */
export async function withLogging<T>(
  moduleName: string,
  action: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const log = new AppLogger(moduleName);
  const start = Date.now();
  log.info(`${action}_STARTED`, undefined, context);
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    log.info(`${action}_SUCCESS`, undefined, context, durationMs);
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    log.error(`${action}_FAILED`, error, undefined, context, durationMs);
    throw error;
  }
}
