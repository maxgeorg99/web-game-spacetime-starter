export {};

/** Run explicitly after filling .env.provisioner. Values go through stdin, never command arguments. */
const repository = 'maxgeorg99/web-game-spacetime-starter';
const names = ['SPACETIME_ADMIN_TOKEN', 'BUTLER_API_KEY', 'VERCEL_TOKEN'] as const;
for (const name of names) {
  if (!process.env[name]?.trim()) {
    throw Error(`Fill ${name} in .env.provisioner first.`);
  }
}
for (const name of names) {
  const child = Bun.spawn(['gh', 'secret', 'set', name, '--repo', repository], {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await child.stdin.write(process.env[name]!.trim());
  await child.stdin.end();
  if ((await child.exited) !== 0) {
    throw Error(`Could not set ${name}. Check gh authentication and repository access.`);
  }
  console.log(`Configured ${name} for ${repository}.`);
}

const project = (await Bun.file('.vercel/project.json').json()) as {
  orgId: string;
  projectId: string;
};
for (const [name, value] of Object.entries({
  VERCEL_ORG_ID: project.orgId,
  VERCEL_PROJECT_ID: project.projectId,
})) {
  const child = Bun.spawn(['gh', 'secret', 'set', name, '--repo', repository], {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await child.stdin.write(value);
  await child.stdin.end();
  if ((await child.exited) !== 0) {
    throw Error(`Could not set ${name}.`);
  }
  console.log(`Configured ${name} for ${repository}.`);
}
