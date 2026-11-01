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
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/** Split a notice into plain-text and https-link segments, in order. */
export function noticeSegments(notice: string): NoticeSegment[] {
  const segments: NoticeSegment[] = [];
  let cursor = 0;
  for (const match of notice.matchAll(HTTPS_URL)) {
    const start = match.index ?? 0;
    // Sentence punctuation after a URL belongs to the sentence, not the link.
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
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
