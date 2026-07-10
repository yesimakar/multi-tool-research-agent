import { webSearch } from "./webSearch.js";
import { summarize } from "./summarizer.js";
import { writeReport } from "./reportWriter.js";

export const TOOLS = [
  {
    name: "web_search",
    description:
      "Search the web for a query and return the top results (title, URL, description). " +
      "Use this to gather current information on a research topic.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
        count: {
          type: "integer",
          description: "Number of results to return (1-10). Defaults to 5.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "summarizer",
    description:
      "Summarize a block of text (e.g. search result snippets) into concise key bullet points. " +
      "Always run collected search results through this before writing a report.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to summarize." },
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
      "Write a structured Markdown research report (Executive Summary, Key Findings, Sources, " +
      "Next Steps) and save it to reports/YYYY-MM-DD-{topic}.md.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research topic; used in the report title and filename.",
        },
        executive_summary: {
          type: "string",
          description: "A short (2-4 sentence) executive summary of the findings.",
        },
        key_findings: {
          type: "string",
          description: "Markdown-formatted key findings, ideally as a bulleted list.",
        },
        sources: {
          type: "string",
          description: "Markdown-formatted list of sources/URLs used.",
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

export async function runTool(name, input) {
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
