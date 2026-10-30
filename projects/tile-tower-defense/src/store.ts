import { t } from './i18n';
import { worldIslands } from '../shared/config/world';
import type { WorldState, WorldAction } from '../shared/game/world';
import { restoreState } from '../shared/game/save';
import type { State } from '../shared/game/model';
import { fresh } from '../shared/game/rules';
import { DbConnection } from './module_bindings';

export interface WorldDestination {
  id: number;
  name: string;
  uri: string;
  database: string;
}
export class GameStore {
  state: State = fresh();
  world?: WorldState;
  destination?: WorldDestination;
  ownSlot: number | null = null;
  status = t('session.chooseSession');
  ready = false;
  pending = false;
  error = '';
  readonly online = true;
  private sequence = 0;
  private connection?: DbConnection;
  private generation = 0;
  private listeners = new Set<() => void>();
  get faction() {
    return worldIslands[this.ownSlot ?? 0].faction;
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  leave() {
    this.generation++;
    this.connection?.disconnect();
    this.connection = undefined;
    this.destination = undefined;
    this.world = undefined;
    this.state = fresh();
    this.ownSlot = null;
    this.ready = false;
    this.pending = false;
    this.error = '';
    this.status = t('session.chooseSession');
    this.notify();
  }
  enter(destination: WorldDestination, name: string, coordinatorToken: string) {
    this.leave();
    this.destination = destination;
    const generation = this.generation;
    this.status = t('connection.connectingWorld', { name: destination.name });
    this.notify();
    const captain = new URLSearchParams(location.search).get('captain')?.slice(0, 32);
    // Preserve the original per-world token where present; otherwise reuse coordinator identity.
    const tokenKey = `tile-td:${destination.uri}:${destination.database}${captain ? `:captain:${captain}` : ''}`;
    const current = () => generation === this.generation;
    this.connection = DbConnection.builder()
      .withUri(destination.uri)
      .withDatabaseName(destination.database)
      .withToken(localStorage.getItem(tokenKey) ?? coordinatorToken)
      .onConnect((conn, identity, token) => {
        if (!current()) {
          conn.disconnect();
          return;
        }
        localStorage.setItem(tokenKey, token);
        const sync = () => {
          if (!current()) {
            return;
          }
          const row = conn.db.world.id.find(1);
          if (!row) {
            return;
          }
          try {
            const world: WorldState = JSON.parse(row.state);
            if (world.version !== 1) {
              throw Error(t('connection.unsupportedSave'));
            }
            this.world = world;
            const seat = world.seats.find((seat) => seat.owner === identity.toHexString());
            this.ownSlot = seat?.slot ?? null;
            this.state = seat ? restoreState(JSON.stringify(seat.state), false) : fresh();
            this.sequence = seat?.sequence ?? 0;
            this.ready = true;
            this.error = '';
            this.status = t('connection.worldStatus', {
              world: destination.name,
              name: seat ? name : t('session.spectating'),
            });
            this.notify();
          } catch (error) {
            this.failed(error);
          }
        };
        let joined = false;
        conn.db.world.onInsert(() => {
          if (joined) {
            sync();
          }
        });
        conn.db.world.onUpdate(() => {
          if (joined) {
            sync();
          }
        });
        conn
          .subscriptionBuilder()
          .onApplied(() => {
            void conn.reducers
              .worldEnter({ name })
              .then(() => {
                joined = true;
                sync();
              })
              .catch((error) => {
                if (current()) {
                  this.failed(error);
                }
              });
          })
          .onError((ctx) => {
            if (current()) {
              this.failed(ctx.event);
            }
          })
          .subscribe('SELECT * FROM world WHERE id = 1');
      })
      .onConnectError((_ctx, error) => {
        if (current()) {
          this.failed(error);
        }
      })
      .onDisconnect(() => {
        if (current()) {
          this.failed(Error(t('connection.lostRejoin')));
        }
      })
      .build();
  }
  private failed(error: unknown) {
    this.ready = false;
    this.error = error instanceof Error ? error.message : String(error);
    this.status = t('connection.failed');
    this.notify();
  }
  async send(action: WorldAction) {
    if (!this.ready || this.pending || !this.connection) {
      return;
    }
    const generation = this.generation;
    this.error = '';
    this.pending = true;
    this.notify();
    try {
      await this.connection.reducers.worldAct({
        sequence: this.sequence,
        target: 'target' in action ? action.target : 0,
        count: 'count' in action ? action.count : 0,
        action: action.type,
        kind: 'kind' in action ? action.kind : '',
        x: 'x' in action ? action.x : 0,
        y: 'y' in action ? action.y : 0,
        tower: 'tower' in action ? action.tower : 0,
        node: 'node' in action ? action.node : '',
      });
    } catch (error) {
      if (generation === this.generation) {
        this.error = error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (generation === this.generation) {
        this.pending = false;
        this.notify();
      }
    }
  }
}
