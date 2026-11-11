import {defineConfig} from 'vite';
const {CODESPACE_NAME,GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,REPLIT_DEV_DOMAIN} = process.env;
const codeHost=CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN &&
  CODESPACE_NAME+'-5173.'+GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
export default defineConfig({
  server:{allowedHosts:[codeHost,REPLIT_DEV_DOMAIN].filter(Boolean),port:5173,strictPort:true}
});
