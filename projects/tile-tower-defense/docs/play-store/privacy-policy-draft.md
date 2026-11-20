# Tile Tower Defense — privacy policy draft

**Not for publication yet.** Confirm the publisher's identity, provider processing
terms, retention rules and account-deletion process before publishing. No deletion
service or response deadline is promised by this draft.

Support contact confirmed by the owner: **maxi.georg.mg@gmail.com**.

## Information used to run the game

Tile Tower Defense uses a captain name and a game identity to connect you to
online worlds, associate you with your island and reconnect you to your game.
It stores game state, session membership, activity timestamps and match results.

If you sign in through Google or Discord using SpacetimeAuth, the game can receive
your provider display name and profile-photo URL. Your captain name and profile
photo can be visible to other players. The game does not request an email scope
from the identity provider.

Guest authentication tokens are stored on your device. On Android, native account
credentials are encrypted using Android Keystore. Sign-out removes the native
account credentials from that installation; it does not delete saved server data
or sign you out of Google or Discord.

## Services

The game uses SpacetimeDB and SpacetimeAuth for online game state and
authentication, and Vercel for hosted web pages and provisioning requests.
Google/Discord authentication and profile-image requests involve those providers.
Network requests expose information needed to deliver the service, such as an IP
address. Provider logging, retention and processing terms need owner confirmation.

No advertising or analytics SDK was identified in the current authored application.
Reassess this statement before adding any advertising, tracking, purchases or SDKs.

## Retention

The application retains captain/account records and the latest 50 completed match
reports per game identity. Completed shared worlds have a cleanup mechanism;
deletion timing depends on successful reporting and cleanup execution.
Unfinished saved worlds do not currently have an automatic inactivity expiry.

The owner must define retention for provider logs, backups and account records
and explain any required retention exceptions before publication.

## Deletion and contact

Contact maxi.georg.mg@gmail.com for privacy questions.

Before publication, replace this section with the implemented account-deletion
request URL and in-app steps. Specify how requests are verified, which associated
data is deleted, and any retained data and reasons. A sign-out button or local
storage reset does not fulfill this requirement.
