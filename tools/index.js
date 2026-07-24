import { randomUUID } from "node:crypto";
import { webSearch } from "./webSearch.js";
import { summarize } from "./summarizer.js";
import { writeReport } from "./reportWriter.js";
import { logToolCall } from "./traceLogger.js";

export const TOOLS = [
  {
    name: "web_search",
    description:
      "Search the web for a query and return ranked sources with citation quality checks. " +
      "Use this to gather current information on a research topic.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
        count: {
          type: "integer",
          description: "Number of results to return, from 1 to 10. Defaults to 5.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "summarizer",
    description:
      "Summarize a block of research text into concise key bullet points. " +
      "Always run collected search results through this before writing a report.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to summarize.",
        },
        topic: {
          type: "string",
          description: "Optional research topic to focus the summary on.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "report_writer",
    description:
      "Write a structured Markdown research report with Executive Summary, Key Findings, Sources, " +
      "and Next Steps, then save it to reports/YYYY-MM-DD-{topic}.md.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research topic; used in the report title and filename.",
        },
        executive_summary: {
          type: "string",
          description: "A short 2-4 sentence executive summary of the findings.",
        },
        key_findings: {
          type: "string",
          description: "Markdown-formatted key findings, ideally as a bulleted list.",
        },
        sources: {
          type: "string",
          description:
            "Markdown-formatted list of sources and URLs used. Include citation quality labels when available.",
        },
        next_steps: {
          type: "string",
          description: "Markdown-formatted suggested next steps for further research.",
        },
      },
      required: ["topic", "executive_summary", "key_findings", "sources", "next_steps"],
    },
  },
];

async function executeTool(name, input) {
  switch (name) {
    case "web_search":
      return webSearch(input.query, input.count);

    case "summarizer":
      return summarize(input.text, input.topic);

    case "report_writer":
      return writeReport({
        topic: input.topic,
        executiveSummary: input.executive_summary,
        keyFindings: input.key_findings,
        sources: input.sources,
        nextSteps: input.next_steps,
      });

    default:
      return `Unknown tool: ${name}`;
  }
}

export async function runTool(name, input = {}) {
  const callId = randomUUID();
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  try {
    const output = await executeTool(name, input);
    const finishedAtDate = new Date();
    const finishedAt = finishedAtDate.toISOString();

    await logToolCall({
      callId,
      toolName: name,
      status: "success",
      startedAt,
      finishedAt,
      durationMs: finishedAtDate - startedAtDate,
      input,
      output,
      error: null,
    });

    return output;
  } catch (err) {
    const finishedAtDate = new Date();
    const finishedAt = finishedAtDate.toISOString();

    await logToolCall({
      callId,
      toolName: name,
      status: "error",
      startedAt,
      finishedAt,
      durationMs: finishedAtDate - startedAtDate,
      input,
      output: null,
      error: err.message,
    });

    return `Error: tool "${name}" failed (${err.message})`;
  }
}