import { mkdir,copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dir,'..'),rive=process.env.RIVE_BIN??`${process.env.HOME}/.rive/bin/rive`;
const proc=Bun.spawn([rive,resolve(root,'../td'),'--publish=local'],{stdout:'inherit',stderr:'inherit'});
if(await proc.exited!==0)throw Error('Signing failed. Run ~/.rive/bin/rive login and try again.');
await mkdir(resolve(root,'public'),{recursive:true});
await copyFile(resolve(root,'../td/build/td.riv'),resolve(root,'public/little-keep.riv'));
console.log('Signed scene copied to public/little-keep.riv. Restart the host or reload the page.');
