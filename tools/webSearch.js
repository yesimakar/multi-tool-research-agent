import { rankSources } from "./sourceQuality.js";

const DUCKDUCKGO_ENDPOINT = "https://api.duckduckgo.com/";

function splitTitleAndText(text, fallbackTitle) {
  const idx = text.indexOf(" - ");

  if (idx > 0) {
    return {
      title: text.slice(0, idx),
      description: text.slice(idx + 3),
    };
  }

  return {
    title: fallbackTitle || text,
    description: text,
  };
}

function collectEntries(data) {
  const entries = [];
  const seenUrls = new Set();

  const push = (title, url, description) => {
    if (!url || seenUrls.has(url)) return;

    seenUrls.add(url);
    entries.push({
      title: title || url,
      url,
      description: description || "",
    });
  };

  if (data.AbstractText && data.AbstractURL) {
    push(data.Heading || data.AbstractSource, data.AbstractURL, data.AbstractText);
  }

  for (const result of data.Results ?? []) {
    if (!result?.FirstURL || !result?.Text) continue;

    const { title, description } = splitTitleAndText(result.Text);
    push(title, result.FirstURL, description);
  }

  for (const topic of data.RelatedTopics ?? []) {
    if (Array.isArray(topic?.Topics)) {
      for (const nested of topic.Topics) {
        if (!nested?.FirstURL || !nested?.Text) continue;

        const { title, description } = splitTitleAndText(nested.Text);
        push(title, nested.FirstURL, description);
      }
    } else if (topic?.FirstURL && topic?.Text) {
      const { title, description } = splitTitleAndText(topic.Text);
      push(title, topic.FirstURL, description);
    }
  }

  return entries;
}

function formatRankedResult(result, index) {
  const quality = result.citation_quality;

  return [
    `${index + 1}. ${result.title}`,
    `   URL: ${result.url}`,
    `   Citation Quality: ${quality.label} (${quality.score}/100)`,
    `   Quality Checks: ${quality.reasons.join("; ")}`,
    `   Description: ${result.description}`,
  ].join("\n");
}

export async function webSearch(query, count = 5) {
  if (!query || !query.trim()) {
    return "Error: query is required";
  }

  const safeCount = Math.min(Math.max(Math.trunc(count) || 5, 1), 10);

  const url = new URL(DUCKDUCKGO_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (err) {
    return `Error: web search request failed (${err.message})`;
  }

  if (!response.ok) {
    return `Error: DuckDuckGo API returned ${response.status} ${response.statusText}`;
  }

  const data = await response.json();
  const entries = collectEntries(data);

  if (entries.length === 0) {
    return (
      `No results found for "${query}". DuckDuckGo's Instant Answer API only covers ` +
      `known entities/topics, not general news or web search. Try rephrasing the query ` +
      `as a named topic, organization, technology, or concept rather than a broad question.`
    );
  }

  const rankedEntries = rankSources(entries).slice(0, safeCount);

  return [
    `Search query: ${query}`,
    "",
    "Ranked sources with citation quality checks:",
    "",
    rankedEntries.map(formatRankedResult).join("\n\n"),
  ].join("\n");
}