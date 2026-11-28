// Structure test for .github/workflows/signal-cap.yml, the binding signal cap
// gate. The repo declares no YAML parser dependency, so this is a strict
// LINE-BASED check of a deliberately plain file: two-space indentation, block
// style only, one job. Anything the checker does not recognise is a violation,
// so a clever rewrite fails rather than slipping through.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'signal-cap.yml');
const CI_PATH = path.join(ROOT, '.github', 'workflows', 'ci.yml');

const PINNED_USES_RX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;
// The only place an expression may appear: a whole env value, fixed fields.
const ALLOWED_EXPRESSIONS = new Set([
  'github.event.pull_request.number',
  'github.event.pull_request.base.sha',
  'github.event.pull_request.head.sha',
  'secrets.GITHUB_TOKEN',
]);
const ENV_EXPRESSION_LINE_RX = /^ {10}[A-Z][A-Z0-9_]*: \$\{\{ ([A-Za-z0-9_.]+) \}\}$/;
const FORBIDDEN_COMMAND_RXS = [
  /\bnpm\b/, /\bnpx\b/, /\byarn\b/, /\bpnpm\b/, /\bbun\b/, /\bcorepack\b/,
  /\bgit\s+(checkout|switch|merge|pull|rebase|reset|restore|worktree|stash|cherry-pick|apply|am|submodule|clone)\b/,
  /\bgh\b/, /\bcurl\b/, /\bwget\b/, /\beval\b/, /\bsource\b/, /\bbash\b/, /\bsh\s+-c\b/, /\bpython3?\b/, /\btsx\b/, /\bmake\b/,
  /refs\/remotes\/pr\/head:/, /\bgit\s+show\b.*\|/, /\$GITHUB_ENV/, /\$GITHUB_PATH/, /\$GITHUB_OUTPUT/,
];
const EXPECTED_FETCH = 'git fetch --no-tags --no-recurse-submodules origin "+refs/pull/${PR_NUMBER}/head:refs/remotes/pr/head"';
const EXPECTED_GUARD = 'node tools/checkDailySignalCap.mjs';

// EXACT CONTRACT. The workflow, with comments and blank lines removed, must
// equal this list line for line. Any edit to the workflow (a pin, a step, one
// character of the fetch script) fails the test and forces a deliberate change
// here, in review. The rule-based checks further down stay as a second net and
// give a readable reason.
const CHECKOUT_USES = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE_USES = 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
const EXPECTED_TYPES = '[opened, synchronize, reopened, ready_for_review, edited]';
const EXPECTED_STEP_NAMES = [
  'Check out the base branch (never the PR)',
  'Set up Node (no cache)',
  'Fetch the PR head as data only',
  'Daily Pacific signal cap guard (base copy)',
];
const EXPECTED_FETCH_SCRIPT = [
  'set -euo pipefail',
  'if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then',
  '  echo "PR number is not a plain number" >&2',
  '  exit 2',
  'fi',
  'if ! [[ "$EXPECTED_HEAD_SHA" =~ ^[0-9a-f]{40}$ ]]; then',
  '  echo "event head is not a 40-hex commit id" >&2',
  '  exit 2',
  'fi',
  EXPECTED_FETCH,
  'fetched="$(git rev-parse --verify \'refs/remotes/pr/head^{commit}\')"',
  'if [ "$fetched" != "$EXPECTED_HEAD_SHA" ]; then',
  '  echo "fetched PR head does not match the event head" >&2',
  '  exit 2',
  'fi',
];
const EXPECTED_WORKFLOW_LINES = [
  'name: signal-cap',
  'on:',
  '  pull_request_target:',
  `    types: ${EXPECTED_TYPES}`,
  '    branches: [main]',
  'permissions:',
  '  contents: read',
  '  pull-requests: read',
  'jobs:',
  '  signal-cap:',
  '    name: signal-cap',
  '    runs-on: ubuntu-latest',
  '    steps:',
  `      - name: ${EXPECTED_STEP_NAMES[0]}`,
  `        uses: ${CHECKOUT_USES}`,
  '        with:',
  '          fetch-depth: 0',
  '          persist-credentials: false',
  `      - name: ${EXPECTED_STEP_NAMES[1]}`,
  `        uses: ${SETUP_NODE_USES}`,
  '        with:',
  '          node-version: 20',
  `      - name: ${EXPECTED_STEP_NAMES[2]}`,
  '        run: |',
  ...EXPECTED_FETCH_SCRIPT.map((line) => `          ${line}`),
  '        env:',
  '          PR_NUMBER: ${{ github.event.pull_request.number }}',
  '          EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
  `      - name: ${EXPECTED_STEP_NAMES[3]}`,
  `        run: ${EXPECTED_GUARD}`,
  '        env:',
  '          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
  '          BASE_SHA: ${{ github.event.pull_request.base.sha }}',
  '          HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
];

// Comments and blank lines removed; nothing else is normalized (indentation
// and trailing spaces count).
export function normalizedWorkflowLines(text) {
  return text.split('\n').map(stripComment).filter((line) => line.trim() !== '');
}

function stripComment(line) {
  // Comments in this file are whole-line, or follow a pinned `uses:` value.
  if (/^\s*#/.test(line)) {
    return '';
  }
  const uses = /^(\s*(?:- )?uses: \S+)\s+#.*$/.exec(line);
  return uses ? uses[1] : line;
}

function topLevelBlock(lines, key) {
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) {
    return null;
  }
  const block = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) {
      break;
    }
    if (lines[i].trim() !== '') {
      block.push(lines[i]);
    }
  }
  return block;
}

export function checkSignalCapWorkflow(text) {
  const problems = [];
  const fail = (message) => problems.push(message);
  if (/\t/.test(text) || /\r/.test(text)) {
    fail('tabs or carriage returns are not allowed');
  }
  const lines = text.split('\n').map(stripComment);
  const meaningful = lines.filter((line) => line.trim() !== '');

  // Exact contract first: the whole file, line for line.
  const actual = normalizedWorkflowLines(text);
  if (actual.length !== EXPECTED_WORKFLOW_LINES.length) {
    fail(`exact contract: ${actual.length} lines, expected ${EXPECTED_WORKFLOW_LINES.length}`);
  }
  for (let i = 0; i < Math.max(actual.length, EXPECTED_WORKFLOW_LINES.length); i += 1) {
    if (actual[i] !== EXPECTED_WORKFLOW_LINES[i]) {
      fail(`exact contract: line ${i + 1} is ${JSON.stringify(actual[i])}, expected ${JSON.stringify(EXPECTED_WORKFLOW_LINES[i])}`);
      break;
    }
  }

  // No YAML features that could hide structure from a line-based reader.
  for (const line of meaningful) {
    if (/(^|\s)[&*][A-Za-z0-9_-]+(\s|$)/.test(line) || /<<\s*:/.test(line)) {
      fail(`YAML anchor, alias or merge key: ${line.trim()}`);
    }
    if (/^\s*(- )?[A-Za-z0-9_-]+:\s*[{[]/.test(line) && !/^ {4}(types|branches): \[[a-z_, ]+\]$/.test(line)) {
      fail(`flow-style collection: ${line.trim()}`);
    }
    if (/^\s*["']/.test(line) || /^\s*\?/.test(line)) {
      fail(`quoted or explicit key: ${line.trim()}`);
    }
  }

  // Top-level keys: exactly these, once each.
  const topKeys = meaningful.filter((line) => /^\S/.test(line)).map((line) => line.replace(/:.*$/, ''));
  if (JSON.stringify(topKeys) !== JSON.stringify(['name', 'on', 'permissions', 'jobs'])) {
    fail(`top-level keys must be name, on, permissions, jobs; got ${topKeys.join(', ')}`);
  }
  if (!meaningful.includes('name: signal-cap')) {
    fail('workflow name must be signal-cap');
  }

  // Trigger: pull_request_target only, the four types, base main.
  const on = topLevelBlock(lines, 'on');
  const expectedOn = [
    '  pull_request_target:',
    `    types: ${EXPECTED_TYPES}`,
    '    branches: [main]',
  ];
  if (!on || JSON.stringify(on) !== JSON.stringify(expectedOn)) {
    fail('`on` must be exactly pull_request_target with the five types and branches [main]');
  }

  // Permissions: workflow level only, exactly the two read scopes.
  const permissions = topLevelBlock(lines, 'permissions');
  const expectedPermissions = ['  contents: read', '  pull-requests: read'];
  if (!permissions || JSON.stringify(permissions) !== JSON.stringify(expectedPermissions)) {
    fail('workflow permissions must be exactly contents: read and pull-requests: read');
  }
  if (meaningful.filter((line) => /^\s*permissions\s*:/.test(line)).length !== 1) {
    fail('permissions may be declared once, at workflow level');
  }

  // One job, named signal-cap.
  const jobs = topLevelBlock(lines, 'jobs') ?? [];
  const jobKeys = jobs.filter((line) => /^ {2}\S/.test(line));
  if (JSON.stringify(jobKeys) !== JSON.stringify(['  signal-cap:'])) {
    fail('there must be exactly one job, signal-cap');
  }
  const jobLevel = jobs.filter((line) => /^ {4}\S/.test(line)).map((line) => line.trim());
  if (JSON.stringify(jobLevel) !== JSON.stringify(['name: signal-cap', 'runs-on: ubuntu-latest', 'steps:'])) {
    fail(`job keys must be name: signal-cap, runs-on: ubuntu-latest, steps; got ${jobLevel.join(' | ')}`);
  }

  // Steps.
  const steps = [];
  for (const line of jobs.filter((entry) => /^ {6}/.test(entry))) {
    if (/^ {6}- /.test(line)) {
      steps.push([line.replace(/^ {6}- /, '        ')]);
    } else if (steps.length > 0) {
      steps[steps.length - 1].push(line);
    } else {
      fail(`content before the first step: ${line.trim()}`);
    }
  }
  const keyOf = (line) => /^ {8}([a-z-]+):/.exec(line)?.[1];
  const describe = (step) => {
    const keys = step.map(keyOf).filter(Boolean);
    const value = (key) => {
      const line = step.find((entry) => keyOf(entry) === key);
      return line === undefined ? undefined : line.replace(/^ {8}[a-z-]+:\s?/, '');
    };
    const nested = (key) => {
      const at = step.findIndex((entry) => keyOf(entry) === key);
      if (at === -1) {
        return [];
      }
      const out = [];
      for (let i = at + 1; i < step.length && /^ {10}/.test(step[i]); i += 1) {
        out.push(step[i]);
      }
      return out;
    };
    return { keys, value, nested };
  };
  for (const step of steps) {
    const { keys } = describe(step);
    for (const key of keys) {
      if (!['name', 'uses', 'with', 'run', 'env'].includes(key)) {
        fail(`step key not allowed: ${key}`);
      }
    }
  }
  if (steps.length !== 4) {
    fail(`expected exactly 4 steps (checkout, setup-node, fetch, guard); got ${steps.length}`);
  }

  // Every `uses:` pinned to a full commit id; only the two known actions.
  const usesLines = meaningful.filter((line) => /\buses\s*:/.test(line));
  for (const line of usesLines) {
    const value = line.replace(/^.*uses\s*:\s*/, '');
    if (!PINNED_USES_RX.test(value)) {
      fail(`action not pinned to a 40-hex commit: ${value}`);
    }
    if (!/^actions\/(checkout|setup-node)@/.test(value)) {
      fail(`unexpected action: ${value}`);
    }
  }
  if (usesLines.length !== 2) {
    fail(`expected exactly 2 actions; got ${usesLines.length}`);
  }

  // Checkout: base ref only, no credentials left behind.
  const checkout = steps.map(describe).find((step) => (step.value('uses') ?? '').startsWith('actions/checkout@'));
  if (!checkout) {
    fail('no actions/checkout step');
  } else {
    const inputs = checkout.nested('with').map((line) => line.trim());
    if (JSON.stringify([...inputs].sort()) !== JSON.stringify(['fetch-depth: 0', 'persist-credentials: false'])) {
      fail(`checkout inputs must be exactly fetch-depth: 0 and persist-credentials: false; got ${inputs.join(' | ')}`);
    }
    if (checkout.keys.includes('env') || checkout.keys.includes('run')) {
      fail('checkout step must not carry env or run');
    }
  }
  const setupNode = steps.map(describe).find((step) => (step.value('uses') ?? '').startsWith('actions/setup-node@'));
  if (!setupNode) {
    fail('no actions/setup-node step');
  } else {
    const inputs = setupNode.nested('with').map((line) => line.trim());
    if (JSON.stringify(inputs) !== JSON.stringify(['node-version: 20'])) {
      fail(`setup-node inputs must be exactly node-version: 20 (no cache); got ${inputs.join(' | ')}`);
    }
    if (setupNode.keys.includes('env') || setupNode.keys.includes('run')) {
      fail('setup-node step must not carry env or run');
    }
  }

  // Expressions: only whole env values from the fixed list; never in a run line.
  for (const line of meaningful) {
    if (!line.includes('${{') && !line.includes('}}')) {
      continue;
    }
    const match = ENV_EXPRESSION_LINE_RX.exec(line);
    if (!match || !ALLOWED_EXPRESSIONS.has(match[1])) {
      fail(`expression outside an allowed env value: ${line.trim()}`);
    }
  }

  // Run steps: collect every command line.
  const runSteps = steps.map(describe).filter((step) => step.keys.includes('run'));
  const commandsOf = (step) => {
    const inline = step.value('run');
    if (inline === '|') {
      return step.nested('run').map((line) => line.trim());
    }
    return [inline.trim()];
  };
  const allCommands = runSteps.flatMap(commandsOf);
  for (const command of allCommands) {
    if (command.includes('${{')) {
      fail(`expression inside a run line: ${command}`);
    }
    for (const rx of FORBIDDEN_COMMAND_RXS) {
      if (rx.test(command) && command !== EXPECTED_FETCH) {
        fail(`forbidden command: ${command}`);
      }
    }
    if (/\bnode\b/.test(command) && command !== EXPECTED_GUARD) {
      fail(`node may only run the base guard: ${command}`);
    }
    if (/\bgit\b/.test(command) && !/^(git fetch --no-tags --no-recurse-submodules origin |fetched="\$\(git rev-parse --verify )/.test(command)) {
      fail(`unexpected git command: ${command}`);
    }
  }
  if (runSteps.length !== 2) {
    fail(`expected exactly 2 run steps; got ${runSteps.length}`);
  }

  // Fetch step: PR head as data, verified against the event head.
  const fetchStep = runSteps.find((step) => commandsOf(step).includes(EXPECTED_FETCH));
  if (!fetchStep) {
    fail('the PR head must be fetched with the exact data-only fetch command');
  } else {
    const commands = commandsOf(fetchStep);
    const required = [
      'set -euo pipefail',
      'fetched="$(git rev-parse --verify \'refs/remotes/pr/head^{commit}\')"',
      'if [ "$fetched" != "$EXPECTED_HEAD_SHA" ]; then',
      'exit 2',
    ];
    for (const line of required) {
      if (!commands.includes(line)) {
        fail(`fetch step is missing: ${line}`);
      }
    }
    if (commands[0] !== 'set -euo pipefail') {
      fail('fetch step must start with set -euo pipefail');
    }
    const env = fetchStep.nested('env').map((line) => line.trim());
    const expectedEnv = [
      'PR_NUMBER: ${{ github.event.pull_request.number }}',
      'EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
    ];
    if (JSON.stringify(env) !== JSON.stringify(expectedEnv)) {
      fail('fetch step env must be exactly PR_NUMBER and EXPECTED_HEAD_SHA');
    }
  }

  // Guard step: the base copy, from the workspace root, with the token.
  const guardStep = runSteps.find((step) => step.value('run') === EXPECTED_GUARD);
  if (!guardStep) {
    fail(`the guard must be invoked exactly as: run: ${EXPECTED_GUARD}`);
  } else {
    const env = guardStep.nested('env').map((line) => line.trim());
    const expectedEnv = [
      'GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
      'BASE_SHA: ${{ github.event.pull_request.base.sha }}',
      'HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
    ];
    if (JSON.stringify(env) !== JSON.stringify(expectedEnv)) {
      fail('guard step env must be exactly GITHUB_TOKEN, BASE_SHA and HEAD_SHA');
    }
    if (describe(steps[steps.length - 1]).value('run') !== EXPECTED_GUARD) {
      fail('the guard must be the last step');
    }
  }
  if (allCommands.filter((command) => command === EXPECTED_GUARD).length !== 1) {
    fail('the guard must be invoked exactly once');
  }

  // Token and secrets: one line, on the guard step.
  const tokenLines = meaningful.filter((line) => /GITHUB_TOKEN|GH_TOKEN|secrets\.|github\.token/.test(line));
  if (tokenLines.length !== 1 || tokenLines[0].trim() !== 'GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}') {
    fail('GITHUB_TOKEN may appear once, as the guard step env value, and no other secret may appear');
  }

  // Nothing else that changes where or what runs.
  for (const line of meaningful) {
    if (/\b(working-directory|shell|defaults|container|services|cache|continue-on-error|if|strategy|matrix|environment|workflow_run|workflow_dispatch|pull_request|push|schedule)\s*:/.test(line)) {
      fail(`key not allowed: ${line.trim()}`);
    }
    if (/head\.ref|head\.repo|head_ref|pull_request\.(title|body)|github\.actor/.test(line)) {
      fail(`PR-controlled text referenced: ${line.trim()}`);
    }
  }
  return problems;
}

const read = (file) => fs.readFileSync(file, 'utf8');

test('signal-cap workflow: the committed file passes the structure check', () => {
  assert.deepEqual(checkSignalCapWorkflow(read(WORKFLOW_PATH)), []);
});

test('signal-cap workflow: exact contract for pins, steps, trigger, job and scripts', () => {
  const lines = normalizedWorkflowLines(read(WORKFLOW_PATH));
  assert.deepEqual(lines, EXPECTED_WORKFLOW_LINES);
  // The same contract, spelled out item by item.
  const uses = lines.filter((line) => /\buses:/.test(line)).map((line) => line.trim());
  assert.deepEqual(uses, [`uses: ${CHECKOUT_USES}`, `uses: ${SETUP_NODE_USES}`]);
  const stepNames = lines.filter((line) => /^ {6}- name: /.test(line)).map((line) => line.replace(/^ {6}- name: /, ''));
  assert.deepEqual(stepNames, EXPECTED_STEP_NAMES);
  assert.equal(lines.filter((line) => /^ {6}- /.test(line)).length, 4);
  const runAt = lines.indexOf('        run: |');
  assert.deepEqual(
    lines.slice(runAt + 1, runAt + 1 + EXPECTED_FETCH_SCRIPT.length).map((line) => line.trim()),
    EXPECTED_FETCH_SCRIPT.map((line) => line.trim()),
  );
  assert.equal(lines[runAt + 1 + EXPECTED_FETCH_SCRIPT.length], '        env:');
  assert.deepEqual(lines.filter((line) => /^ {8}run: /.test(line)), ['        run: |', `        run: ${EXPECTED_GUARD}`]);
  const jobsAt = lines.indexOf('jobs:');
  assert.deepEqual(lines.slice(jobsAt + 1).filter((line) => /^ {2}\S/.test(line)), ['  signal-cap:']);
  const onAt = lines.indexOf('on:');
  const permissionsAt = lines.indexOf('permissions:');
  assert.deepEqual(lines.slice(onAt + 1, permissionsAt).filter((line) => /^ {2}\S/.test(line)), ['  pull_request_target:']);
});

test('signal-cap workflow: each weakening of the file is rejected', () => {
  const good = read(WORKFLOW_PATH);
  assert.deepEqual(checkSignalCapWorkflow(good), []);
  const replaceOnce = (from, to) => {
    assert.ok(good.includes(from), `fixture drift: ${from}`);
    return good.replace(from, to);
  };
  const mutations = {
    'checkout gets a ref': replaceOnce('          persist-credentials: false\n', '          persist-credentials: false\n          ref: ${{ github.event.pull_request.head.sha }}\n'),
    'checkout gets a literal ref': replaceOnce('          persist-credentials: false\n', '          persist-credentials: false\n          ref: refs/pull/1/head\n'),
    'checkout gets a repository': replaceOnce('          persist-credentials: false\n', '          persist-credentials: false\n          repository: someone/fork\n'),
    'checkout gets a token': replaceOnce('          persist-credentials: false\n', '          persist-credentials: false\n          token: ${{ secrets.GITHUB_TOKEN }}\n'),
    'checkout keeps credentials': replaceOnce('persist-credentials: false', 'persist-credentials: true'),
    'checkout drops persist-credentials': replaceOnce('          persist-credentials: false\n', ''),
    'npm ci added': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        run: |\n          npm ci\n          ${EXPECTED_GUARD}\n`),
    'npm test step added': replaceOnce('      - name: Fetch the PR head as data only', '      - name: Test\n        run: npm test\n\n      - name: Fetch the PR head as data only'),
    'npx added': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          npx tsx scripts/compileContent.ts\n'),
    'PR head checked out': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          git checkout refs/remotes/pr/head\n'),
    'guard run from the PR tree': replaceOnce(`run: ${EXPECTED_GUARD}`, 'run: git show refs/remotes/pr/head:tools/checkDailySignalCap.mjs | node -'),
    'guard run from another directory': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        run: ${EXPECTED_GUARD}\n        working-directory: pr\n`),
    'guard replaced': replaceOnce(`run: ${EXPECTED_GUARD}`, 'run: node -e "process.exit(0)"'),
    'guard made non-blocking': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        run: ${EXPECTED_GUARD}\n        continue-on-error: true\n`),
    'guard made conditional': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        if: github.actor != 'x'\n        run: ${EXPECTED_GUARD}\n`),
    'contents widened to write': replaceOnce('  contents: read', '  contents: write'),
    'extra permission': replaceOnce('  pull-requests: read\n', '  pull-requests: read\n  id-token: write\n'),
    'job-level permissions': replaceOnce('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions: write-all\n'),
    'permissions removed': replaceOnce('permissions:\n  contents: read\n  pull-requests: read\n', ''),
    'checkout unpinned': good.replace(/actions\/checkout@[0-9a-f]{40}/, 'actions/checkout@v4'),
    'setup-node unpinned': good.replace(/actions\/setup-node@[0-9a-f]{40}/, 'actions/setup-node@v4'),
    'short pin': good.replace(/actions\/checkout@([0-9a-f]{12})[0-9a-f]{28}/, 'actions/checkout@$1'),
    'third action added': replaceOnce('      - name: Fetch the PR head as data only', `      - uses: someone/thing@${'a'.repeat(40)}\n\n      - name: Fetch the PR head as data only`),
    'npm cache keyed on PR files': replaceOnce('          node-version: 20\n', '          node-version: 20\n          cache: npm\n'),
    'event text in a run line': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          echo "${{ github.event.pull_request.title }}"\n'),
    'number interpolated into the fetch': replaceOnce('refs/pull/${PR_NUMBER}/head', 'refs/pull/${{ github.event.pull_request.number }}/head'),
    'head ref in env': replaceOnce('          PR_NUMBER: ${{ github.event.pull_request.number }}\n', '          PR_NUMBER: ${{ github.event.pull_request.number }}\n          BRANCH: ${{ github.event.pull_request.head.ref }}\n'),
    'pull_request trigger instead': replaceOnce('  pull_request_target:', '  pull_request:'),
    'second trigger added': replaceOnce('    branches: [main]\n', '    branches: [main]\n  workflow_dispatch:\n'),
    'types narrowed': replaceOnce(EXPECTED_TYPES, '[opened]'),
    'edited type dropped (a retarget to main would not run)': replaceOnce(EXPECTED_TYPES, '[opened, synchronize, reopened, ready_for_review]'),
    'token on the fetch step': replaceOnce('          PR_NUMBER: ${{ github.event.pull_request.number }}\n', '          PR_NUMBER: ${{ github.event.pull_request.number }}\n          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n'),
    'another secret': replaceOnce('          HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n', '          HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          OTHER: ${{ secrets.DEPLOY_KEY }}\n'),
    'token removed from the guard': replaceOnce('          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n', ''),
    'HEAD_SHA removed from the guard': replaceOnce('          HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n', ''),
    'head equality check removed': replaceOnce('          if [ "$fetched" != "$EXPECTED_HEAD_SHA" ]; then\n', '          if false; then\n'),
    'fetch also takes tags': replaceOnce('git fetch --no-tags --no-recurse-submodules origin', 'git fetch --no-recurse-submodules origin'),
    'fetch may recurse into submodules': replaceOnce('git fetch --no-tags --no-recurse-submodules origin', 'git fetch --no-tags origin'),
    'job renamed': replaceOnce('  signal-cap:\n    name: signal-cap', '  cap:\n    name: cap'),
    'env file written': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          echo "X=1" >> "$GITHUB_ENV"\n'),
    'yaml anchor': replaceOnce('    runs-on: ubuntu-latest\n', '    runs-on: &r ubuntu-latest\n'),
    'tab indentation': replaceOnce('    runs-on: ubuntu-latest\n', '\truns-on: ubuntu-latest\n'),
    // Pull the PR tree into the workspace.
    'read-tree into the workspace': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          git read-tree -u --reset refs/remotes/pr/head\n'),
    'git switch to the PR head': replaceOnce('          fetched=', '          git switch --detach refs/remotes/pr/head\n          fetched='),
    'git reset to the PR head': replaceOnce('          fetched=', '          git reset --hard refs/remotes/pr/head\n          fetched='),
    'git worktree of the PR head': replaceOnce('          fetched=', '          git worktree add pr refs/remotes/pr/head\n          fetched='),
    'git restore from the PR head': replaceOnce('          fetched=', '          git restore --source refs/remotes/pr/head -- tools\n          fetched='),
    'git merge of the PR head': replaceOnce('          fetched=', '          git merge refs/remotes/pr/head\n          fetched='),
    'git pull of the PR head': replaceOnce('          fetched=', '          git pull origin refs/pull/1/head\n          fetched='),
    'git archive of the PR head': replaceOnce('          fetched=', '          git archive refs/remotes/pr/head | tar x\n          fetched='),
    'git show redirected into the tree': replaceOnce('          fetched=', '          git show refs/remotes/pr/head:tools/checkDailySignalCap.mjs > tools/checkDailySignalCap.mjs\n          fetched='),
    // A different commit behind the same action name.
    'checkout pinned to another commit': good.replace(/actions\/checkout@[0-9a-f]{40}/, `actions/checkout@${'a'.repeat(40)}`),
    'setup-node pinned to another commit': good.replace(/actions\/setup-node@[0-9a-f]{40}/, `actions/setup-node@${'b'.repeat(40)}`),
    // Defuse the head comparison.
    'exit 0 before the head comparison': replaceOnce('          fetched=', '          exit 0\n          fetched='),
    'mismatch exit turned into true': good.replace(/( +echo "fetched PR head does not match the event head" >&2\n +)exit 2\n/, '$1true\n'),
    'comparison inverted': replaceOnce('"$fetched" != "$EXPECTED_HEAD_SHA"', '"$fetched" = "$EXPECTED_HEAD_SHA"'),
    'errexit dropped': replaceOnce('          set -euo pipefail\n', '          set -uo pipefail\n'),
    // Added interpreters and network tools.
    'perl call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          perl -e 1\n'),
    'python call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          python3 -c pass\n'),
    'bash -c call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          bash -c true\n'),
    'sh -c call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          sh -c true\n'),
    'eval call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          eval "$PR_NUMBER"\n'),
    'curl call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          curl -s https://example.invalid\n'),
    'wget call': replaceOnce('          set -euo pipefail\n', '          set -euo pipefail\n          wget -q https://example.invalid\n'),
    // Input validation weakened.
    'number check back to a per-line grep': replaceOnce('if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then', 'if ! printf \'%s\' "$PR_NUMBER" | grep -Eq \'^[0-9]+$\'; then'),
    'number check unanchored': replaceOnce('=~ ^[0-9]+$ ]]', '=~ [0-9]+ ]]'),
    'head sha validation removed': replaceOnce('          if ! [[ "$EXPECTED_HEAD_SHA" =~ ^[0-9a-f]{40}$ ]]; then\n', '          if false; then\n'),
    // Shape.
    'step renamed': replaceOnce('Fetch the PR head as data only', 'Fetch'),
    'fifth step': `${good}\n      - name: Extra\n        run: true\n`,
    'second job': `${good}\n  other:\n    name: other\n    runs-on: ubuntu-latest\n    steps:\n      - name: Extra\n        run: true\n`,
    'trailing space on the guard line': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        run: ${EXPECTED_GUARD} \n`),
    'guard given an argument': replaceOnce(`        run: ${EXPECTED_GUARD}\n`, `        run: ${EXPECTED_GUARD} --help\n`),
  };
  for (const [label, mutated] of Object.entries(mutations)) {
    assert.notEqual(mutated, good, `mutation did not apply: ${label}`);
    assert.notDeepEqual(checkSignalCapWorkflow(mutated), [], `not rejected: ${label}`);
  }
});

test('ci.yml keeps its own guard step and marks it advisory', () => {
  const ci = read(CI_PATH);
  assert.ok(ci.includes('run: node tools/checkDailySignalCap.mjs'));
  assert.match(ci, /advisory/i);
  assert.match(ci, /signal-cap/);
});

test('signal-cap workflow test is wired into npm test', () => {
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
  assert.ok(pkg.scripts.test.split(/\s+/).includes('tests/signalCapWorkflow.test.mjs'));
});
