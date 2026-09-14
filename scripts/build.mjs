import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
import {copyFile} from 'node:fs/promises';
await viteBuild({base:'./'});
await build({entryPoints:['src/background.ts'],outfile:'dist/background.js',bundle:true,format:'esm',target:'chrome116'});
await build({entryPoints:['src/content.ts'],outfile:'dist/content.js',bundle:true,format:'iife',target:'chrome116'});
await copyFile('README.md','dist/README.md');
