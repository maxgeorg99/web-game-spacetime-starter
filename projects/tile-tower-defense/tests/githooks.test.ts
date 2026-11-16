import { test, expect } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const runner = resolve(import.meta.dir, '../scripts/pre-push.ts');
const zeros = '0'.repeat(40);

/** Disposable repos exercise real Git ref input and archives, with tiny stand-in checks. */
function fixture(run: (root: string, project: string, git: (...args: string[]) => string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'tile-hook-test-'));
  const project = join(root, 'projects/tile-tower-defense');
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  try {
    mkdirSync(join(project, 'scripts'), { recursive: true });
    git('init', '--quiet');
    git('config', 'user.email', 'hook-test@example.invalid');
    git('config', 'user.name', 'Hook test');
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'hook-fixture',
        private: true,
        scripts: {
          'format:check': 'bun -e "process.exit(0)"',
          lint: 'bun -e "process.exit(0)"',
          typecheck: 'bun -e "process.exit(0)"',
          test: 'bun -e "process.exit(0)"',
        },
      }),
    );
    writeFileSync(join(project, 'scripts/build-itch.ts'), 'console.log("fixture build passed");');
    git('add', '.');
    git('commit', '--quiet', '-m', 'fixture');
    run(root, project, git);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function push(root: string, commit: string, remote = zeros) {
  return spawnSync(process.execPath, [runner], {
    cwd: root,
    input: `refs/heads/main ${commit} refs/heads/main ${remote}\n`,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

test('push gate checks a new ref using the committed snapshot', () => {
  fixture((root, _project, git) => {
    const result = push(root, git('rev-parse', 'HEAD'));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('fixture build passed');
    expect(result.stdout).toContain('snapshots passed');
  });
});

test('uncommitted fixes cannot hide a broken pushed commit', () => {
  fixture((root, project, git) => {
    const path = join(project, 'package.json');
    const clean = readFileSync(path, 'utf8');
    writeFileSync(path, clean.replace('process.exit(0)', 'process.exit(1)'));
    git('add', '.');
    git('commit', '--quiet', '-m', 'broken committed check');
    writeFileSync(path, clean);
    const result = push(root, git('rev-parse', 'HEAD'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('format:check failed');
    expect(readFileSync(path, 'utf8')).toBe(clean);
  });
});

test('ref deletion and unrelated project changes skip the gate', () => {
  fixture((root, _project, git) => {
    const base = git('rev-parse', 'HEAD');
    writeFileSync(join(root, 'unrelated.txt'), 'another project');
    git('add', '.');
    git('commit', '--quiet', '-m', 'unrelated');
    const result = push(root, git('rev-parse', 'HEAD'), base);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No Tile Tower Defense changes');
    expect(push(root, zeros, base).status).toBe(0);
  });
});
