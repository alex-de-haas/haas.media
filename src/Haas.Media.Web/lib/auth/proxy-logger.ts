const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function maskValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length ? `***${value.length}***` : "***redacted***";
  }

  if (typeof value === "number") {
    return "***redacted***";
  }

  if (typeof value === "object" && value !== null) {
    return Array.isArray(value) ? value.map(maskValue) : sanitizeAuthPayload(value);
  }

  return "***redacted***";
}

export function sanitizeAuthPayload<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizeAuthPayload(item)) as unknown as T;
  }

  if (isPlainObject(payload)) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const normalizedKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(normalizedKey)) {
        sanitized[key] = maskValue(value);
        continue;
      }

      sanitized[key] = sanitizeAuthPayload(value);
    }

    return sanitized as unknown as T;
  }

  return payload;
}

export function summarizeTextPayload(payload: string): string {
  if (payload.length <= 500) {
    return payload;
  }

  return `${payload.slice(0, 497)}...`;
}

export function parseAndSanitizeJson(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text);
    return sanitizeAuthPayload(parsed);
  } catch {
    return summarizeTextPayload(text);
  }
}

export async function getResponseSummary(response: Response): Promise<unknown> {
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    return parseAndSanitizeJson(text);
  } catch {
    return undefined;
  }
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface AuthProxyLogBase {
  requestId: string;
  operation: string;
}

interface AuthProxyRequestLog extends AuthProxyLogBase {
  method: string;
  targetUrl: string;
  payload?: unknown;
  hasAuthHeader?: boolean;
}

interface AuthProxyResponseLog extends AuthProxyLogBase {
  status: number;
  ok: boolean;
  durationMs: number;
  payload?: unknown;
}

interface AuthProxyErrorLog extends AuthProxyLogBase {
  durationMs: number;
  error: unknown;
}

export function createAuthProxyContext(operation: string) {
  return {
    requestId: generateRequestId(),
    operation,
    startedAt: Date.now(),
  };
}

export function logAuthProxyRequest(log: AuthProxyRequestLog): void {
  console.info("[AuthProxy]", getTimestamp(), "request", {
    requestId: log.requestId,
    operation: log.operation,
    method: log.method,
    targetUrl: log.targetUrl,
    hasAuthHeader: Boolean(log.hasAuthHeader),
    payload: log.payload !== undefined ? sanitizeAuthPayload(log.payload) : undefined,
  });
}

export function logAuthProxyResponse(log: AuthProxyResponseLog): void {
  console.info("[AuthProxy]", getTimestamp(), "response", {
    requestId: log.requestId,
    operation: log.operation,
    status: log.status,
    ok: log.ok,
    durationMs: log.durationMs,
    payload: log.payload,
  });
}

export function logAuthProxyError(log: AuthProxyErrorLog): void {
  console.error("[AuthProxy]", getTimestamp(), "error", {
    requestId: log.requestId,
    operation: log.operation,
    durationMs: log.durationMs,
    error: log.error instanceof Error ? { message: log.error.message, stack: log.error.stack } : log.error,
  });
}
