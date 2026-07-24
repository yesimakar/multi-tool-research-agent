import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SUMMARIZER_MODEL =
  process.env.ANTHROPIC_SUMMARIZER_MODEL || "claude-haiku-4-5-20251001";

export async function summarize(text, topic) {
  if (!text || !text.trim()) {
    return "Error: no text provided to summarize";
  }

  const focus = topic ? ` relevant to "${topic}"` : "";
  const prompt =
    `Summarize the following research material into concise key bullet points${focus}. ` +
    `Use "- " bullets, one fact per bullet, no preamble or closing remarks.\n\n${text}`;

  try {
    const response = await client.messages.create({
      model: SUMMARIZER_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "Error: summarizer returned no text";
  } catch (err) {
    return `Error: summarization failed (${err.message})`;
  }
}
