/** A fixed app destination carrying only an OAuth code/error and transaction state. */
export function androidAuthReturn(search: string): string | undefined {
  if (search.length > 16_384) {
    return;
  }
  const params = new URLSearchParams(search);
  for (const key of ['state', 'code', 'error']) {
    if (params.getAll(key).length > 1) {
      return;
    }
  }
  const state = params.get('state');
  const code = params.get('code');
  const error = params.get('error');
  if (!state || state.length > 1024 || (!code && !error) || (code && error)) {
    return;
  }
  if ((code && code.length > 8192) || (error && !/^[a-z_]{1,100}$/.test(error))) {
    return;
  }
  const callback = new URL('com.maxgeorg.tiletowerdefense:/oauth2redirect');
  callback.searchParams.set('state', state);
  if (code) {
    callback.searchParams.set('code', code);
  }
  if (error) {
    callback.searchParams.set('error', error);
  }
  return callback.toString();
}
