import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const hookPath = 'projects/tile-tower-defense/.githooks';
const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
  cwd: root,
  encoding: 'utf8',
}).stdout.trim();
if (current && resolve(root, current) !== resolve(root, hookPath)) {
  throw Error(
    `Existing core.hooksPath (${current}) was preserved. Integrate the hook there explicitly.`,
  );
}
if (!current) {
  const directory = resolve(
    root,
    execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
  );
  const active = existsSync(directory)
    ? readdirSync(directory).filter((name) => !name.endsWith('.sample') && !name.startsWith('.'))
    : [];
  if (active.length) {
    throw Error(`Existing Git hooks were preserved: ${active.join(', ')}. Integrate explicitly.`);
  }
}
chmodSync(resolve(root, hookPath, 'pre-push'), 0o755);
execFileSync('git', ['config', '--local', 'core.hooksPath', hookPath], { cwd: root });
console.log(
  'Installed Tile Tower Defense pre-push gate for this repository. No global settings changed.',
);
