export interface LogEntry {
  level: "info" | "warn" | "error";
  action: string;
  organizationId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export function logEvent(entry: LogEntry) {
  const timestamp = new Date().toISOString();
  
  // Sanitize any potential secret keys in details
  const sanitizedDetails = { ...entry.details };
  for (const key of Object.keys(sanitizedDetails)) {
    if (
      key.toLowerCase().includes("password") ||
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("key")
    ) {
      sanitizedDetails[key] = "***REDACTED***";
    }
  }

  const logPayload = {
    timestamp,
    level: entry.level,
    action: entry.action,
    organizationId: entry.organizationId || null,
    userId: entry.userId || null,
    details: sanitizedDetails,
    error: entry.error || null,
  };

  if (entry.level === "error") {
    console.error(`[PLE-ERROR] [${timestamp}] [${entry.action}]`, JSON.stringify(logPayload));
  } else if (entry.level === "warn") {
    console.warn(`[PLE-WARN] [${timestamp}] [${entry.action}]`, JSON.stringify(logPayload));
  } else {
    console.log(`[PLE-INFO] [${timestamp}] [${entry.action}]`, JSON.stringify(logPayload));
  }
}
