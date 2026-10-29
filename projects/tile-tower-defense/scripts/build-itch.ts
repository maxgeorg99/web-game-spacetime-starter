import { build, loadEnv } from 'vite';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = { ...loadEnv('production', root, 'VITE_'), ...process.env };
const uri = env.VITE_SPACETIME_URI ?? '';
if (!/^(https|wss):\/\//.test(uri) || /localhost|127\.0\.0\.1/.test(uri)) {
  throw Error('itch.io builds require a public HTTPS/WSS coordinator endpoint.');
}
if (!env.VITE_COORDINATOR_DB) {
  throw Error('Set VITE_COORDINATOR_DB for the release build.');
}
await build({ root, mode: 'production' });
const dist = resolve(root, 'dist');
let count = 0,
  bytes = 0;
async function measure(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await measure(path);
      continue;
    }
    const { size } = await stat(path);
    count++;
    bytes += size;
    if (size > 200 * 1024 * 1024 || path.slice(dist.length + 1).length > 240) {
      throw Error(`itch.io file limit exceeded: ${entry.name}`);
    }
  }
}
await measure(dist);
if (count > 1000 || bytes > 500 * 1024 * 1024) {
  throw Error('itch.io HTML5 upload limits exceeded.');
}
if (!(await Bun.file(resolve(dist, 'index.html')).exists())) {
  throw Error('Missing dist/index.html.');
}
console.log(
  `itch.io artifact: dist/ (${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB). Coordinator: ${env.VITE_COORDINATOR_DB}`,
);
