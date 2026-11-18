/** The bridge stays on our top-level origin while the provider may sever its own opener. */
export type AccountHandoff = {
  type: 'tile-td:account';
  nonce: string;
  token: string;
  expiresAt: number;
};
export const handoffChannel = (nonce: string) => `tile-td:signin:${nonce}`;

export function validHandoff(data: unknown, nonce: string): data is AccountHandoff {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const value = data as Partial<AccountHandoff>;
  return (
    value.type === 'tile-td:account' &&
    value.nonce === nonce &&
    typeof value.token === 'string' &&
    value.token.length > 0 &&
    value.token.length <= 32_768 &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt > Date.now() + 30_000
  );
}

/** No token is persisted or placed in a URL. Only the nonce-specific bridge can receive it. */
export function deliverHandoff(data: AccountHandoff): Promise<void> {
  return new Promise((resolve, reject) => {
    const channel = new BroadcastChannel(handoffChannel(data.nonce));
    const finish = (error?: Error) => {
      clearInterval(retry);
      clearTimeout(timeout);
      channel.close();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    channel.onmessage = (event) => {
      if (event.data?.type === 'tile-td:received' && event.data.nonce === data.nonce) {
        finish();
      }
    };
    const retry = setInterval(() => channel.postMessage(data), 250);
    const timeout = setTimeout(() => finish(Error('Sign-in bridge unavailable.')), 10_000);
    channel.postMessage(data);
  });
}
