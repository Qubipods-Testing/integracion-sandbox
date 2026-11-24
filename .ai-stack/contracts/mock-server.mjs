#!/usr/bin/env node
// Qubipods · servidor de prueba de los contratos que consume este repo (pod-contracts §D3). Sin dependencias.
// Responde cada fixture de .ai-stack/contracts/<slug>/fixtures/ por método, ruta y query. No lo edites.
//
//   node .ai-stack/contracts/mock-server.mjs [--port 4010] [--slug <slug>] [--root <dir>]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = opt('--root') ?? process.cwd();
const port = Number(opt('--port') ?? 4010);
const only = opt('--slug');
const DIR = join(root, '.ai-stack', 'contracts');

const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const fixtures = [];
for (const c of index.contracts ?? []) {
  if (c.role !== 'consumer' || (only && c.slug !== only)) continue;
  const dir = join(DIR, c.slug, 'fixtures');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) fixtures.push({ slug: c.slug, name: f.slice(0, -5), ...JSON.parse(readFileSync(join(dir, f), 'utf8')) });
}

/** El fixture de una petición: mismo método y ruta, y cada parámetro de query del fixture con el mismo valor. */
export function match(list, method, url) {
  const u = new URL(url, 'http://mock');
  return list.find((f) => f.request.method === method.toUpperCase() && f.request.path === u.pathname && Object.entries(f.request.query ?? {}).every(([k, v]) => u.searchParams.get(k) === String(v))) ?? null;
}

const server = createServer((req, res) => {
  const f = match(fixtures, req.method ?? 'GET', req.url ?? '/');
  if (!f) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Ningún fixture del contrato responde a esta petición', method: req.method, url: req.url }));
  }
  res.writeHead(f.response.status, { 'content-type': 'application/json', 'x-qubipods-fixture': `${f.slug}/${f.name}` });
  res.end(f.response.body === undefined ? '' : JSON.stringify(f.response.body));
});
server.listen(port, '127.0.0.1', () => console.log(`mock de contratos en http://127.0.0.1:${port} (${fixtures.length} fixtures)`));
