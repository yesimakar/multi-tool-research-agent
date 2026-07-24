const STRONG_DOMAINS = [
  "docs.",
  "developer.",
  "cloud.google.com",
  "learn.microsoft.com",
  "docs.aws.amazon.com",
  "openai.com",
  "anthropic.com",
  "github.com",
  "ietf.org",
  "nist.gov",
  "w3.org",
];

const REFERENCE_DOMAINS = [
  "wikipedia.org",
  "britannica.com",
];

const WEAK_DOMAINS = [
  "medium.com",
  "substack.com",
  "reddit.com",
  "quora.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "linkedin.com",
];

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hasUsefulDescription(description) {
  return Boolean(description && description.trim().length >= 60);
}

function hasUsefulTitle(title) {
  return Boolean(title && title.trim().length >= 8);
}

export function assessCitationQuality(source) {
  const hostname = getHostname(source.url);
  const reasons = [];
  let score = 50;

  if (!hostname) {
    return {
      score: 20,
      label: "Weak",
      reasons: ["Invalid or missing URL"],
    };
  }

  if (source.url.startsWith("https://")) {
    score += 10;
    reasons.push("Uses HTTPS");
  } else {
    score -= 10;
    reasons.push("Does not use HTTPS");
  }

  if (hostname.endsWith(".gov")) {
    score += 20;
    reasons.push("Government source");
  }

  if (hostname.endsWith(".edu")) {
    score += 15;
    reasons.push("Educational source");
  }

  if (STRONG_DOMAINS.some((domain) => hostname.includes(domain))) {
    score += 15;
    reasons.push("Strong technical or official domain");
  }

  if (REFERENCE_DOMAINS.some((domain) => hostname.includes(domain))) {
    score += 8;
    reasons.push("Reference source");
  }

  if (WEAK_DOMAINS.some((domain) => hostname.includes(domain))) {
    score -= 15;
    reasons.push("User-generated or lower-authority source");
  }

  if (hasUsefulTitle(source.title)) {
    score += 5;
    reasons.push("Clear title");
  } else {
    score -= 5;
    reasons.push("Weak or missing title");
  }

  if (hasUsefulDescription(source.description)) {
    score += 10;
    reasons.push("Useful description");
  } else {
    score -= 5;
    reasons.push("Thin description");
  }

  score = Math.max(0, Math.min(100, score));

  let label = "Weak";
  if (score >= 85) {
    label = "Excellent";
  } else if (score >= 70) {
    label = "Strong";
  } else if (score >= 55) {
    label = "Usable";
  }

  return {
    score,
    label,
    reasons,
  };
}

export function rankSources(entries) {
  return entries
    .map((entry) => ({
      ...entry,
      citation_quality: assessCitationQuality(entry),
    }))
    .sort((a, b) => b.citation_quality.score - a.citation_quality.score);
}