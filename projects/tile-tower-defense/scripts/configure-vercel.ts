export {};

// Uses the CLI's interactive login. The credential is streamed, never printed or passed as an argument.
const token = process.env.SPACETIME_ADMIN_TOKEN?.trim();
if (!token) {
  throw Error('Fill SPACETIME_ADMIN_TOKEN in .env.provisioner first.');
}
const child = Bun.spawn(
  ['vercel', 'env', 'add', 'SPACETIME_ADMIN_TOKEN', 'production', '--sensitive', '--force'],
  {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'ignore',
  },
);
await child.stdin.write(token);
await child.stdin.end();
if ((await child.exited) !== 0) {
  throw Error('Could not configure Vercel. Check CLI login and project link.');
}
console.log('Configured the private production credential on Vercel.');
