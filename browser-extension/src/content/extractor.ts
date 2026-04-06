/* ── Content Script — Extracts page content via Readability ── */
/* Injected into every page; only activates when popup sends EXTRACT_CONTENT */

import { Readability } from '@mozilla/readability';
import type { PageContent, ClipperMessage } from '../lib/types';

/** Extract article content from the current page */
function extractPageContent(): PageContent {
  // Clone document so Readability mutations don't affect the live page
  const docClone = document.cloneNode(true) as Document;

  const reader = new Readability(docClone, {
    charThreshold: 100,
  });

  const article = reader.parse();

  const title = article?.title || document.title || 'Untitled';
  const content = article?.content || document.body.innerHTML;
  const textContent = article?.textContent || document.body.textContent || '';
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return {
    title,
    byline: article?.byline || null,
    excerpt: article?.excerpt || null,
    content,
    textContent,
    siteName: article?.siteName || null,
    url: window.location.href,
    savedAt: new Date().toISOString(),
    wordCount,
  };
}

/** Listen for extraction requests from popup or background */
chrome.runtime.onMessage.addListener(
  (message: ClipperMessage, _sender, sendResponse) => {
    if (message.type !== 'EXTRACT_CONTENT') return false;

    try {
      const content = extractPageContent();
      sendResponse({ type: 'CONTENT_EXTRACTED', payload: content });
    } catch (err) {
      sendResponse({
        type: 'EXTRACTION_FAILED',
        error: err instanceof Error ? err.message : 'Extraction failed',
      });
    }

    return true; // keep channel open for async response
  },
);
