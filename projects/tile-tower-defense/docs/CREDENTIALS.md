# Deployment credentials

Fill the two empty values in `.env.provisioner` in this project:

- `SPACETIME_ADMIN_TOKEN`: login token for the CLI identity that owns the Maincloud `tiled-tower-defense` coordinator. Obtain it locally with `spacetime login show --token` and copy only the token value. Keep it out of chat and logs.
- `BUTLER_API_KEY`: the Butler/wharf key for `maxgeorg99`, available from itch.io API key settings or your local Butler login.

The file is Git-ignored, excluded from Docker context, and loaded only by explicit worker/secret commands. Do not put credentials into any `VITE_` variable: those are public browser configuration. `.env.production` contains only the public Maincloud URL and database name.

From this project directory:

```sh
bun run secrets:github
```

This uploads both values as repository Actions secrets to `maxgeorg99/web-game-spacetime-starter`, using your existing `gh` login. It validates both values first and sends them over stdin without printing them. It does not start a release. The release workflow uses these secrets to publish the coordinator and upload `dist/` to `maxgeorg99/tiled-tower-defense:html5`.

To run the Maincloud worker locally with the same file:

```sh
bun run provisioner:maincloud
```

Run only one worker per coordinator. Stop an existing worker before starting another. This command signs the SpacetimeDB CLI into the supplied administrator identity. A permanent worker host must receive `SPACETIME_ADMIN_TOKEN` through its own secret manager; repository Actions secrets do not automatically reach that host. The worker does not need the Butler key.

GitHub Pages cannot host this process; it serves static sites. GitHub Actions is suitable for builds/deployments or occasional provisioning batches, not the current continuous worker. The container definition is in `deploy/Dockerfile`; permanent hosting remains to be selected.

No real keys have been added or uploaded by this setup.

Vercel setup now uses a third private field, `VERCEL_TOKEN`, from https://vercel.com/account/tokens. `secrets:github` also uploads this token and the linked `.vercel/project.json` IDs. The SpacetimeDB runtime token is configured separately on Vercel with `bun --env-file=.env.provisioner run scripts/configure-vercel.ts`. See [VERCEL.md](VERCEL.md) for deployment and cutover.
