import {fileURLToPath} from 'node:url';
if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 ou superior é obrigatório.');
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
process.env.INVICTUS_UI='modern';
await import('../server/start.mjs');