/**
 * checkInboxDrift.ts — Spec 4b D5 inbox-drift gate.
 *
 * D1 makes the committed bundle the deploy truth (Vercel never compiles).
 * This gate makes that enforceable: it recompiles inbox-only (no VERCEL,
 * no SUBSTRATE_PATH; caller pins TZ) and asserts every freshly compiled
 * entry exists identically in the committed public/posts.json, comparing
 * {slug, title, date, type}. The top-level `generated` timestamp is ignored.
 *
 * Documented limitation (Spec 4b D5): substrate-sourced committed entries are
 * not verifiable without substrate access — the committed bundle may contain
 * entries the fresh inbox-only compile does not (subset assertion). The gate
 * enforces "inbox edits must ship their recompiled bundle", which is exactly
 * the failure mode D1 introduces.
 *
 * The committed bytes of constants.generated.ts and public/posts.json are
 * ALWAYS restored afterward (success or failure) so the working tree is clean.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const generatedTsPath = path.join(projectRoot, 'constants.generated.ts');
const postsJsonPath = path.join(projectRoot, 'public', 'posts.json');

interface Post {
  slug: string;
  title: string;
  type: string;
  date: string;
}

interface PostsBundle {
  generated: string;
  count: number;
  posts: Post[];
}

/** Prefer the repo-local tsx binary; fall back to PATH (npm scripts add .bin). */
function resolveTsx(): string {
  const local = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  return fs.existsSync(local) ? local : 'tsx';
}

function main(): void {
  // Snapshot the committed bytes before the recompile touches anything.
  const committedTsBytes = fs.readFileSync(generatedTsPath);
  const committedJsonBytes = fs.readFileSync(postsJsonPath);

  let compileStatus: number | null = null;
  let compileStderr = '';
  let freshJsonRaw: string | null = null;

  try {
    // Inbox-only compile: VERCEL must be unset (the D1 guard would skip the
    // compile entirely) and SUBSTRATE_PATH must be unset (substrate must not
    // participate). TZ is inherited from the caller, which pins it.
    const env = { ...process.env };
    delete env.VERCEL;
    delete env.SUBSTRATE_PATH;

    const result = spawnSync(resolveTsx(), [path.join('scripts', 'compileContent.ts')], {
      cwd: projectRoot,
      env,
      encoding: 'utf-8',
    });
    compileStatus = result.status;
    compileStderr = result.stderr ?? '';

    if (fs.existsSync(postsJsonPath)) {
      freshJsonRaw = fs.readFileSync(postsJsonPath, 'utf-8');
    }
  } finally {
    // ALWAYS restore the committed bytes — the gate must leave the tree clean.
    fs.writeFileSync(generatedTsPath, committedTsBytes);
    fs.writeFileSync(postsJsonPath, committedJsonBytes);
  }

  if (compileStatus !== 0) {
    console.error(`❌ DRIFT CHECK FAILED: inbox-only compile exited ${compileStatus}`);
    if (compileStderr.trim()) {
      console.error(compileStderr.trim());
    }
    process.exit(1);
  }

  if (freshJsonRaw === null) {
    console.error('❌ DRIFT CHECK FAILED: compile did not produce public/posts.json');
    process.exit(1);
  }

  const fresh = JSON.parse(freshJsonRaw) as PostsBundle;
  const committed = JSON.parse(committedJsonBytes.toString('utf-8')) as PostsBundle;

  // Subset assertion keyed by slug: every fresh entry must exist in the
  // committed posts.json with identical {slug, title, date, type}.
  const committedBySlug = new Map<string, Post>(committed.posts.map(p => [p.slug, p]));
  const violations: string[] = [];

  for (const freshPost of fresh.posts) {
    const committedPost = committedBySlug.get(freshPost.slug);
    if (!committedPost) {
      violations.push(`${freshPost.slug}: missing from committed posts.json`);
      continue;
    }
    const driftedFields = (['title', 'date', 'type'] as const).filter(
      field => freshPost[field] !== committedPost[field]
    );
    if (driftedFields.length > 0) {
      const detail = driftedFields
        .map(f => `${f}: committed=${JSON.stringify(committedPost[f])} fresh=${JSON.stringify(freshPost[f])}`)
        .join('; ');
      violations.push(`${freshPost.slug}: field drift — ${detail}`);
    }
  }

  if (violations.length > 0) {
    console.error('❌ DRIFT CHECK FAILED: committed posts.json does not contain the recompiled inbox entries.');
    console.error('   Inbox edits must ship their recompiled bundle (npm run compile + commit).');
    for (const v of violations) {
      console.error(`   - ${v}`);
    }
    process.exit(1);
  }

  console.log(
    `PASS: inbox-drift gate — ${fresh.posts.length} recompiled inbox entries all present and identical in committed posts.json (committed count ${committed.posts.length}).`
  );
  process.exit(0);
}

main();
