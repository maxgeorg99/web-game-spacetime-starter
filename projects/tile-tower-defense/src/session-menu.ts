import { AccountAuth } from './account-auth';
import { assetUrl } from './assets';
import { campaignBiome } from '../shared/config/biomes';
import { statisticsMarkup } from './statistics';
import type { RunReport } from '../shared/game/statistics';
import { escapeHtml, language, th } from './i18n';
import { resultRetentionSeconds } from '../shared/config/lifecycle';
import { t } from './i18n';
import { DbConnection } from './coordinator_bindings';
import type { Session, Slots } from './coordinator_bindings/types';
import { cleanName } from '../shared/game/names';
import type { GameStore } from './store';

/** The coordinator remains connected while the game connects to one independent world. */
export class SessionMenu {
  private connection?: DbConnection;
  private account = new AccountAuth();
  private accountPicture = '';
  private generation = 0;
  private token = '';
  private identity = '';
  private connected = false;
  private busy = false;
  private error = '';
  private status = t('session.connecting');
  private sessions: Session[] = [];
  private slots = new Map<number, Slots>();
  private visited = new Set<number>();
  private provisioner = import.meta.env.VITE_PROVISIONER_URL as string | undefined;
  private cleaning = new Set<number>();
  private attempted = new Set<number>();
  private provisioning = new Set<number>();
  private name = document.getElementById('captain-name') as HTMLInputElement;
  private sessionName = document.getElementById('session-name') as HTMLInputElement;
  constructor(private game: GameStore) {
    this.account.onRenewed = () => {
      this.token = this.account.token!;
    };
    this.account.onStatus = () => {
      this.error = this.account.error;
      this.render();
    };
    this.account.onChange = () => {
      this.game.leave();
      this.name.value = '';
      this.connect();
    };
    document.getElementById('captain-sign-in')!.onclick = () => {
      if (this.account.token && !this.account.needsSignIn) {
        this.account.signOut();
        this.account.onChange();
        return;
      }
      const previousSubject = this.account.subject;
      const pending = this.account.signIn();
      this.render();
      void pending
        .then(() => {
          if (previousSubject && previousSubject === this.account.subject) {
            this.account.onRenewed();
            this.connect();
          } else {
            this.account.onChange();
          }
        })
        .catch((error) => {
          this.error = error instanceof Error ? error.message : t('account.failed');
          this.render();
        });
    };
    const historyDialog = document.getElementById('run-history') as HTMLDialogElement;
    document.getElementById('run-history-open')!.onclick = () => historyDialog.showModal();
    document.getElementById('run-history-close')!.onclick = () => historyDialog.close();
    document.getElementById('coordinator-retry')!.onclick = () => this.connect();
    const createForm = document.getElementById('session-create-form') as HTMLFormElement;
    const createToggle = document.getElementById('session-create-open')!;
    const showCreate = (open: boolean) => {
      createForm.hidden = !open;
      createToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        this.sessionName.focus();
      }
    };
    createToggle.onclick = () => showCreate(createForm.hidden);
    document.getElementById('session-create-cancel')!.onclick = () => {
      showCreate(false);
      createToggle.focus();
    };
    createForm.onsubmit = (event) => {
      event.preventDefault();
      void this.run(async () => {
        const worldName = cleanName(this.sessionName.value, t('form.sessionName'), 40);
        await this.saveName();
        await this.connection!.reducers.createSession({ name: worldName });
        this.sessionName.value = '';
        showCreate(false);
        createToggle.focus();
      });
    };
    this.name.oninput = () => this.name.removeAttribute('aria-invalid');
    document.getElementById('sessions-open')!.onclick = () => {
      const settings = document.querySelector<HTMLDetailsElement>('details.settings');
      if (settings) {
        settings.open = false;
      }
      this.game.leave();
    };
    document.getElementById('world-back')!.onclick = () => this.game.leave();
    document.getElementById('world-retry')!.onclick = () => {
      const destination = this.game.destination;
      if (destination) {
        void this.enter(destination.id);
      }
    };
    game.subscribe(() => this.render());
    // Activity is independent from simulation ticks. No deletion policy is implemented yet.
    window.setInterval(() => {
      if (
        this.connected &&
        game.ready &&
        game.destination &&
        !document.hidden &&
        document.hasFocus()
      ) {
        void this.connection!.reducers.visitSession({ id: game.destination.id }).catch(() => {});
      }
    }, 60_000);
    window.setInterval(() => {
      if (!document.hidden && !game.ready) {
        this.render();
      }
      this.cleanupFinished();
    }, 15_000);
    this.connect();
  }
  private connect() {
    void this.connectAccount();
  }
  private async connectAccount() {
    const generation = ++this.generation;
    this.connection?.disconnect();
    this.connected = false;
    this.sessions = [];
    this.slots.clear();
    this.error = this.account.error;
    this.accountPicture = '';
    this.status = t('session.connecting');
    this.render();
    const uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://127.0.0.1:3106';
    const database = import.meta.env.VITE_COORDINATOR_DB ?? 'tile-tower-defense-coordinator';
    const captain = new URLSearchParams(location.search).get('captain')?.slice(0, 32) ?? 'default';
    const tokenKey = `tile-td:coordinator:${uri}:${database}:${captain}`;
    const current = () => generation === this.generation;
    let accountToken: string | undefined;
    try {
      accountToken = this.account.token ? await this.account.getToken() : undefined;
    } catch {
      if (current()) {
        this.failed(Error(this.account.error || t('account.expired')));
      }
      return;
    }
    if (!current()) {
      return;
    }
    const builder = DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(database)
      .withToken(accountToken ?? localStorage.getItem(tokenKey) ?? undefined);
    if (accountToken) {
      builder.withAutomaticReconnect().withTokenProvider(() => this.account.getToken());
    }
    this.connection = builder
      .onConnect((conn, identity, token) => {
        if (!current()) {
          conn.disconnect();
          return;
        }
        this.token = token;
        this.identity = identity.toHexString();
        if (!this.account.token) {
          localStorage.setItem(tokenKey, token);
        }
        const sync = () => {
          if (!current()) {
            return;
          }
          const profile = conn.db.accountProfile.owner.find(identity);
          this.accountPicture = profile?.picture ?? '';
          this.slots = new Map([...conn.db.slots.iter()].map((row) => [row.sessionId, row]));
          this.sessions = [...conn.db.session.iter()].sort((a, b) => b.id - a.id);
          this.visited = new Set(
            [...conn.db.membership.iter()]
              .filter((member) => member.owner.toHexString() === this.identity)
              .map((member) => member.sessionId),
          );
          this.render();
          if (this.provisioner) {
            for (const row of this.sessions) {
              if (
                row.status === 'pending' &&
                row.creator.toHexString() === this.identity &&
                !this.attempted.has(row.id)
              ) {
                void this.provision(row.id);
              }
            }
          }
        };
        const history = () => {
          if (!current()) {
            return;
          }
          const list = document.getElementById('run-history-list')!;
          const opened = new Set(
            Array.from(list.querySelectorAll<HTMLDetailsElement>('details[open]')).map(
              (node) => node.dataset.key,
            ),
          );
          const rows = [...conn.db.myRunReports.iter()].sort((a, b) =>
            a.finishedAt.microsSinceUnixEpoch > b.finishedAt.microsSinceUnixEpoch ? -1 : 1,
          );
          list.innerHTML = rows.length
            ? rows
                .map((row) => {
                  const report = JSON.parse(row.report) as RunReport;
                  const date = new Date(
                    Number(row.finishedAt.microsSinceUnixEpoch / 1000n),
                  ).toLocaleString(language);
                  return `<details data-key="${escapeHtml(row.key)}" ${opened.has(row.key) ? 'open' : ''}><summary><b>${th(`result.${report.outcome}`)}</b> · ${escapeHtml(row.sessionName)} · ${th(`biome.${campaignBiome(report.campaign)}`)}<small>${escapeHtml(date)}</small></summary>${statisticsMarkup(report.statistics)}</details>`;
                })
                .join('')
            : `<p>${th('stats.noHistory')}</p>`;
        };
        conn.db.myRunReports.onInsert(history);
        conn.db.myRunReports.onDelete(history);
        conn.db.accountProfile.onInsert(sync);
        conn.db.accountProfile.onUpdate(sync);
        conn.db.slots.onInsert(sync);
        conn.db.slots.onUpdate(sync);
        conn.db.slots.onDelete(sync);
        conn.db.session.onInsert(sync);
        conn.db.session.onUpdate(sync);
        conn.db.session.onDelete(sync);
        conn.db.membership.onInsert(sync);
        conn.db.membership.onUpdate(sync);
        conn
          .subscriptionBuilder()
          .onApplied(() => {
            if (!current()) {
              return;
            }
            history();
            this.connected = true;
            this.status = t('harbor.joinHint');
            this.name.value =
              conn.db.captain.owner.find(identity)?.name ??
              conn.db.accountProfile.owner.find(identity)?.displayName ??
              this.name.value;
            sync();
          })
          .onError((ctx) => {
            if (current()) {
              this.failed(ctx.event);
            }
          })
          .subscribe([
            'SELECT * FROM my_run_reports',
            `SELECT * FROM account_profile WHERE owner = 0x${identity.toHexString()}`,
            'SELECT * FROM session',
            'SELECT * FROM slots',
            `SELECT * FROM captain WHERE owner = 0x${identity.toHexString()}`,
            `SELECT * FROM membership WHERE owner = 0x${identity.toHexString()}`,
          ]);
      })
      .onAutomaticReconnect(() => {
        if (current()) {
          this.token = this.account.token!;
        }
      })
      .onConnectError((_ctx, error) => {
        if (current()) {
          this.failed(error);
        }
      })
      .onDisconnect(() => {
        if (current()) {
          this.failed(Error(t('connection.lost')));
        }
      })
      .build();
  }
  private cleanupFinished() {
    if (!this.provisioner || !this.connected) {
      return;
    }
    for (const row of this.sessions) {
      if (
        row.status !== 'finished' ||
        this.cleaning.has(row.id) ||
        Date.now() - Number(row.lastActivity.microsSinceUnixEpoch / 1000n) <
          resultRetentionSeconds * 1000
      ) {
        continue;
      }
      const url = new URL(this.provisioner, location.href);
      url.searchParams.set('id', String(row.id));
      url.searchParams.set('cleanup', '1');
      this.cleaning.add(row.id);
      void (this.account.token ? this.account.getToken() : Promise.resolve(this.token))
        .then((token) => fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30_000),
        }))
        .catch(() => {})
        .finally(() => this.cleaning.delete(row.id));
    }
  }
  private async provision(id: number) {
    if (!this.provisioner || this.provisioning.has(id)) {
      return;
    }
    this.attempted.add(id);
    this.provisioning.add(id);
    this.error = '';
    this.render();
    try {
      const token = this.account.token ? await this.account.getToken() : this.token;
      const url = new URL(this.provisioner, location.href);
      url.searchParams.set('id', String(id));
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(290_000),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw Error(body.message ?? t('session.creationRetry'));
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : t('session.creationUnavailable');
    } finally {
      this.provisioning.delete(id);
      this.render();
    }
  }
  private failed(error: unknown) {
    this.connected = false;
    this.status = t('session.unavailable');
    this.error = error instanceof Error ? error.message : String(error);
    this.render();
  }
  private async saveName() {
    let name: string;
    try {
      name = cleanName(this.name.value, t('form.captainName'));
    } catch {
      this.name.setAttribute('aria-invalid', 'true');
      this.name.focus();
      throw Error(t('harbor.invalidName'));
    }
    await this.connection!.reducers.setName({ name });
    this.name.value = name;
  }
  private async run(work: () => Promise<void>) {
    if (!this.connected || this.busy) {
      return;
    }
    this.busy = true;
    this.error = '';
    this.render();
    try {
      await work();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.busy = false;
      this.render();
    }
  }
  private async enter(id: number) {
    await this.run(async () => {
      const token = this.account.token ? await this.account.getToken() : this.token;
      const session = this.sessions.find((row) => row.id === id && row.status === 'ready');
      if (!session) {
        throw Error(t('session.notReady'));
      }
      await this.saveName();
      await this.connection!.reducers.visitSession({ id });
      this.game.enter(
        session,
        this.name.value,
        token,
        !!this.account.token,
        this.account.token ? () => this.account.getToken() : undefined,
      );
    });
  }
  private render() {
    const playing = this.game.ready;
    document.body.dataset.screen = playing ? 'game' : 'menu';
    document.getElementById('session-menu')!.hidden = playing;
    if (playing) {
      const historyDialog = document.getElementById('run-history') as HTMLDialogElement;
      if (historyDialog.open) {
        historyDialog.close();
      }
      return;
    }
    const signIn = document.getElementById('captain-sign-in') as HTMLButtonElement;
    signIn.disabled = this.account.pending || this.busy;
    signIn.querySelector('span')!.textContent = t(
      this.account.token && !this.account.needsSignIn ? 'account.signOut' : 'account.signIn',
    );
    document.getElementById('captain-auth-status')!.textContent = t(
      this.account.pending
        ? 'account.connecting'
        : this.account.needsSignIn
          ? 'account.expired'
          : this.account.token
            ? 'account.signedIn'
            : 'account.guest',
    );
    const portrait = document.querySelector<HTMLImageElement>('.pass-portrait')!;
    const fallback = assetUrl('art/factions/blue/captain.png');
    const source = this.accountPicture || fallback;
    if (portrait.dataset.profileSource !== source) {
      portrait.dataset.profileSource = source;
      portrait.src = source;
    }
    portrait.classList.toggle('account-photo', !!this.accountPicture);
    portrait.onerror = () => {
      portrait.onerror = null;
      portrait.src = fallback;
      portrait.classList.remove('account-photo');
    };
    document.getElementById('menu-status')!.textContent = this.status;
    document.getElementById('menu-error')!.textContent = this.error;
    document.getElementById('world-status')!.textContent = this.game.destination
      ? `${this.game.status}${this.game.error ? ': ' + this.game.error : ''}`
      : '';
    document.getElementById('world-actions')!.hidden = !this.game.destination;
    (document.getElementById('world-retry') as HTMLButtonElement).disabled =
      !this.connected || this.busy;
    (document.getElementById('coordinator-retry') as HTMLButtonElement).hidden = this.connected;
    for (const id of ['session-create-open', 'session-create']) {
      (document.getElementById(id) as HTMLButtonElement).disabled = !this.connected || this.busy;
    }
    const list = document.getElementById('session-list')!;
    list.replaceChildren();
    for (const session of this.sessions.filter((session) => session.status !== 'finished')) {
      const row = document.createElement('div');
      row.className = 'session-row';
      row.dataset.status = session.status;
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = session.name;
      const info = document.createElement('small');
      const slots = this.slots.get(session.id);
      const stale = slots
        ? Date.now() - Number(slots.updatedAt.microsSinceUnixEpoch / 1000n) > 60_000
        : true;
      const availability = slots
        ? t('harbor.occupancy', {
            count: slots.claimed,
            capacity: slots.capacity,
            stale: stale ? t('session.lastReported') : '',
          })
        : t('session.checkingSlots');
      info.textContent =
        session.status === 'ready'
          ? availability
          : session.status === 'pending'
            ? t('session.preparingWorld')
            : session.message;
      details.append(title, info);
      const button = document.createElement('button');
      const retry =
        session.creator.toHexString() === this.identity &&
        (session.status === 'failed' ||
          (Boolean(this.provisioner) &&
            session.status === 'pending' &&
            !this.provisioning.has(session.id)));
      button.textContent = retry
        ? t('common.retry')
        : session.status === 'pending'
          ? t('common.preparing')
          : this.visited.has(session.id)
            ? t('session.resume')
            : slots && slots.claimed >= slots.capacity
              ? t('session.spectate')
              : t('session.join');
      button.disabled = !this.connected || this.busy || (session.status !== 'ready' && !retry);
      button.onclick = () => {
        if (retry) {
          void this.run(async () => {
            if (session.status === 'failed') {
              await this.connection!.reducers.retrySession({ id: session.id });
            }
            await this.provision(session.id);
          });
        } else {
          void this.enter(session.id);
        }
      };
      row.append(details, button);
      list.append(row);
    }
    if (!this.sessions.some((session) => session.status !== 'finished')) {
      const empty = document.createElement('div');
      empty.className = 'departure-empty';
      empty.innerHTML = `<strong>${th(this.connected ? 'harbor.emptyTitle' : 'session.connecting')}</strong><p>${th(this.connected ? 'harbor.emptyHint' : 'session.reconnectHint')}</p>`;
      list.append(empty);
    }
  }
}
