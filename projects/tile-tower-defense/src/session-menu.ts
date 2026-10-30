import { t } from './i18n';
import { DbConnection } from './coordinator_bindings';
import type { Session, Slots } from './coordinator_bindings/types';
import { cleanName } from '../shared/game/names';
import type { GameStore } from './store';

/** The coordinator remains connected while the game connects to one independent world. */
export class SessionMenu {
  private connection?: DbConnection;
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
  private attempted = new Set<number>();
  private provisioning = new Set<number>();
  private name = document.getElementById('captain-name') as HTMLInputElement;
  private sessionName = document.getElementById('session-name') as HTMLInputElement;
  constructor(private game: GameStore) {
    document.getElementById('coordinator-retry')!.onclick = () => this.connect();
    document.getElementById('captain-save')!.onclick = () => {
      void this.run(() => this.saveName());
    };
    document.getElementById('session-create')!.onclick = () => {
      void this.run(async () => {
        await this.saveName();
        await this.connection!.reducers.createSession({
          name: cleanName(this.sessionName.value, t('form.sessionName'), 40),
        });
        this.sessionName.value = '';
      });
    };
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
    }, 15_000);
    this.connect();
  }
  private connect() {
    const generation = ++this.generation;
    this.connection?.disconnect();
    this.connected = false;
    this.sessions = [];
    this.slots.clear();
    this.error = '';
    this.status = t('session.connecting');
    this.render();
    const uri = import.meta.env.VITE_SPACETIME_URI ?? 'ws://127.0.0.1:3106';
    const database = import.meta.env.VITE_COORDINATOR_DB ?? 'tile-tower-defense-coordinator';
    const captain = new URLSearchParams(location.search).get('captain')?.slice(0, 32) ?? 'default';
    const tokenKey = `tile-td:coordinator:${uri}:${database}:${captain}`;
    const current = () => generation === this.generation;
    this.connection = DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(database)
      .withToken(localStorage.getItem(tokenKey) ?? undefined)
      .onConnect((conn, identity, token) => {
        if (!current()) {
          conn.disconnect();
          return;
        }
        this.token = token;
        this.identity = identity.toHexString();
        localStorage.setItem(tokenKey, token);
        const sync = () => {
          if (!current()) {
            return;
          }
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
            this.connected = true;
            this.status = t('session.choose');
            this.name.value = conn.db.captain.owner.find(identity)?.name ?? this.name.value;
            sync();
          })
          .onError((ctx) => {
            if (current()) {
              this.failed(ctx.event);
            }
          })
          .subscribe([
            'SELECT * FROM session',
            'SELECT * FROM slots',
            `SELECT * FROM captain WHERE owner = 0x${identity.toHexString()}`,
            `SELECT * FROM membership WHERE owner = 0x${identity.toHexString()}`,
          ]);
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
  private async provision(id: number) {
    if (!this.provisioner || this.provisioning.has(id)) {
      return;
    }
    this.attempted.add(id);
    this.provisioning.add(id);
    this.error = '';
    this.render();
    try {
      const url = new URL(this.provisioner, location.href);
      url.searchParams.set('id', String(id));
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
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
    const name = cleanName(this.name.value);
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
      const session = this.sessions.find((row) => row.id === id && row.status === 'ready');
      if (!session) {
        throw Error(t('session.notReady'));
      }
      await this.saveName();
      await this.connection!.reducers.visitSession({ id });
      this.game.enter(session, this.name.value, this.token);
    });
  }
  private render() {
    const playing = this.game.ready;
    document.body.dataset.screen = playing ? 'game' : 'menu';
    document.getElementById('session-menu')!.hidden = playing;
    if (playing) {
      return;
    }
    document.getElementById('menu-status')!.textContent = this.status;
    document.getElementById('menu-error')!.textContent = this.error;
    document.getElementById('world-status')!.textContent = this.game.destination
      ? `${this.game.status}${this.game.error ? ': ' + this.game.error : ''}`
      : '';
    document.getElementById('world-actions')!.hidden = !this.game.destination;
    (document.getElementById('world-retry') as HTMLButtonElement).disabled =
      !this.connected || this.busy;
    (document.getElementById('coordinator-retry') as HTMLButtonElement).hidden = this.connected;
    for (const id of ['captain-save', 'session-create']) {
      (document.getElementById(id) as HTMLButtonElement).disabled = !this.connected || this.busy;
    }
    const list = document.getElementById('session-list')!;
    list.replaceChildren();
    for (const session of this.sessions) {
      const row = document.createElement('div');
      row.className = 'session-row';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = session.name;
      const info = document.createElement('small');
      const slots = this.slots.get(session.id);
      const stale = slots
        ? Date.now() - Number(slots.updatedAt.microsSinceUnixEpoch / 1000n) > 60_000
        : true;
      const availability = slots
        ? t('session.availability', {
            count: slots.capacity - slots.claimed,
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
            : slots?.claimed === 4
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
    if (!this.sessions.length) {
      const empty = document.createElement('p');
      empty.textContent = this.connected ? t('session.empty') : t('session.reconnectHint');
      list.append(empty);
    }
  }
}
