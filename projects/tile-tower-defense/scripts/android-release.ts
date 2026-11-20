import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const required = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_VERSION_CODE',
  'ANDROID_VERSION_NAME',
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw Error(`Missing release configuration: ${missing.join(', ')}. See docs/PLAY-STORE.md.`);
}
const version = process.env.ANDROID_VERSION_CODE!;
if (!/^[1-9]\d*$/.test(version) || Number(version) > 2_100_000_000) {
  throw Error('ANDROID_VERSION_CODE must be an integer from 1 to 2100000000.');
}
const keystore = resolve(project, process.env.ANDROID_KEYSTORE_PATH!);
if (!existsSync(keystore)) {
  throw Error('ANDROID_KEYSTORE_PATH does not point to an existing upload keystore.');
}
const env = { ...process.env, ANDROID_KEYSTORE_PATH: keystore };
// Use the committed production endpoints, not inherited development overrides.
for (const key of Object.keys(env)) {
  if (key.startsWith('VITE_')) {
    delete env[key as keyof typeof env];
  }
}
function run(command: string, args: string[], cwd = project) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw Error(`${command} failed (exit ${result.status}).`);
  }
}
run(process.execPath, ['run', 'android:sync']);
run(
  './gradlew',
  ['--no-daemon', '-PplayRelease=true', 'bundleRelease'],
  resolve(project, 'android'),
);
console.log('Signed upload bundle: android/app/build/outputs/bundle/release/app-release.aab');
console.log('Upload to Play Console only after completing docs/PLAY-STORE.md.');
