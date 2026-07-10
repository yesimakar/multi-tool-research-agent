import "dotenv/config";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent } from "../agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "reports");

const DAILY_TOPIC = process.env.DAILY_TOPIC || "latest developments in AI governance";
const RESEARCH_PROMPT = process.env.DAILY_PROMPT || DAILY_TOPIC;

async function todaysReportExists(dateStr) {
  await mkdir(REPORTS_DIR, { recursive: true });
  const files = await readdir(REPORTS_DIR);
  return files.some((f) => f.startsWith(dateStr) && f.endsWith(".md"));
}

async function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  if (await todaysReportExists(dateStr)) {
    console.log(`[scheduler] A report for ${dateStr} already exists, skipping.`);
    return;
  }

  console.log(`[scheduler] Running daily research task: "${DAILY_TOPIC}"...`);

  let finalMessage;
  let failed = false;
  try {
    finalMessage = await runAgent(RESEARCH_PROMPT);
  } catch (err) {
    failed = true;
    finalMessage = `Agent run failed: ${err.message}`;
  }

  console.log(`[scheduler] Agent response:\n${finalMessage}`);

  // Safety net: the agent's report_writer tool call should have already
  // saved the real report. If it didn't (error, or the model skipped the
  // tool), don't fail silently — write down what we know.
  if (failed || !(await todaysReportExists(dateStr))) {
    const fallbackPath = path.join(REPORTS_DIR, `${dateStr}-scheduler-fallback.md`);
    const content = [
      `# Scheduler Fallback Report — ${dateStr}`,
      "",
      `Generated: ${now.toISOString()}`,
      `Status: ${failed ? "FAILED" : "no report_writer call detected"}`,
      `Topic: ${DAILY_TOPIC}`,
      "",
      "---",
      "",
      finalMessage,
      "",
    ].join("\n");
    await writeFile(fallbackPath, content, "utf8");
    console.log(`[scheduler] Fallback report saved to ${fallbackPath}`);
    if (failed) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[scheduler] Fatal error:", err);
  process.exitCode = 1;
});
