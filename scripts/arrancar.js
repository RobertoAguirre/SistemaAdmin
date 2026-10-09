import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puertoPublico = process.env.PORT || '3000';
const apiExterna = process.env.API_URL && !/localhost|127\.0\.0\.1/.test(process.env.API_URL);
const puertoApi = '3001';

const hijos = [];

function proceso(archivo, cwd, env) {
  const hijo = spawn(process.execPath, [archivo], { cwd, env, stdio: 'inherit' });
  hijos.push(hijo);
  return hijo;
}

function cerrar() {
  for (const hijo of hijos) hijo.kill('SIGTERM');
}

process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

if (!apiExterna) {
  proceso('src/index.js', path.join(raiz, 'apps/api'), {
    ...process.env,
    PORT: puertoApi
  });
}

const web = proceso('build/index.js', path.join(raiz, 'apps/web'), {
  ...process.env,
  PORT: puertoPublico,
  HOST: '0.0.0.0',
  API_URL: apiExterna ? process.env.API_URL : `http://127.0.0.1:${puertoApi}`
});

web.on('exit', (codigo) => {
  cerrar();
  process.exit(codigo ?? 0);
});
