/**
 * archiveNotice.ts: shared, framework-free handling of an entry's optional
 * `archiveNotice` banner (spec: specs/archived-entry-notice-spec.md).
 *
 * The SPA card (components/EntryCard.tsx) and the build-time bake
 * (scripts/prerenderBody.ts) both split the notice here, so the live app and the
 * crawlable HTML can never disagree about what is linked. Only https:// URLs
 * become links; every other scheme stays plain text.
 */

export interface NoticeSegment {
  text: string;
  href?: string;
}

const HTTPS_URL = /https:\/\/[^\s<>"']+/g;
const SENTENCE_PUNCTUATION = '.,;:!?';
const CLOSERS: Record<string, string> = { ')': '(', ']': '[' };

/**
 * Longest notice the compiler accepts. The page description (200) and feed summary (280)
 * put the notice before the original lead, so the cap keeps room for that lead.
 */
export const ARCHIVE_NOTICE_MAX_CHARS = 120;

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

/**
 * Drop sentence punctuation after a URL. A closing `)` or `]` is dropped only when
 * it has no matching opener inside the URL, so `.../Drift_(computing)` keeps its `)`.
 */
function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const last = url.slice(-1);
    if (SENTENCE_PUNCTUATION.includes(last)) {
      url = url.slice(0, -1);
    } else if (last in CLOSERS && count(url, last) > count(url, CLOSERS[last])) {
      url = url.slice(0, -1);
    } else {
      return url;
    }
  }
}

/** Split a notice into plain-text and https-link segments, in order. */
export function noticeSegments(notice: string): NoticeSegment[] {
  const segments: NoticeSegment[] = [];
  let cursor = 0;
  for (const match of notice.matchAll(HTTPS_URL)) {
    const start = match.index ?? 0;
    // Sentence punctuation after a URL belongs to the sentence, not the link.
    const url = trimUrl(match[0]);
    if (start > cursor) segments.push({ text: notice.slice(cursor, start) });
    segments.push({ text: url, href: url });
    cursor = start + url.length;
  }
  if (cursor < notice.length) segments.push({ text: notice.slice(cursor) });
  return segments;
}

/**
 * Lead plain-text copy (meta description, feed summary) with the notice when present,
 * closing the notice as a sentence so it does not run into the original text.
 */
export function withArchiveNotice(notice: string | undefined, text: string): string {
  if (!notice) return text;
  const lead = notice.trim();
  return `${/[.!?]$/.test(lead) ? lead : `${lead}.`} ${text}`;
}
