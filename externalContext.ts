import { EntryType, type LogEntry } from './types';

export interface ExternalContext {
  whyItMatters: string;
  plainTermsNote: string;
  guideUrl: string;
  guideLabel: string;
}

const GUIDE_CATALOG: Array<{ pattern: RegExp; url: string; label: string }> = [
  {
    pattern: /\bworktree\b|\bgit[- ]work[- ]?tree\b/i,
    url: 'https://www.danmercede.com/guides/git-worktree-overlap-report',
    label: 'Guide: Isolating Concurrent Agent Worktrees on danmercede.com',
  },
  {
    pattern: /\breceipts?\b|\battestation\b|\bdigest\b|\bsha[- ]?256\b/i,
    url: 'https://www.danmercede.com/guides/done-needs-a-receipt',
    label: 'Guide: Why Done Needs a Verification Receipt on danmercede.com',
  },
  {
    pattern: /\babstain|\babstention\b|\brefut(e|ation)\b|\bverifier\b/i,
    url: 'https://www.danmercede.com/guides/verifier-abstention-not-refutation',
    label: 'Guide: Verifier Abstention vs. Refutation on danmercede.com',
  },
  {
    pattern: /\bdouble[- ]send\b|\bidempoten|\bretry\b|\bdedup/i,
    url: 'https://www.danmercede.com/guides/governed-double-send-safe-delivery',
    label: 'Guide: Double-Send-Safe Delivery in Agent Pipelines on danmercede.com',
  },
  {
    pattern: /\bhandoff\b|\bhand-off\b|\bcompact\b|\bresume\b/i,
    url: 'https://www.danmercede.com/guides/hand-off-local-agent-tasks',
    label: 'Guide: Handing Off Long-Running Agent Tasks on danmercede.com',
  },
  {
    pattern: /\bsupervisor\b|\bswarm\b|\bmulti[- ]agent\b|\bcoordination\b/i,
    url: 'https://www.danmercede.com/guides/build-a-supervisor-agent',
    label: 'Guide: Building a Supervisor Pattern for Agents on danmercede.com',
  },
  {
    pattern: /\bbrowser\b|\bplaywright\b|\bchrome\b/i,
    url: 'https://www.danmercede.com/guides/multi-agent-browser-pool',
    label: 'Guide: Shared Browser Pools for Agents on danmercede.com',
  },
  {
    pattern: /\bschema\b|\bpydantic\b|\bjson[- ]?ld\b|\bfrontmatter\b/i,
    url: 'https://www.danmercede.com/guides/why-llm-schemas-get-rejected',
    label: 'Guide: Why LLM Output Schemas Get Rejected on danmercede.com',
  },
  {
    pattern: /\breview\b|\bci\b|\baudit\b|\bpre[- ]?pr\b/i,
    url: 'https://www.danmercede.com/guides/why-agent-code-needs-layered-review',
    label: 'Guide: Layered Code Review for Agent Output on danmercede.com',
  },
  {
    pattern: /\bprompt\b|\bregression\b|\beval\b|\bcanary\b/i,
    url: 'https://www.danmercede.com/guides/regression-test-ai-agent-prompt-model-change',
    label: 'Guide: Regression-Testing Agent Prompt Changes on danmercede.com',
  },
  {
    pattern: /\bcloudflare\b|\btraefik\b|\btailscale\b|\btunnel\b|\bself[- ]?host/i,
    url: 'https://www.danmercede.com/guides/self-hosting-websites-and-apps',
    label: 'Guide: Self-Hosting Apps Safely on danmercede.com',
  },
  {
    pattern: /\bvideo\b|\bffmpeg\b|\baudio\b|\bgpu\b/i,
    url: 'https://www.danmercede.com/guides/quality-video-on-local-hardware',
    label: 'Guide: Local Media Pipelines on danmercede.com',
  },
  {
    pattern: /\bsnapshot\b|\btruncat|\boutput\b/i,
    url: 'https://www.danmercede.com/guides/capture-agent-results-with-byte-bounded-snapshots',
    label: 'Guide: Byte-Bounded Snapshots for Agent Output on danmercede.com',
  },
  {
    pattern: /\borion[- ]pm\b|\bclaim\b|\bboard\b|\bqueue\b/i,
    url: 'https://www.danmercede.com/guides/coordinate-local-agents-with-orion-pm',
    label: 'Guide: Coordinating Parallel Local Agents on danmercede.com',
  },
  {
    pattern: /\bfail[- ]?closed\b|\bgate\b|\bharness\b|\bguard\b|\bboundary\b/i,
    url: 'https://www.danmercede.com/guides/the-fail-closed-harness',
    label: 'Guide: The Fail-Closed Agent Harness on danmercede.com',
  },
];

const DEFAULT_GUIDE = {
  url: 'https://www.danmercede.com/guides/agent-built-infrastructure-you-can-trust',
  label: 'Guide: Agent-Built Infrastructure You Can Trust on danmercede.com',
};

const TERM_GLOSSARY: Array<{ pattern: RegExp; term: string; definition: string }> = [
  {
    pattern: /\bfail[- ]?closed\b/i,
    term: 'fail-closed',
    definition: 'blocks the action on missing proof or error instead of silently continuing',
  },
  {
    pattern: /\bgate\b/i,
    term: 'gate',
    definition: 'a deterministic pre-execution check required before code or publishes advance',
  },
  {
    pattern: /\bsubstrate\b/i,
    term: 'substrate',
    definition: 'the canonical markdown source repository from which public sites compile',
  },
  {
    pattern: /\breceipt\b/i,
    term: 'receipt',
    definition: 'an immutable record tying an action to its verified inputs and exact outcome',
  },
  {
    pattern: /\blane\b/i,
    term: 'lane',
    definition: 'an isolated publishing or execution pipeline consuming frozen source artifacts',
  },
  {
    pattern: /\bcanary\b/i,
    term: 'canary',
    definition: 'a deliberate violation test proving a control actually fires rather than resting green',
  },
  {
    pattern: /\bdrift\b/i,
    term: 'drift',
    definition: 'silent divergence between source declarations and generated or deployed state',
  },
  {
    pattern: /\bpreflight\b/i,
    term: 'preflight',
    definition: 'a read-only environment readiness check run before any stateful deploy or mutation',
  },
  {
    pattern: /\bworktree\b/i,
    term: 'worktree',
    definition: 'an isolated branch checkout keeping parallel edits separate from clean main',
  },
  {
    pattern: /\bboundary\b/i,
    term: 'boundary',
    definition: 'the tool or interface layer where deterministic checks override prompt intent',
  },
  {
    pattern: /\borion\b/i,
    term: 'Orion',
    definition: 'our local multi-agent engineering setup used as a live testbed for production workflows',
  },
  {
    pattern: /\bredactor|\bdlp\b/i,
    term: 'redactor',
    definition: 'a pre-publish scanner keeping secrets, private hosts, and internal strings off public pages',
  },
  {
    pattern: /\bsystemd\b|\bprotecthome\b|\bunit\b/i,
    term: 'systemd isolation',
    definition: 'Linux service sandboxing that restricts filesystem and network access per process',
  },
  {
    pattern: /\bhook\b|\bpre-commit\b|\bpretooluse\b/i,
    term: 'hook',
    definition: 'an automated script triggered before a tool call, commit, or push completes',
  },
  {
    pattern: /\bschema\b|\bfrontmatter\b/i,
    term: 'schema validation',
    definition: 'enforcing required structured fields at parse time so malformed inputs fail before execution',
  },
  {
    pattern: /\brunner\b|\bci\b/i,
    term: 'CI runner',
    definition: 'the automated build machine running tests and checks before changes merge',
  },
  {
    pattern: /\bcuda\b|\bgpu\b/i,
    term: 'GPU/CUDA fallback',
    definition: 'explicit hardware pin checks verifying compute runs on CPU or GPU as intended rather than silently falling back',
  },
  {
    pattern: /\bprompt\b|\bmodel\b/i,
    term: 'prompt-boundary limit',
    definition: 'model instructions can advise behavior, whereas only code checks at the tool boundary enforce it',
  },
];

const FORBIDDEN_CTA = [
  'book a',
  '/book',
  'buy now',
  'sign up',
  'get started',
  'schedule a call',
  'contact us',
  'hire me',
  'book a call',
  'request a demo',
  'subscribe',
  'orionintelligenceagency',
];

export interface ContextSeed {
  title: string;
  type: EntryType | string;
  context?: string;
  tags?: string[];
  claim?: string;
  implication?: string;
  content?: string;
  hypothesis?: string;
  result?: string;
  resultDetails?: string;
  nextStep?: string;
  whatChanged?: string;
  whatBroke?: string;
  openQuestion?: string;
  caption?: string;
  externalContext?: Partial<ExternalContext>;
}

function collectSearchText(seed: ContextSeed): string {
  return [
    seed.title,
    seed.context ?? '',
    ...(seed.tags ?? []),
    seed.claim ?? '',
    seed.implication ?? '',
    seed.content ?? '',
    seed.resultDetails ?? '',
    seed.nextStep ?? '',
    seed.whatChanged ?? '',
    seed.whatBroke ?? '',
    seed.openQuestion ?? '',
    seed.hypothesis ?? '',
    seed.caption ?? '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSentence(raw: string): string {
  const cleaned = raw.replace(/`+/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (/[.!?]$/.test(cleaned)) return cleaned;
  return `${cleaned}.`;
}

function extractSentences(text: string): string[] {
  const cleaned = text.replace(/`+/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  return cleaned
    .split(/(?<!\.\.)(?<=[.!?]["']?)\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/\.{4}|\.{3}$/.test(s) && !/[\u2013\u2014\u2015]/.test(s))
    .map(normalizeSentence);
}

function firstCompleteSentence(text: string | undefined): string {
  if (!text) return '';
  const sentences = extractSentences(text);
  return sentences[0] ?? '';
}

function fallbackContextSecondSentence(seed: ContextSeed, cleanTitle: string): string {
  const topic = cleanTitle.replace(/[.!?]+$/, '');
  const ctx = seed.context ?? '';
  if (ctx === 'Governance') {
    return `For external engineering teams, "${topic}" shows why policy limits only hold when enforced at the tool boundary rather than in prompt prose.`;
  }
  if (ctx === 'Systems') {
    return `In multi-agent or distributed pipelines, "${topic}" prevents silent state assumptions from propagating across runs.`;
  }
  if (ctx === 'Infra') {
    return `Production operators outside Orion hit this exact boundary once services restart or move across hosts.`;
  }
  if (ctx === 'Execution') {
    return `When coding agents run unattended across sessions, "${topic}" keeps verification checks bound to actual workspace state.`;
  }
  return `Documented for builders adapting fail-closed verification patterns to production software systems.`;
}

export function selectGuide(seed: ContextSeed): { url: string; label: string } {
  const haystack = collectSearchText(seed);
  for (const item of GUIDE_CATALOG) {
    if (item.pattern.test(haystack)) {
      return { url: item.url, label: item.label };
    }
  }
  return DEFAULT_GUIDE;
}

export function buildPlainTermsNote(seed: ContextSeed): string {
  const haystack = collectSearchText(seed);
  const matched = TERM_GLOSSARY.filter((entry) => entry.pattern.test(haystack)).slice(0, 3);
  if (matched.length > 0) {
    return matched.map((m) => `${m.term} means ${m.definition}`).join('; ') + '.';
  }
  return 'Engineering log note translating an internal workflow observation into portable production rules for any agent or software team.';
}

export function deriveExternalContext(seed: ContextSeed): ExternalContext {
  const cleanTitle = seed.title.replace(/`+/g, '').replace(/\s+/g, ' ').trim() || 'this operational lesson';
  const primaryField =
    seed.type === EntryType.ExperimentLog
      ? seed.resultDetails || seed.nextStep || seed.claim || seed.content || ''
      : seed.claim ||
        seed.whatChanged ||
        seed.caption ||
        seed.content ||
        seed.resultDetails ||
        '';
  const primarySentences = extractSentences(primaryField);
  const sentence1 =
    primarySentences[0] ||
    normalizeSentence(`Working log observation on ${cleanTitle}`);

  const candidateSeconds = [
    firstCompleteSentence(seed.implication),
    firstCompleteSentence(seed.whatBroke),
    firstCompleteSentence(seed.nextStep),
    firstCompleteSentence(seed.openQuestion),
    primarySentences[1] ?? '',
    seed.type === EntryType.ExperimentLog ? '' : firstCompleteSentence(seed.resultDetails),
  ].filter((s) => s.length > 0 && s !== sentence1);

  const sentence2 = candidateSeconds[0] || fallbackContextSecondSentence(seed, cleanTitle);
  const guide = selectGuide(seed);
  return {
    whyItMatters: `${sentence1} ${sentence2}`,
    plainTermsNote: buildPlainTermsNote(seed),
    guideUrl: guide.url,
    guideLabel: guide.label,
  };
}

export function resolveExternalContext(entry: LogEntry): ExternalContext {
  const derived = deriveExternalContext(entry);
  const custom = entry.externalContext;
  if (!custom) return derived;
  return {
    whyItMatters:
      typeof custom.whyItMatters === 'string' && custom.whyItMatters.trim()
        ? custom.whyItMatters.trim()
        : derived.whyItMatters,
    plainTermsNote:
      typeof custom.plainTermsNote === 'string' && custom.plainTermsNote.trim()
        ? custom.plainTermsNote.trim()
        : derived.plainTermsNote,
    guideUrl:
      typeof custom.guideUrl === 'string' &&
      /^https:\/\/www\.danmercede\.com\/guides(\/[a-z0-9-]+)?$/.test(custom.guideUrl.trim())
        ? custom.guideUrl.trim()
        : derived.guideUrl,
    guideLabel:
      typeof custom.guideLabel === 'string' && custom.guideLabel.trim()
        ? custom.guideLabel.trim()
        : derived.guideLabel,
  };
}

export function validateExternalContext(
  raw: unknown,
  file: string,
  required = false,
): string[] {
  if (raw === undefined || raw === null) {
    return required ? [`${file}: missing required externalContext`] : [];
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return [`${file}: externalContext must be an object`];
  }
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const why = obj.whyItMatters;
  if (typeof why !== 'string' || !why.trim()) {
    errors.push(`${file}: externalContext.whyItMatters must be a non-empty string`);
  } else {
    const sentences = why.trim().split(/[.!?]+(?:\s|$)/).filter(Boolean);
    if (sentences.length < 2) {
      errors.push(`${file}: externalContext.whyItMatters must contain at least 2 sentences`);
    }
    if (/\.{4}|\.{3}(?:\s*$|\s*[.!?])/.test(why)) {
      errors.push(`${file}: externalContext.whyItMatters must contain complete sentences without ellipses truncation`);
    }
  }
  const plain = obj.plainTermsNote;
  if (typeof plain !== 'string' || !plain.trim()) {
    errors.push(`${file}: externalContext.plainTermsNote must be a non-empty string`);
  }
  const guideUrl = obj.guideUrl;
  if (
    typeof guideUrl !== 'string' ||
    !/^https:\/\/www\.danmercede\.com\/guides(\/[a-z0-9-]+)?$/.test(guideUrl.trim())
  ) {
    errors.push(`${file}: externalContext.guideUrl must point to https://www.danmercede.com/guides/...`);
  }
  const serialized = JSON.stringify(obj);
  if (/[\u2013\u2014\u2015]/.test(serialized)) {
    errors.push(`${file}: externalContext contains prohibited long dash`);
  }
  const lower = serialized.toLowerCase();
  for (const needle of FORBIDDEN_CTA) {
    if (lower.includes(needle)) {
      errors.push(`${file}: externalContext contains forbidden CTA needle "${needle}"`);
    }
  }
  return errors;
}
