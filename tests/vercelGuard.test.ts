/**
 * Tests for the Spec 4b D1 Vercel compile guard (T1).
 *
 * On Vercel, the prebuild hook must NOT recompile content — the committed
 * bundle is the deploy truth. The guard exits 0 before any filesystem writes
 * when process.env.VERCEL is set.
 *
 * Uses node:test runner via tsx (no new test framework dependencies).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const generatedTsPath = path.join(projectRoot, 'constants.generated.ts');
const postsJsonPath = path.join(projectRoot, 'public', 'posts.json');

const SENTINEL =
  'VERCEL build environment detected — skipping compile; the committed bundle is served (Spec 4b D1).';

/** Prefer the repo-local tsx binary; fall back to PATH (npm scripts add .bin). */
function resolveTsx(): string {
  const local = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  return fs.existsSync(local) ? local : 'tsx';
}

test('VERCEL=1 compile exits 0, prints sentinel, leaves committed bundle byte-identical', () => {
  // Snapshot committed bytes before the invocation.
  const beforeTs = fs.readFileSync(generatedTsPath);
  const beforeJson = fs.readFileSync(postsJsonPath);

  const result = spawnSync(resolveTsx(), [path.join('scripts', 'compileContent.ts')], {
    cwd: projectRoot,
    env: { ...process.env, VERCEL: '1' },
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });

  assert.equal(
    result.status,
    0,
    `expected exit 0, got ${String(result.status)}; stderr: ${result.stderr}`
  );
  assert.ok(
    result.stdout.includes(SENTINEL),
    `stdout missing sentinel line.\nExpected to contain: ${SENTINEL}\nGot: ${result.stdout}`
  );

  const afterTs = fs.readFileSync(generatedTsPath);
  const afterJson = fs.readFileSync(postsJsonPath);
  assert.ok(beforeTs.equals(afterTs), 'constants.generated.ts bytes changed under VERCEL=1');
  assert.ok(beforeJson.equals(afterJson), 'public/posts.json bytes changed under VERCEL=1');
});
