import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "reports");

// Strips everything but [a-z0-9-] so the result can never contain "/" or
// ".." — the slug goes straight into a filename inside REPORTS_DIR.
export function slugify(topic) {
  const slug = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "untitled";
}

export async function writeReport({ topic, executiveSummary, keyFindings, sources, nextSteps }) {
  if (!topic || !topic.trim()) {
    return "Error: topic is required";
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `${dateStr}-${slugify(topic)}.md`;
  const filePath = path.join(REPORTS_DIR, filename);

  const content = [
    `# Research Report: ${topic}`,
    "",
    `Generated: ${now.toISOString()}`,
    "",
    "## Executive Summary",
    "",
    (executiveSummary ?? "").trim() || "_No summary provided._",
    "",
    "## Key Findings",
    "",
    (keyFindings ?? "").trim() || "_No findings provided._",
    "",
    "## Sources",
    "",
    (sources ?? "").trim() || "_No sources provided._",
    "",
    "## Next Steps",
    "",
    (nextSteps ?? "").trim() || "_No next steps provided._",
    "",
  ].join("\n");

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(filePath, content, "utf8");

  return `Report saved to reports/${filename}`;
}
