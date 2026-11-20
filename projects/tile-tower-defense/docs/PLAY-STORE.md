# Google Play release preparation

Status: preparation for internal testing, not approval for a public release.
Requirements reviewed on 2026-11-20. The user created the
[Play Console app](https://play.google.com/console/u/0/developers/6007134330131227268/app/4973384007831405021/app-dashboard).
The developer account already exists. Public support contact:
**maxi.georg.mg@gmail.com**. Publisher display name remains unconfirmed.

## Build a signed upload bundle

The application ID is `com.maxgeorg.tiletowerdefense`. Keep it unchanged after
creating the Play app. The app targets API 36.

A new RSA upload key was created locally with user authorization. Signing
credentials are in the ignored `.env.android-signing` file, and the keystore is
`.local/android-signing/upload.p12`. Both files have owner-only read/write
permissions. The public certificate is
`.local/android-signing/upload-certificate.pem`.

Back up the keystore and passwords in your password manager or encrypted backup.
Do not commit them, paste them in chat, or upload them as CI artifacts.
This is an upload key; let Google generate/manage the app-signing key when
enrolling in Play App Signing.

Set a version code greater than every previous upload, plus a user-visible
version name, in the local environment file. The first candidate uses code 1
and name 0.1.0. The preview CI run number is not the release version sequence.

With the Android SDK and JDK configured, run:

```sh
bun --env-file=.env.android-signing run android:release
```

The command requires all signing fields and an explicit version. It synchronizes
fresh production web assets and invokes Gradle with `-PplayRelease=true`.
Missing configuration or a signing failure stops the build. It does not upload.

Output: `android/app/build/outputs/bundle/release/app-release.aab`.
The ordinary `android:build` command remains an unsigned preview build when no
signing variables are supplied. Running it again can replace the signed AAB;
use the copied Play candidate under `.local/play-release` for submission.

## Create the Play app and start internal testing

1. Create a new Play Console app. Use **Tile Tower Defense**, English, and Game.
   Confirm free/paid distribution and all declarations yourself.
2. Open the internal-testing track, create a release, and enroll in Play App Signing.
3. Upload the signed candidate. Confirm the package, version, signing certificate,
   supported devices, permissions and any warnings in App Bundle Explorer.
4. Add tester email addresses or a tester group and obtain the opt-in link.
5. Test the Play-installed build on physical devices. Check login/return, reconnect,
   guest persistence, pinch/pan, placement, audio, rotation, safe areas and offline
   behavior. Review the Play pre-launch report before widening distribution.

The native callback uses a PKCE-protected HTTPS relay into a private app scheme.
If switching to verified App Links, configure the **Play app-signing certificate**,
not the local upload certificate.

No upload or publication is authorized by this document.

## Public-release blockers

| Requirement                 | State / next action                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Target SDK                  | API 36 configured; meets the current published requirement                             |
| Upload signing              | Local key and signed-release build path prepared                                       |
| Launcher and splash         | Existing keep artwork wired into native launch resources; visual device review pending |
| Store copy                  | English draft in [listing](play-store/listing-en.md)                                   |
| Store graphics              | 512×512 icon, 1024×500 feature graphic and real screenshots pending                    |
| Privacy policy              | Evidence-based draft below; confirm operational details and publish a public URL       |
| In-app privacy access       | Add the final live policy link before submitting beyond internal testing               |
| Account deletion            | No working end-to-end deletion process; required work described below                  |
| Data safety                 | Inventory drafted; owner must review providers and complete Console declarations       |
| App access                  | Guest play exists; document reviewer instructions and a working online service         |
| Content rating and audience | Complete the questionnaires; do not assume an age rating                               |
| Asset rights                | Confirm licenses for imported art, audio and fonts and include required credits        |
| Device quality              | Latest pinch fix and native lifecycle still need physical-device testing               |
| Publisher                   | Confirm public display name and Play account verification details                      |

Signing does not resolve these blockers. Do not describe this candidate as
production-ready while they remain open.

## Privacy and data inventory

See [privacy-policy draft](play-store/privacy-policy-draft.md).
This inventory reflects repository behavior; it is not a completed Data safety form.

| Data                                | Evidence and purpose                                                                      | Visibility / retention                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Captain name and identity           | Coordinator captain records; ownership, reconnect and multiplayer identity                | Public coordinator records; no automatic account purge implemented                            |
| Provider name and profile-photo URL | Verified Google/Discord claims via SpacetimeAuth                                          | Account profile and world seat shown to other players                                         |
| Membership and activity timestamps  | Session directory and membership records                                                  | Public coordinator records; world cleanup removes associated directory data                   |
| Gameplay and match reports          | Authoritative worlds and private run-report history                                       | Shared world snapshots; latest 50 reports per identity retained after completed-world removal |
| Authentication credentials          | Guest tokens in local storage; native account credentials encrypted with Android Keystore | Not displayed to other players; native sign-out clears local native credentials               |
| Network/service logs                | Requests to Vercel, SpacetimeDB/SpacetimeAuth and provider image hosts                    | Provider retention and processing terms require owner review                                  |

The game requests openid/profile/offline_access, not an email scope. Do not equate
that with a claim that Google, Discord or hosting providers process no other data.
No advertising or analytics SDK was identified in the authored dependency list.
Confirm all provider behavior and release configuration before declaring data
collection, sharing, security practices or retention in Play Console.

## Account deletion work

Sign-out is not deletion. Clearing local guest storage is not server-side deletion.
Provide an in-app request entry and an external web page that works without
installing the app. A support email can receive requests only after you establish
a verified, operable deletion workflow.

That workflow must cover coordinator captain/account profiles, membership,
private reports, identities and profile data embedded in active/saved worlds,
and the app's SpacetimeAuth account/token relationship. Preserve other players'
worlds; do not delete an entire shared database to erase one captain. Define
authentication of requests, token revocation, retry/audit behavior, and any
retention exceptions with their reasons. Confirm the identity provider's supported
account-deletion API before implementing it. Do not delete the user's unrelated
Google or Discord account.

Finish and verify this workflow before promising a deletion deadline or publishing
a policy that says deletion is available.

## Testing eligibility

If this is a personal developer account created after November 13, 2023, Google
currently requires at least 12 testers continuously opted into a closed test for
14 days before applying for production access. Internal testing does not satisfy
that closed-test requirement. Account type/date and actual eligibility must be
checked in your Console.

Internal-only releases are exempt from the Data safety section; that is not a
general exemption from Google's User Data policy or other applicable requirements.

## Sources

- [Target API requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [Android app signing](https://developer.android.com/studio/publish/app-signing)
- [Internal and closed testing](https://support.google.com/googleplay/android-developer/answer/9845334)
- [New personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Store assets](https://support.google.com/googleplay/android-developer/answer/9866151)
