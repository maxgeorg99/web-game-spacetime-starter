# Android delivery

## Current scope

The initial Capacitor shell bundles the existing Vite game and connects to the same
production SpacetimeDB coordinator/provisioner configured in `.env.production`.
Phaser and shared authoritative gameplay remain unchanged. Network access is required.

- App name: **Tile Tower Defense**.
- Application ID: `com.maxgeorg.tiletowerdefense` (user approved).
- Capacitor core, Android and CLI are pinned together in `package.json` and `bun.lock`.
- Android minimum SDK 24; compile/target SDK 36, from `android/variables.gradle`.
- Java 21 and Node 24 are selected in the Android CI workflow. Bun is 1.3.12.
- Local version defaults: code `1`, name `0.1.0`. Override with
  `ANDROID_VERSION_CODE` and `ANDROID_VERSION_NAME`.
- Native Google/Discord sign-in uses AppAuth and Android Keystore. The HTTPS callback
  page is deployed; see [Captain accounts](AUTH.md).
  Browser sign-in is unchanged. Guest credentials are local to this installation;
  they do not import browser progress. Uninstall/clear data loses guest access.
- Stock Capacitor launcher/splash assets remain placeholders.
- Backup and cleartext traffic are disabled. No production signing keys are configured.

## Build locally

Install Android Studio with SDK platform 36 and build tools 36.0.0. Set `JAVA_HOME`
to a compatible JDK and `ANDROID_HOME` to your Android SDK directory. Keep local paths
out of Git; Android Studio may also write ignored `android/local.properties`.

If a machine-wide Gradle init script overrides repositories (for example, a corporate
Artifactory mirror), use a project-local Gradle home to keep this game's public
dependency resolution separate without changing global settings:

```sh
GRADLE_USER_HOME="$PWD/.local/android-gradle" bun run android:build
```

This directory is ignored. The initial local verification reused existing wrapper
and dependency caches through symlinks, but did not copy global init scripts or
credentials. GitHub-hosted runners use their own clean Gradle setup.

```sh
bun install --frozen-lockfile
bun run android:build
```

This builds fresh production web assets, synchronizes Capacitor, then runs Gradle
`assembleDebug bundleRelease`. It does not deploy the website, publish databases,
upload to Play, install on a device, or launch the game.

Outputs:

- Installable debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Unsigned** release bundle: `android/app/build/outputs/bundle/release/app-release.aab`.
  This is a build artifact, not yet ready for Play upload.

For Android Studio, run `bun run android:sync`, then `bun run android:open`.
Always rebuild/sync after web changes. The release uses bundled files, never a remote
`server.url` or development server. Generated assets and local build caches are ignored.

## GitHub Actions

Repository workflow: `.github/workflows/tile-tower-defense-android.yml`.

It runs on project/workflow changes in pushes and pull requests, or manually via
**Actions → Build Tile Tower Defense Android → Run workflow**. It installs the pinned
dependencies, runs formatting/lint/type/unit checks, builds fresh assets and native
outputs, then uploads two artifacts retained for 14 days:

- `tile-tower-defense-android-debug-<run number>`
- `tile-tower-defense-android-unsigned-<run number>`

The workflow uses its run number as the version code. Before the first Play upload,
establish a release version-code sequence greater than every previously uploaded
version; rerunning a workflow retains the same run number and must not be treated as
a new Play version.

No signing secrets or Play credentials are needed for this preview. Debug APKs are
signed with the runner's temporary debug key, so APKs from different runs may not
upgrade each other. Reinstalling loses guest credentials. Establish stable testing
signing before using these builds for persistent playtest accounts.

Existing web deployment and its pre-push release blockers are unchanged. Native
artifact compilation is an additional CI check, not yet a production deployment gate.
The pre-push hook recognizes Android workflow changes and runs the existing web gate;
it does not require an Android SDK on every contributor's machine. Before enabling
Android publishing, add the native checks to its release gate and align the hook.

## Next steps before Play internal testing

1. The HTTPS OAuth callback is deployed. Continue playtesting Google/Discord login,
   cancellation, process-death return, restart persistence, renewal and sign-out.
   The user confirmed the new HTTPS redirect is registered on the existing client.
   The current return uses an HTTPS relay into the app's private URI scheme with
   PKCE; verified HTTPS App Links can replace the relay once signing is finalized.
2. Lifecycle/device playtesting: back navigation, background/foreground reconnect,
   process death, keyboard, safe areas, rotation, audio, performance and offline UI.
   A server-authoritative match continues while the app is backgrounded.
3. Replace launcher/splash placeholders, prepare screenshots and listing. Add privacy
   policy, accurate Data safety information, account deletion and reviewer access.
4. Create the app in Play Console, enable Play App Signing, and configure protected
   upload-key secrets. Associate App Links with the **Play app-signing certificate**.
5. Add an explicitly authorized signed-release job and optional Play internal-track
   upload. Use protected environments and a least-privilege Play service account;
   never expose signing credentials to pull-request jobs.
6. Verify the Play-installed build, complete applicable closed testing, then request
   production access/review. Production publishing requires explicit authorization.

## Handoff

The shell, artifact pipeline and native account implementation are prepared. The
hosted Android callback was deployed with user authorization on 2026-11-20. No Play
app has been created and no signing credentials have been added. See the latest
`ROADMAP.md` entry for actual verification results.
