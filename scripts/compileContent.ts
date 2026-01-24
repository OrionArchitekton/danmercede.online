/**
 * compileContent.ts
 * 
 * Governed Publishing Automation - Content Compiler
 * 
 * Reads markdown files from /inbox/, validates against Publishing Contract,
 * and generates:
 *   - /src/constants.generated.ts (typed LogEntry[] array)
 *   - /posts.json (index for verification and RSS)
 * 
 * FAIL-CLOSED: Any validation failure exits with code 1
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

type Tag = 
  | "systems"
  | "governance"
  | "failure-modes"
  | "execution"
  | "signal"
  | "infra"
  | "security"
  | "economics";

type ContextLabel = "Infra" | "Governance" | "Systems" | "Execution" | "Signal";

type TypeSlug = 
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
  const valid: TypeSlug[] = ['short-essay', 'experiment-log', 'status-update', 'thought-snippet', 'working-note'];
  return valid.includes(type as TypeSlug) ? (type as TypeSlug) : null;
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
  
  // Accept full ISO 8601 with timezone: 2026-01-23T08:10:00-08:00
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  if (iso8601Regex.test(date)) {
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

function validateContext(context: unknown): ContextSlug | null {
  if (context === undefined || context === null) {
    return null; // Optional field
  }
  if (typeof context !== 'string') {
    return null;
  }
  const valid: ContextSlug[] = ['governance', 'systems', 'infra', 'execution', 'signal', 'failure-modes'];
  return valid.includes(context as ContextSlug) ? (context as ContextSlug) : null;
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
    'short-essay': ['claim', 'implication'],
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

interface ParsedEntry {
  slug: string;
  title: string;
  date: string;
  timestamp: string;
  type: TypeSlug;
  typeEnum: string;
  context?: ContextLabel;
  tags: Tag[];
  fields: Record<string, unknown>;
  body: string;
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
// Main Compiler
// ============================================================================

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const inboxDir = path.join(projectRoot, 'inbox');
  const outputTs = path.join(projectRoot, 'constants.generated.ts');
  const outputJson = path.join(projectRoot, 'public', 'posts.json');
  
  console.log('📚 Compiling content from /inbox/...');
  console.log(`   Project root: ${projectRoot}`);
  console.log(`   Inbox: ${inboxDir}`);
  
  // Check inbox exists
  if (!fs.existsSync(inboxDir)) {
    console.log('✅ No inbox directory found. Creating empty generated file.');
    writeEmptyOutput(outputTs, outputJson);
    process.exit(0);
  }
  
  // Read all markdown files
  const files = fs.readdirSync(inboxDir)
    .filter(f => f.endsWith('.md') && f !== '.gitkeep');
  
  if (files.length === 0) {
    console.log('✅ No markdown files in inbox. Creating empty generated file.');
    writeEmptyOutput(outputTs, outputJson);
    process.exit(0);
  }
  
  console.log(`   Found ${files.length} markdown file(s)`);
  
  const entries: ParsedEntry[] = [];
  const allErrors: ValidationError[] = [];
  
  for (const file of files) {
    const filePath = path.join(inboxDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`\n   Processing: ${file}`);
    
    // Parse frontmatter
    let parsed;
    try {
      parsed = matter(content);
    } catch (e) {
      allErrors.push({ file, field: 'frontmatter', message: `Failed to parse YAML: ${e}` });
      continue;
    }
    
    const data = parsed.data as Record<string, unknown>;
    const body = parsed.content.trim();
    
    // Validate required base fields
    if (!data.slug || typeof data.slug !== 'string') {
      allErrors.push({ file, field: 'slug', message: 'Missing or invalid slug' });
      continue;
    }
    
    if (!data.title || typeof data.title !== 'string') {
      allErrors.push({ file, field: 'title', message: 'Missing or invalid title' });
      continue;
    }
    
    // Validate type
    const type = validateType(data.type, file);
    if (!type) {
      allErrors.push({ file, field: 'type', message: `Invalid type: ${data.type}. Must be: short-essay, experiment-log, status-update, thought-snippet, working-note` });
      continue;
    }
    
    // Validate date
    const dateStr = validateDate(data.date, file);
    if (!dateStr) {
      allErrors.push({ file, field: 'date', message: `Invalid date format. Must be ISO 8601 with timezone (e.g., 2026-01-23T08:10:00-08:00)` });
      continue;
    }
    
    // Validate tags
    const tags = validateTags(data.tags, file);
    if (!tags) {
      allErrors.push({ file, field: 'tags', message: `Invalid tags. Must be array of max 3 from: ${ALLOWED_TAGS.join(', ')}` });
      continue;
    }
    
    // Validate context (optional)
    let context: ContextLabel | undefined;
    if (data.context !== undefined) {
      const contextSlug = validateContext(data.context);
      if (contextSlug === null && data.context !== undefined) {
        allErrors.push({ file, field: 'context', message: `Invalid context: ${data.context}` });
        continue;
      }
      if (contextSlug) {
        context = CONTEXT_SLUG_TO_LABEL[contextSlug];
      }
    }
    
    // Validate required fields by type
    const typeErrors = validateRequiredFields(type, data, file);
    if (typeErrors.length > 0) {
      allErrors.push(...typeErrors);
      continue;
    }
    
    // Check forbidden content
    const fullContent = JSON.stringify(data) + body;
    const forbiddenViolations = validateForbiddenContent(fullContent, file);
    if (forbiddenViolations.length > 0) {
      for (const v of forbiddenViolations) {
        allErrors.push({ file, field: 'content', message: v });
      }
      continue;
    }
    
    // Extract type-specific fields
    const fields: Record<string, unknown> = {};
    const baseFields = ['slug', 'title', 'date', 'type', 'context', 'tags'];
    
    for (const [key, value] of Object.entries(data)) {
      if (!baseFields.includes(key)) {
        fields[key] = value;
      }
    }
    
    // If body has content and type uses 'content' field, prefer frontmatter but allow body override
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
    });
    
    console.log(`   ✅ Valid: ${data.title}`);
  }
  
  // FAIL-CLOSED: Exit on any errors
  if (allErrors.length > 0) {
    console.error('\n❌ VALIDATION FAILED\n');
    for (const err of allErrors) {
      console.error(`   ${err.file}: [${err.field}] ${err.message}`);
    }
    console.error(`\n   Total errors: ${allErrors.length}`);
    console.error('   Build aborted. Fix errors and retry.');
    process.exit(1);
  }
  
  // Sort entries by date (newest first)
  entries.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
  
  // Generate constants.generated.ts
  const tsContent = generateTypeScriptOutput(entries);
  fs.writeFileSync(outputTs, tsContent, 'utf-8');
  console.log(`\n✅ Generated: ${outputTs}`);
  
  // Generate posts.json
  const jsonContent = generateJsonOutput(entries);
  fs.writeFileSync(outputJson, jsonContent, 'utf-8');
  console.log(`✅ Generated: ${outputJson}`);
  
  console.log(`\n📊 Summary: ${entries.length} entries compiled successfully.`);
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

// Run
main();
