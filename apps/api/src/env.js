import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) {
  const lineas = readFileSync('.env', 'utf8').split('\n');
  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte === -1) continue;
    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (clave && process.env[clave] === undefined) process.env[clave] = valor;
  }
}
