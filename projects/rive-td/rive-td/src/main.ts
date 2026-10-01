import { resolve } from 'node:path';
const root=resolve(import.meta.dir,'..');
const result=await Bun.build({entrypoints:[resolve(root,'src/client.ts')],target:'browser',outdir:resolve(root,'dist'),minify:false,sourcemap:'external'});
if(!result.success)throw new AggregateError(result.logs,'Client build failed');
const routes:Record<string,string>={'/':'index.html','/client.js':'dist/client.js','/client.js.map':'dist/client.js.map','/rive.wasm':'node_modules/@rive-app/webgl2/rive.wasm','/little-keep.riv':'public/little-keep.riv'};
const server=Bun.serve({hostname:process.env.HOST??'127.0.0.1',port:Number(process.env.PORT??5173),async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==='/config.json')return Response.json({uri:process.env.SPACETIMEDB_HOST??'ws://127.0.0.1:3000',database:process.env.SPACETIMEDB_DB_NAME??'rive-td',riveReady:await Bun.file(resolve(root,'public/little-keep.riv')).exists()});
 const relative=routes[path];if(!relative)return new Response('Not found',{status:404});const file=Bun.file(resolve(root,relative));
 if(!await file.exists())return new Response('Signed game asset missing. Run bun run rive:sign.',{status:503});
 return new Response(file,{headers:{'Cache-Control':'no-cache'}});
}});
console.log(`Little Keep multiplayer: ${server.url}`);
