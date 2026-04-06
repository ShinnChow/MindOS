/* ── Markdown Conversion Pipeline ── */

import type { PageContent, ClipDocument } from './types';

/** Sanitize a string for use as filename */
export function sanitizeFileName(title: string): string {
  return title
    .replace(/[\/\\?*:|"<>]/g, '-')  // illegal fs chars
    .replace(/\s+/g, ' ')            // collapse whitespace
    .replace(/^\.+/, '')             // no leading dots
    .trim()
    .slice(0, 120)                   // cap length
    || 'Untitled';
}

/** Generate YAML frontmatter block */
function frontmatter(meta: Record<string, string | null | undefined>): string {
  const lines = ['---'];
  for (const [key, val] of Object.entries(meta)) {
    if (val == null || val === '') continue;
    // Escape YAML special chars in values
    const safe = val.includes(':') || val.includes('#') || val.includes("'")
      ? `"${val.replace(/"/g, '\\"')}"`
      : val;
    lines.push(`${key}: ${safe}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

/** Convert extracted PageContent → ClipDocument */
export function toClipDocument(
  page: PageContent,
  space: string,
  turndownHtml: (html: string) => string,
): ClipDocument {
  const fileName = sanitizeFileName(page.title) + '.md';

  // Convert HTML content to Markdown
  const bodyMd = turndownHtml(page.content);

  // Build frontmatter
  const fm = frontmatter({
    title: page.title,
    source: page.url,
    author: page.byline,
    site: page.siteName,
    saved: page.savedAt,
  });

  const markdown = `${fm}# ${page.title}\n\n${bodyMd}\n`;

  return {
    fileName,
    markdown,
    space,
    wordCount: page.wordCount,
  };
}
