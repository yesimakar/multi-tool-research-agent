---
name: task-execution
description: Execute a well-defined research task end-to-end using this agent's tool loop (agent.js) — break it into steps, call the relevant tools (web_search, summarizer, report_writer, or others added later), verify the result, and report back concisely. Use for any multi-step or tool-requiring request; not for open-ended chit-chat that needs no tools.
---

# Task Execution

A reusable procedure for running a task through this agent rather than
answering from memory. Follow this whenever a request needs a tool call,
multiple steps, or a verifiable result.

## Steps

1. **Restate the goal in one line.** If the request is ambiguous about scope
   or the expected output format, ask before proceeding rather than guessing.
2. **Identify which tools are needed**, if any. Check `tools/index.js` for
   the current `TOOLS` registry — don't assume a tool exists without
   checking, and don't fabricate a tool result.
3. **Execute one step at a time.** Call a tool, read its result, then decide
   the next step. Don't chain speculative tool calls before seeing prior
   results.
4. **Verify before reporting.** For search results, check they're actually
   relevant before summarizing them. For anything the tools can't verify,
   say so explicitly instead of asserting confidence you don't have.
5. **Report the outcome, not the process.** Give the final answer first. Only
   explain the steps taken if asked, or if the path there is non-obvious
   (e.g. an assumption you had to make).

## When a needed tool doesn't exist

Don't approximate a missing tool's behavior by hand. Say what's missing and,
if appropriate, propose adding it following the "Adding Tools" steps in
`CLAUDE.md`.

## Scheduled / unattended runs

If this task is being run non-interactively (e.g. via `scheduler/daily.js`),
there is no user to ask for clarification — prefer the most conservative
reading of the task and note any assumptions made in the output.
