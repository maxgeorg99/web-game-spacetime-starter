import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPushChecks } from './check-push';

const project = 'projects/tile-tower-defense';
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const exists = (object: string) =>
  spawnSync('git', ['cat-file', '-e', object], { cwd: root, stdio: 'ignore' }).status === 0;
const zero = /^0+$/;

try {
  const input = await Bun.stdin.text();
  const checked = new Set<string>();
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || !/^[a-f0-9]+$/.test(fields[1]) || !/^[a-f0-9]+$/.test(fields[3])) {
      throw Error('Invalid Git pre-push input. Push blocked.');
    }
    const [localRef, localSha, , remoteSha] = fields;
    if (zero.test(localSha)) {
      continue; // Deleting a ref does not deploy code.
    }
    const commit = git(['rev-parse', `${localSha}^{commit}`]);
    if (checked.has(commit) || !exists(`${commit}:${project}/package.json`)) {
      continue;
    }
    if (!zero.test(remoteSha) && exists(`${remoteSha}^{commit}`)) {
      const changed = git([
        'diff',
        '--name-only',
        remoteSha,
        commit,
        '--',
        project,
        '.github/workflows/tile-tower-defense.yml',
        '.github/workflows/tile-tower-defense-release.yml',
        '.github/workflows/tile-tower-defense-android.yml',
      ]);
      if (!changed) {
        continue;
      }
    }
    checked.add(commit);
    console.log(`[pre-push] Checking ${localRef} (${commit.slice(0, 8)}) in an isolated snapshot.`);
    const temporary = mkdtempSync(join(tmpdir(), 'tile-td-push-'));
    try {
      const archive = join(temporary, 'source.tar');
      const descriptor = openSync(archive, 'w');
      try {
        execFileSync('git', ['archive', '--format=tar', commit, project], {
          cwd: root,
          stdio: ['ignore', descriptor, 'inherit'],
        });
      } finally {
        closeSync(descriptor);
      }
      execFileSync('tar', ['-xf', archive, '-C', temporary]);
      const cwd = join(temporary, project);
      const env = { ...process.env, NODE_ENV: 'development' };
      const install = spawnSync(process.execPath, ['install', '--frozen-lockfile'], {
        cwd,
        env,
        stdio: 'inherit',
      });
      if (install.error || install.status !== 0) {
        throw Error('Dependency installation failed; push blocked. Check the lockfile/network.');
      }
      runPushChecks(cwd);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }
  console.log(
    checked.size
      ? '[pre-push] All requested Tile Tower Defense snapshots passed.'
      : '[pre-push] No Tile Tower Defense changes to check.',
  );
} catch (error) {
  console.error(`[pre-push] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
