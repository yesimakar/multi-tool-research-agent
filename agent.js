import "dotenv/config";
import readline from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool } from "./tools/index.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are a multi-tool research agent. Every user message is a research topic.

For every research topic, follow this workflow in order:
1. Call web_search (one or more queries, rephrase if the first pass is thin) to gather current information.
2. Call summarizer on the collected search result text to distill it into key bullet points. Do this even though you could summarize it yourself — the workflow requires an auditable summarizer tool call.
3. Call report_writer exactly once, with:
   - executive_summary: 2-4 sentences on the overall picture
   - key_findings: the summarized bullet points, organized and de-duplicated
   - sources: a Markdown list of the URLs/titles used
   - next_steps: 2-4 concrete suggestions for further research
4. After report_writer succeeds, reply with a brief confirmation (the saved file path) and a 3-5 sentence summary of the key findings. Do not just describe what a report would contain — you must actually call the tools and produce the file.

If web_search fails (e.g. missing API key), say so plainly and do not fabricate results.`;

export async function runAgent(userMessage) {
  const messages = [{ role: "user", content: userMessage }];

  while (true) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock ? textBlock.text : "";
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return "";
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    console.log(await runAgent(args.join(" ")));
    return;
  }

  console.log("Multi-Tool Research Agent — enter a research topic ('exit' to quit)\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    const userInput = (await ask("Topic: ")).trim();
    if (["exit", "quit"].includes(userInput.toLowerCase())) break;
    if (!userInput) continue;
    console.log(`\nAgent: ${await runAgent(userInput)}\n`);
  }
  rl.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
