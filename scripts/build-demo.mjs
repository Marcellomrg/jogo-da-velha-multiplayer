import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const path=process.argv[2] || 'Demonstracao_Local.html';
const result=await build({entryPoints:['src/demo.jsx'],bundle:true,minify:true,write:false,outfile:'demo.js',
  define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline'});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
await writeFile(path,'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demonstração local · Jogo da Velha</title><style>'+css+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>');
