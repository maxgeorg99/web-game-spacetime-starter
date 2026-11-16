import { spawnSync } from 'node:child_process';

/** Same release blockers as CI, without publishing or contacting a game server. */
export function runPushChecks(cwd: string) {
  const env = { ...process.env };
  // Use committed production config, not an inherited local endpoint or production-only install.
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_') || key.startsWith('GIT_') || key === 'NODE_ENV') {
      delete env[key];
    }
  }
  const checks = ['format:check', 'lint', 'typecheck', 'test', 'scripts/build-itch.ts'];
  for (const check of checks) {
    console.log(`\n[pre-push] ${check}`);
    const result = spawnSync(process.execPath, ['run', check], { cwd, env, stdio: 'inherit' });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw Error(`${check} failed. Fix it and commit the fix before pushing.`);
    }
  }
}

if (import.meta.main) {
  try {
    runPushChecks(process.cwd());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
