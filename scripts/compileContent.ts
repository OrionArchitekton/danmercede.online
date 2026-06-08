/**
 * compileContent.ts
 *
 * Governed Publishing Automation - Content Compiler
 *
 * Reads markdown files from /inbox/ AND optionally from the dan-mercede-substrate
 * repo (`publishing/canonical/*.md`), validates against Publishing Contract,
 * and generates:
 *   - /constants.generated.ts (typed LogEntry[] array)
 *   - /public/posts.json (index for verification and RSS)
 *
 * Inbox is FAIL-CLOSED (validation failure → exit 1).
 * Substrate is FAIL-OPEN (filter mismatches/missing source are logged, not fatal).
 * On slug conflict, substrate wins (canonical is authoritative).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Type Definitions (mirrors types.ts)
// ============================================================================

export type Tag =
  | "systems"
  | "governance"
  | "failure-modes"
  | "execution"
  | "signal"
  | "infra"
  | "security"
  | "economics";

export type ContextLabel = "Infra" | "Governance" | "Systems" | "Execution" | "Signal";

export type TypeSlug =
  | "short-essay"
  | "experiment-log"
  | "status-update"
  | "thought-snippet"
  | "working-note";

type ContextSlug =
  | "governance"
  | "systems"
  | "infra"
  | "execution"
  | "signal"
  | "failure-modes";

type ExperimentResult = "Passed" | "Failed" | "Inconclusive";
type StatusValue = "Active" | "Paused" | "Rolled back" | "Investigating" | "Resolved";

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_TAGS: Tag[] = [
  "systems", "governance", "failure-modes", "execution",
  "signal", "infra", "security", "economics"
];

const TYPE_SLUG_TO_ENUM: Record<TypeSlug, string> = {
  'short-essay': 'EntryType.ShortEssay',
  'experiment-log': 'EntryType.ExperimentLog',
  'status-update': 'EntryType.StatusUpdate',
  'thought-snippet': 'EntryType.ThoughtSnippet',
  'working-note': 'EntryType.WorkingNote',
};

const TYPE_SLUG_TO_DISPLAY: Record<TypeSlug, string> = {
  'short-essay': 'Short Essay',
  'experiment-log': 'Experiment Log',
  'status-update': 'Status Update',
  'thought-snippet': 'Thought Snippet',
  'working-note': 'Working Note',
};

const CONTEXT_SLUG_TO_LABEL: Record<ContextSlug, ContextLabel> = {
  'governance': 'Governance',
  'systems': 'Systems',
  'infra': 'Infra',
  'execution': 'Execution',
  'signal': 'Signal',
  'failure-modes': 'Systems', // Maps to Systems as fallback
};

// Forbidden content patterns
const FORBIDDEN_PATTERNS = [
  /\bclient\b.*\bname\b/i,
  /\$[\d,]+\s*(revenue|profit|earnings)/i,
  /\b(buy|purchase|subscribe|sign up)\s+now\b/i,
  /\b(limited time|act now|don't miss)\b/i,
];

// ============================================================================
// Substrate Mapping Tables
// ============================================================================

// Substrate `type` → consumer TypeSlug.
// Known follow-up: introduce EssayLong UI if substrate long-form volume warrants it (revisit when 3+ canonicals exist).
const SUBSTRATE_TYPE_TO_CONSUMER: Record<string, TypeSlug> = {
  'essay-long': 'short-essay',
};

// Substrate `layer` → consumer Tag[] (max 3, matches compiler enforcement).
const LAYER_TO_TAGS: Record<string, Tag[]> = {
  'authority-gate': ['governance', 'execution'],
  'immutable-receipts': ['governance', 'infra'],
  'drift-guard': ['governance', 'failure-modes'],
  'gated-substrate': ['security', 'infra'],
};
const DEFAULT_SUBSTRATE_TAGS: Tag[] = ['governance'];

// Substrate `layer` → consumer ContextLabel.
const LAYER_TO_CONTEXT: Record<string, ContextLabel> = {
  'authority-gate': 'Governance',
  'immutable-receipts': 'Governance',
  'drift-guard': 'Systems',
  'gated-substrate': 'Infra',
};

// The surface this consumer publishes for. Canonicals not targeting this surface
// are silently filtered out (substrate is multi-surface; consumer is single-surface).
const THIS_SURFACE = 'danmercede.online';

// ============================================================================
// Validation Functions
// ============================================================================

interface ValidationError {
  file: string;
  field: string;
  message: string;
}

function validateType(type: unknown, file: string): TypeSlug | null {
  if (typeof type !== 'string') {
    return null;
  }
  // Normalize: accept underscores and convert to hyphens (e.g., short_essay → short-essay)
  const normalized = type.replace(/_/g, '-') as TypeSlug;
  const valid: TypeSlug[] = ['short-essay', 'experiment-log', 'status-update', 'thought-snippet', 'working-note'];
  return valid.includes(normalized) ? normalized : null;
}

function validateTags(tags: unknown, file: string): Tag[] | null {
  if (!Array.isArray(tags)) {
    return null;
  }
  if (tags.length > 3) {
    return null;
  }
  for (const tag of tags) {
    if (!ALLOWED_TAGS.includes(tag as Tag)) {
      return null;
    }
  }
  return tags as Tag[];
}

function validateDate(date: unknown, file: string): string | null {
  if (typeof date !== 'string') {
    return null;
  }

  // Accept full ISO 8601 with timezone: 2026-01-23T08:10:00-08:00 or 2026-01-23T08:10:00+0000
  const iso8601WithColon = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  const iso8601NoColon = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/;

  if (iso8601WithColon.test(date) || iso8601NoColon.test(date)) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return date;
    }
  }

  // Also accept simple date format: 2026-01-24 (convert to ISO 8601)
  const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (simpleDateRegex.test(date)) {
    const parsed = new Date(date + 'T12:00:00-08:00'); // Default to noon PST
    if (!isNaN(parsed.getTime())) {
      return date + 'T12:00:00-08:00';
    }
  }

  return null;
}

function validateContext(context: unknown): string | null {
  if (context === undefined || context === null) {
    return null; // Optional field
  }
  if (typeof context !== 'string') {
    return null;
  }
  // Accept standard contexts
  const standard: ContextSlug[] = ['governance', 'systems', 'infra', 'execution', 'signal', 'failure-modes'];
  if (standard.includes(context as ContextSlug)) {
    return context;
  }
  // Also accept extended contexts from classifier (docs, project, general, track)
  const extended = ['docs', 'project', 'general', 'track'];
  if (extended.includes(context) || context.startsWith('track:')) {
    return context;
  }
  return null;
}

function validateForbiddenContent(content: string, file: string): string[] {
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Forbidden pattern detected: ${pattern.source}`);
    }
  }
  return violations;
}

function validateRequiredFields(
  type: TypeSlug,
  data: Record<string, unknown>,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  const requiredByType: Record<TypeSlug, string[]> = {
    'short-essay': ['claim'],  // implication is optional
    'experiment-log': ['hypothesis', 'constraint', 'result', 'resultDetails', 'nextStep'],
    'status-update': ['status', 'whatChanged', 'whatBroke', 'nextStep'],
    'thought-snippet': ['content'],
    'working-note': ['content', 'openQuestion'],
  };

  const required = requiredByType[type] || [];
  for (const field of required) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push({ file, field, message: `Missing required field: ${field}` });
    }
  }

  // Type-specific validation
  if (type === 'experiment-log') {
    const validResults: ExperimentResult[] = ['Passed', 'Failed', 'Inconclusive'];
    if (!validResults.includes(data['result'] as ExperimentResult)) {
      errors.push({ file, field: 'result', message: `Invalid result. Must be: ${validResults.join(', ')}` });
    }
  }

  if (type === 'status-update') {
    const validStatuses: StatusValue[] = ['Active', 'Paused', 'Rolled back', 'Investigating', 'Resolved'];
    if (!validStatuses.includes(data['status'] as StatusValue)) {
      errors.push({ file, field: 'status', message: `Invalid status. Must be: ${validStatuses.join(', ')}` });
    }
  }

  if (type === 'thought-snippet') {
    const content = data['content'] as string || '';
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 200) {
      errors.push({ file, field: 'content', message: `Thought snippet exceeds 200 words (${wordCount} words)` });
    }
  }

  return errors;
}

// ============================================================================
// Timestamp Formatting
// ============================================================================

function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${ampm} PT`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// Entry Generation
// ============================================================================

export interface ParsedEntry {
  slug: string;
  title: string;
  date: string;
  timestamp: string;
  type: TypeSlug;
  typeEnum: string;
  context?: string;  // Can be ContextLabel or extended context
  tags: Tag[];
  fields: Record<string, unknown>;
  body: string;
  source?: 'inbox' | 'substrate';
}

function generateEntryCode(entry: ParsedEntry): string {
  const lines: string[] = [];
  lines.push(`  {`);
  lines.push(`    id: "${entry.slug}",`);
  lines.push(`    slug: "${entry.slug}",`);
  lines.push(`    title: ${JSON.stringify(entry.title)},`);
  lines.push(`    date: "${entry.date}",`);
  lines.push(`    timestamp: "${entry.timestamp}",`);
  lines.push(`    type: ${entry.typeEnum},`);

  if (entry.context) {
    lines.push(`    context: "${entry.context}",`);
  }

  lines.push(`    tags: ${JSON.stringify(entry.tags)},`);

  // Type-specific fields
  for (const [key, value] of Object.entries(entry.fields)) {
    if (typeof value === 'string') {
      // Escape backticks and handle multiline strings
      const escaped = value.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      if (value.includes('\n')) {
        lines.push(`    ${key}: \`${escaped}\`,`);
      } else {
        lines.push(`    ${key}: ${JSON.stringify(value)},`);
      }
    } else {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    }
  }

  lines.push(`  }`);
  return lines.join('\n');
}

// ============================================================================
// Substrate Reader
// ============================================================================

/**
 * Resolve the substrate root path. Strategy:
 *   1. If SUBSTRATE_PATH env is set AND points to an existing directory, use it.
 *   2. Else if the sibling-fallback `<projectRoot>/../dan-mercede-substrate` exists, use it.
 *   3. Else return null (consumer continues with inbox-only).
 */
export function resolveSubstratePath(projectRoot: string): string | null {
  const envPath = process.env.SUBSTRATE_PATH;
  if (envPath && envPath.trim() !== '') {
    if (fs.existsSync(envPath) && fs.statSync(envPath).isDirectory()) {
      return envPath;
    }
    console.log(`   ℹ️  SUBSTRATE_PATH set to "${envPath}" but directory does not exist; trying sibling fallback`);
  }

  const sibling = path.resolve(projectRoot, '..', 'dan-mercede-substrate');
  if (fs.existsSync(sibling) && fs.statSync(sibling).isDirectory()) {
    return sibling;
  }

  return null;
}

/**
 * Derive consumer tags from a substrate `layer`. Falls back to DEFAULT_SUBSTRATE_TAGS.
 */
export function deriveTagsFromLayer(layer: unknown): Tag[] {
  if (typeof layer !== 'string') return [...DEFAULT_SUBSTRATE_TAGS];
  const tags = LAYER_TO_TAGS[layer];
  return tags ? [...tags] : [...DEFAULT_SUBSTRATE_TAGS];
}

/**
 * Derive consumer context from a substrate `layer`. Returns undefined if unmapped
 * (the consumer treats `context` as optional).
 */
export function deriveContextFromLayer(layer: unknown): ContextLabel | undefined {
  if (typeof layer !== 'string') return undefined;
  return LAYER_TO_CONTEXT[layer];
}

/**
 * Map a single substrate frontmatter+body into a consumer ParsedEntry. Returns null
 * when the canonical is filtered out (wrong surface, wrong status, missing required
 * fields, or unmapped type). All filter decisions log to console.log (not stderr) —
 * substrate read is FAIL-OPEN.
 */
export function mapSubstrateToEntry(
  data: Record<string, unknown>,
  body: string,
  filename: string
): ParsedEntry | null {
  // Surface-targets filter
  const surfaceTargets = data['surface_targets'];
  if (!Array.isArray(surfaceTargets) || !surfaceTargets.includes(THIS_SURFACE)) {
    console.log(`   ℹ️  substrate canonical skipped (surface_targets): ${filename}`);
    return null;
  }

  // Status filter
  const status = data['status'];
  if (status !== 'canonical') {
    console.log(`   ℹ️  substrate canonical skipped (status="${String(status)}"): ${filename}`);
    return null;
  }

  // Required substrate fields
  const slug = data['slug'];
  const title = data['title'];
  const dateRaw = data['date'];
  const typeRaw = data['type'];
  const claim = data['claim'];
  const implication = data['implication'];
  const missing: string[] = [];
  if (typeof slug !== 'string' || !slug.trim()) missing.push('slug');
  if (typeof title !== 'string' || !title.trim()) missing.push('title');
  if (typeof dateRaw !== 'string' || !dateRaw.trim()) missing.push('date');
  if (typeof typeRaw !== 'string' || !typeRaw.trim()) missing.push('type');
  if (typeof claim !== 'string' || !claim.trim()) missing.push('claim');
  if (typeof implication !== 'string' || !implication.trim()) missing.push('implication');
  if (missing.length > 0) {
    console.log(`   ⚠️  substrate canonical skipped (missing required: ${missing.join(', ')}): ${filename}`);
    return null;
  }

  // Type mapping
  const consumerType = SUBSTRATE_TYPE_TO_CONSUMER[typeRaw as string];
  if (!consumerType) {
    console.log(`   ℹ️  substrate canonical skipped (unmapped type "${String(typeRaw)}"): ${filename}`);
    return null;
  }

  // Date validation (substrate always emits full ISO 8601 with timezone)
  const dateStr = validateDate(dateRaw, filename);
  if (!dateStr) {
    console.log(`   ⚠️  substrate canonical skipped (invalid date "${String(dateRaw)}"): ${filename}`);
    return null;
  }

  const layer = data['layer'];
  const tags = deriveTagsFromLayer(layer);
  const context = deriveContextFromLayer(layer);

  const fields: Record<string, unknown> = {
    claim: claim as string,
    implication: implication as string,
    content: body,
  };

  return {
    slug: slug as string,
    title: title as string,
    date: formatDate(dateStr),
    timestamp: formatTimestamp(dateStr),
    type: consumerType,
    typeEnum: TYPE_SLUG_TO_ENUM[consumerType],
    context,
    tags,
    fields,
    body,
    source: 'substrate',
  };
}

/**
 * Read all canonical markdowns from a substrate root. Iterates
 * `<substratePath>/publishing/canonical/*.md`, maps each, drops nulls.
 * Returns [] on missing/empty directory (fail-open).
 */
export function readSubstrateCanonicals(substratePath: string): ParsedEntry[] {
  const canonicalDir = path.join(substratePath, 'publishing', 'canonical');
  if (!fs.existsSync(canonicalDir) || !fs.statSync(canonicalDir).isDirectory()) {
    console.log(`   ℹ️  substrate canonical dir not found at ${canonicalDir}; skipping substrate read`);
    return [];
  }

  const files = fs.readdirSync(canonicalDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
  const entries: ParsedEntry[] = [];

  for (const file of files) {
    const filePath = path.join(canonicalDir, file);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.log(`   ⚠️  substrate canonical unreadable: ${file} (${e})`);
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw);
    } catch (e) {
      console.log(`   ⚠️  substrate canonical YAML parse failed: ${file} (${e})`);
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    const body = parsed.content.trim();
    const entry = mapSubstrateToEntry(data, body, file);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Merge inbox + substrate entries, deduping by slug. Substrate wins on conflict
 * (canonical is the authoritative version). Logs each replacement.
 */
export function mergeEntriesDedupBySlug(
  inbox: ParsedEntry[],
  substrate: ParsedEntry[]
): ParsedEntry[] {
  const bySlug = new Map<string, ParsedEntry>();
  for (const entry of inbox) {
    bySlug.set(entry.slug, entry);
  }
  for (const entry of substrate) {
    if (bySlug.has(entry.slug)) {
      console.log(`   ℹ️  substrate wins slug conflict: ${entry.slug} (inbox version replaced)`);
    }
    bySlug.set(entry.slug, entry);
  }
  return Array.from(bySlug.values());
}

// ============================================================================
// Inbox Reader
// ============================================================================

/**
 * Read inbox markdowns. FAIL-CLOSED: returns { entries, errors }; caller is
 * expected to abort the build if errors.length > 0.
 */
export function readInboxEntries(
  inboxDir: string
): { entries: ParsedEntry[]; errors: ValidationError[] } {
  const entries: ParsedEntry[] = [];
  const allErrors: ValidationError[] = [];

  if (!fs.existsSync(inboxDir)) {
    return { entries, errors: allErrors };
  }

  const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');

  for (const file of files) {
    const filePath = path.join(inboxDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    console.log(`\n   Processing: ${file}`);

    let parsed;
    try {
      parsed = matter(content);
    } catch (e) {
      allErrors.push({ file, field: 'frontmatter', message: `Failed to parse YAML: ${e}` });
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    const body = parsed.content.trim();

    if (!data.slug || typeof data.slug !== 'string') {
      allErrors.push({ file, field: 'slug', message: 'Missing or invalid slug' });
      continue;
    }

    if (!data.title || typeof data.title !== 'string') {
      allErrors.push({ file, field: 'title', message: 'Missing or invalid title' });
      continue;
    }

    const type = validateType(data.type, file);
    if (!type) {
      allErrors.push({ file, field: 'type', message: `Invalid type: ${data.type}. Must be: short-essay, experiment-log, status-update, thought-snippet, working-note` });
      continue;
    }

    const dateStr = validateDate(data.date, file);
    if (!dateStr) {
      allErrors.push({ file, field: 'date', message: `Invalid date format. Must be ISO 8601 with timezone (e.g., 2026-01-23T08:10:00-08:00)` });
      continue;
    }

    const tags = validateTags(data.tags, file);
    if (!tags) {
      allErrors.push({ file, field: 'tags', message: `Invalid tags. Must be array of max 3 from: ${ALLOWED_TAGS.join(', ')}` });
      continue;
    }

    let context: string | undefined;
    if (data.context !== undefined) {
      const contextVal = validateContext(data.context);
      if (contextVal === null && data.context !== undefined) {
        allErrors.push({ file, field: 'context', message: `Invalid context: ${data.context}` });
        continue;
      }
      if (contextVal) {
        context = CONTEXT_SLUG_TO_LABEL[contextVal as ContextSlug] || contextVal;
      }
    }

    const typeErrors = validateRequiredFields(type, data, file);
    if (typeErrors.length > 0) {
      allErrors.push(...typeErrors);
      continue;
    }

    const fullContent = JSON.stringify(data) + body;
    const forbiddenViolations = validateForbiddenContent(fullContent, file);
    if (forbiddenViolations.length > 0) {
      for (const v of forbiddenViolations) {
        allErrors.push({ file, field: 'content', message: v });
      }
      continue;
    }

    const fields: Record<string, unknown> = {};
    const baseFields = ['slug', 'title', 'date', 'type', 'context', 'tags'];

    for (const [key, value] of Object.entries(data)) {
      if (!baseFields.includes(key)) {
        fields[key] = value;
      }
    }

    if (body && (type === 'short-essay' || type === 'thought-snippet' || type === 'working-note')) {
      if (!fields['content'] && body) {
        fields['content'] = body;
      }
    }

    entries.push({
      slug: data.slug as string,
      title: data.title as string,
      date: formatDate(dateStr),
      timestamp: formatTimestamp(dateStr),
      type,
      typeEnum: TYPE_SLUG_TO_ENUM[type],
      context,
      tags,
      fields,
      body,
      source: 'inbox',
    });

    console.log(`   ✅ Valid: ${data.title}`);
  }

  return { entries, errors: allErrors };
}

// ============================================================================
// Main Compiler
// ============================================================================

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const inboxDir = path.join(projectRoot, 'inbox');
  const outputTs = path.join(projectRoot, 'constants.generated.ts');
  const outputJson = path.join(projectRoot, 'public', 'posts.json');

  console.log('📚 Compiling content...');
  console.log(`   Project root: ${projectRoot}`);
  console.log(`   Inbox: ${inboxDir}`);

  // 1. Inbox (FAIL-CLOSED)
  let inboxEntries: ParsedEntry[] = [];
  let allErrors: ValidationError[] = [];

  if (!fs.existsSync(inboxDir)) {
    console.log('   ℹ️  No inbox directory found.');
  } else {
    const inboxFiles = fs.readdirSync(inboxDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
    console.log(`   Found ${inboxFiles.length} inbox markdown file(s)`);
    if (inboxFiles.length > 0) {
      const result = readInboxEntries(inboxDir);
      inboxEntries = result.entries;
      allErrors = result.errors;
    }
  }

  // FAIL-CLOSED on inbox errors before reading substrate (substrate cannot rescue a broken inbox)
  if (allErrors.length > 0) {
    console.error('\n❌ INBOX VALIDATION FAILED\n');
    for (const err of allErrors) {
      console.error(`   ${err.file}: [${err.field}] ${err.message}`);
    }
    console.error(`\n   Total errors: ${allErrors.length}`);
    console.error('   Build aborted. Fix errors and retry.');
    process.exit(1);
  }

  // 2. Substrate (FAIL-OPEN)
  let substrateEntries: ParsedEntry[] = [];
  const substratePath = resolveSubstratePath(projectRoot);
  if (substratePath) {
    console.log(`\n   Substrate path: ${substratePath}`);
    substrateEntries = readSubstrateCanonicals(substratePath);
    console.log(`   Substrate canonicals admitted: ${substrateEntries.length}`);
  } else {
    console.log('\n   ℹ️  No substrate path resolved (SUBSTRATE_PATH unset + no sibling). Continuing with inbox only.');
  }

  // 3. Merge (substrate wins on slug conflict)
  const merged = mergeEntriesDedupBySlug(inboxEntries, substrateEntries);

  // 4. Empty-output short-circuit
  if (merged.length === 0) {
    console.log('\n✅ No entries to compile. Writing empty output.');
    writeEmptyOutput(outputTs, outputJson);
    process.exit(0);
  }

  // 5. Sort entries by date (newest first)
  merged.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // 6. Generate outputs
  const tsContent = generateTypeScriptOutput(merged);
  fs.writeFileSync(outputTs, tsContent, 'utf-8');
  console.log(`\n✅ Generated: ${outputTs}`);

  const jsonContent = generateJsonOutput(merged);
  fs.writeFileSync(outputJson, jsonContent, 'utf-8');
  console.log(`✅ Generated: ${outputJson}`);

  const inboxCount = merged.filter(e => e.source === 'inbox').length;
  const substrateCount = merged.filter(e => e.source === 'substrate').length;
  console.log(`\n📊 Summary: ${merged.length} entries compiled (inbox=${inboxCount}, substrate=${substrateCount}).`);
}

function writeEmptyOutput(tsPath: string, jsonPath: string) {
  const tsContent = `// Auto-generated by compileContent.ts
// Do not edit manually

import { LogEntry } from './types';

export const ENTRIES: LogEntry[] = [];
`;

  const jsonContent = JSON.stringify({
    generated: new Date().toISOString(),
    count: 0,
    posts: [],
  }, null, 2);

  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
}

function generateTypeScriptOutput(entries: ParsedEntry[]): string {
  const lines: string[] = [];

  lines.push('// Auto-generated by compileContent.ts');
  lines.push('// Do not edit manually');
  lines.push('');
  lines.push("import { LogEntry, EntryType } from './types';");
  lines.push('');
  lines.push('export const ENTRIES: LogEntry[] = [');

  for (let i = 0; i < entries.length; i++) {
    lines.push(generateEntryCode(entries[i]));
    if (i < entries.length - 1) {
      lines.push(',');
    }
  }

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

function generateJsonOutput(entries: ParsedEntry[]): string {
  const posts = entries.map(e => ({
    slug: e.slug,
    title: e.title,
    type: e.type,
    date: e.date,
  }));

  return JSON.stringify({
    generated: new Date().toISOString(),
    count: entries.length,
    posts,
  }, null, 2);
}

// Run only when invoked directly (not when imported by tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
