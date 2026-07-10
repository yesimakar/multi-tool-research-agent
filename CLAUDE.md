# Multi-Tool Research Agent

A Node.js AI agent powered by Claude Opus 4.8 via the Anthropic SDK. Given a
research topic, it automatically searches the web, summarizes what it finds,
and writes a structured Markdown report to `reports/`.

## Stack

- **Runtime**: Node.js (ESM, `"type": "module"` — use `import`/`export`, not `require`)
- **SDK**: `@anthropic-ai/sdk`
- **Env**: `dotenv`
- **HTTP**: native `fetch` (Node 18+) — no HTTP client dependency
- **Orchestrator model**: `claude-opus-4-8`, adaptive thinking, streaming
- **Summarizer model**: `claude-haiku-4-5-20251001` — cheaper/faster, used only inside the `summarizer` tool for the bounded sub-task of condensing text
- **Search**: DuckDuckGo Instant Answer API — free, no key required. It only
  returns results for known entities/topics (Wikipedia-style), not general
  news or web search, so `web_search` frequently returns "no results" for
  news-y or trend-style queries; see README for the trade-off
- No TypeScript, no bundler, no framework. Keep the dependency list short.

## Setup

```bash
cp .env.example .env       # add ANTHROPIC_API_KEY (no search key needed)
npm install
```

## Running

```bash
npm start                                          # interactive: enter a topic
node agent.js "latest trends in AI governance"     # single research run
npm run scheduler                                  # run the daily research job once
```

## Project Structure

- `agent.js` — main entrypoint; agentic loop with a system prompt that
  enforces the research workflow (`web_search` → `summarizer` → `report_writer`)
- `tools/index.js` — tool registry and dispatcher
- `tools/webSearch.js` — DuckDuckGo Instant Answer API client (no key)
- `tools/summarizer.js` — calls Claude (haiku) to condense text into bullets
- `tools/reportWriter.js` — writes `reports/YYYY-MM-DD-{topic}.md`
- `scheduler/daily.js` — one-shot daily job, runs a default research topic
- `skills/` — reusable Claude Code skills (e.g. `task-execution`)
- `.claude/rules/` — saved corrections; house rules learned the hard way
- `.claude/agents/` — subagent definitions (e.g. `code-reviewer`)

## The research workflow

Every message sent to the agent is treated as a research topic. The system
prompt in `agent.js` requires, in order:

1. `web_search` — one or more queries to gather current information
2. `summarizer` — condense the collected search text into bullet points
   (always called explicitly, even though the orchestrator model could
   summarize on its own — this keeps the workflow auditable)
3. `report_writer` — called exactly once, with Executive Summary, Key
   Findings, Sources, and Next Steps, saved to `reports/`

## Adding Tools

1. Create `tools/your_tool.js` exporting a function that returns a string.
2. Import it in `tools/index.js`.
3. Add its JSON schema to the `TOOLS` array.
4. Add a `case` in `runTool()`.

## Tone

- Be direct and concise. No filler, no restating the question back at the user.
- Lead reports and summaries with the answer, not the process used to get there.
- When a tool call fails (missing API key, network error, empty search results),
  say so plainly instead of fabricating findings.

## Rules

- Never use `eval()`, `new Function()`, or any dynamic code execution on
  model or user input.
- Never log or write API keys (`ANTHROPIC_API_KEY`) to stdout, `reports/`,
  or tool results.
- `report_writer`'s filename must stay derived only from a sanitized slug
  (`tools/reportWriter.js::slugify`) — never build the file path from raw
  user/topic input directly, to avoid path traversal.
- Keep `agent.js` and `tools/` framework-free. Don't introduce Express,
  TypeScript, or a bundler without asking first.
- Tool functions must be pure and side-effect-free except where the tool's
  entire purpose is the side effect (`report_writer` writing files,
  `scheduler/daily.js` writing reports).
- Check `.claude/rules/` before making changes — project-specific
  corrections learned from past mistakes live there and take precedence
  over general habits.
