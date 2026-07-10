const DUCKDUCKGO_ENDPOINT = "https://api.duckduckgo.com/";

// DuckDuckGo's Instant Answer API has no ranked "top 10 web pages" results —
// it returns an Abstract (a Wikipedia-style summary, when the query matches
// a known entity/topic), plus Results/RelatedTopics arrays that are often
// empty for ordinary or news-style queries. This is a deliberate trade-off
// for "no API key, completely free" — see README for details.
function splitTitleAndText(text, fallbackTitle) {
  const idx = text.indexOf(" - ");
  if (idx > 0) {
    return { title: text.slice(0, idx), description: text.slice(idx + 3) };
  }
  return { title: fallbackTitle || text, description: text };
}

function collectEntries(data) {
  const entries = [];
  const seenUrls = new Set();

  const push = (title, url, description) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    entries.push({ title: title || url, url, description: description || "" });
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
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    return `Error: web search request failed (${err.message})`;
  }

  if (!response.ok) {
    return `Error: DuckDuckGo API returned ${response.status} ${response.statusText}`;
  }

  const data = await response.json();
  const entries = collectEntries(data).slice(0, safeCount);

  if (entries.length === 0) {
    return (
      `No results found for "${query}". DuckDuckGo's Instant Answer API only covers ` +
      `known entities/topics, not general news or web search — try rephrasing the query ` +
      `as a named topic (e.g. an organization, technology, or concept) rather than a question.`
    );
  }

  return entries
    .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.description}`.trim())
    .join("\n\n");
}
