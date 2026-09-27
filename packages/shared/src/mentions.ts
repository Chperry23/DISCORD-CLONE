/** Parse @username mentions (2–32 chars, Discord-like). */
const MENTION_REGEX = /@([a-zA-Z0-9_]{2,32})/g;

export function parseMentionUsernames(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
    const username = match[1];
    if (username) found.add(username.toLowerCase());
  }
  return [...found];
}

export function renderMentionContent(
  content: string,
  highlightClass = "mention",
): string {
  return content.replace(MENTION_REGEX, `<span class="${highlightClass}">@$1</span>`);
}
