import { expect, test } from 'bun:test';
import { connectionHealth } from '../src/connection-health';
const responder = (status:number) => (async () => new Response('', {status})) as typeof fetch;
test('missing database reports the publish command instead of claiming a lost connection', async () => {
 const health=await connectionHealth('ws://127.0.0.1:3000','rive-td',responder(404));
 expect(health.ok).toBe(false);
 expect(health.message).toContain('Database "rive-td" is missing');
 expect(health.message).toContain('spacetime publish rive-td --server http://127.0.0.1:3000');
});
test('available database permits connection; unreachable server gives recovery guidance',async()=>{
 expect((await connectionHealth('ws://127.0.0.1:3000','rive-td',responder(200))).ok).toBe(true);
 const failed=(async()=>{throw Error('ECONNREFUSED');}) as typeof fetch;
 expect((await connectionHealth('ws://127.0.0.1:3000','rive-td',failed)).message).toContain('Start the database server');
 expect((await connectionHealth('ws://127.0.0.1:3000','rive-td',responder(503))).ok).toBe(false);
});
