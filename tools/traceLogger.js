import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, "..", "logs");
const TRACE_FILE = path.join(LOGS_DIR, "tool-calls.jsonl");

function preview(value, maxLength = 700) {
  if (value === undefined || value === null) {
    return value;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}... [truncated]`;
}

function sanitizeInput(input) {
  if (!input || typeof input !== "object") {
    return input;
  }

  const sanitized = { ...input };

  for (const key of Object.keys(sanitized)) {
    const normalized = key.toLowerCase();

    if (
      normalized.includes("key") ||
      normalized.includes("token") ||
      normalized.includes("secret") ||
      normalized.includes("password")
    ) {
      sanitized[key] = "[redacted]";
    }

    if (typeof sanitized[key] === "string" && sanitized[key].length > 700) {
      sanitized[key] = preview(sanitized[key]);
    }
  }

  return sanitized;
}

export async function logToolCall({
  callId,
  toolName,
  status,
  startedAt,
  finishedAt,
  durationMs,
  input,
  output,
  error,
}) {
  const record = {
    call_id: callId,
    tool_name: toolName,
    status,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    input: sanitizeInput(input),
    output_preview: preview(output),
    error: error ? preview(error) : null,
  };

  try {
    await mkdir(LOGS_DIR, { recursive: true });
    await appendFile(TRACE_FILE, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Trace logging should never break the agent workflow.
  }
}