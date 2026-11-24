#!/usr/bin/env node
// Qubipods · verificación de contratos entre pods (pod-contracts §D9). JavaScript sin dependencias: corre en la máquina
// del pod con `node`. La plataforma lo publica en .ai-stack/contracts/check.mjs; no lo edites.
//
//   node .ai-stack/contracts/check.mjs --role provider|consumer [--index <sha256>] [--expect <slug>@<version>=<hash>]... [--only <slug>#<parte>/<op>,<op>]... [--root <dir>]
//
// Proveedor: cada ejemplo tiene lo observado en .agentos/contracts/observed/<slug>/<ejemplo>.json ({ status, body }), con
// el estado del ejemplo, la forma del contrato, las mismas claves y tipos del ejemplo y los valores de `assert`.
// Proveedor de una parte published-file (estático): lee cada archivo en su `path` del repo y lo evalúa contra el contrato.
// Consumidor: cada fixture tiene lo observado ({ exercised: true, test }) y el código no usa otra escritura de un campo
// del contrato (lint de alias; se silencia con `qubipods-contract-ignore <clave>` en la misma línea).
// Siempre: la copia es la publicada (hash del documento canónico sin `version`). Sale con 1 si hay errores.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => args.flatMap((a, i) => (a === name && args[i + 1] !== undefined ? [args[i + 1]] : []));
const role = opt('--role')[0];
const root = opt('--root')[0] ?? process.cwd();
const DIR = join(root, '.ai-stack', 'contracts');
const OBSERVED = join(root, '.agentos', 'contracts', 'observed');
const errors = [];
const infos = [];
const err = (m) => errors.push(m);
const info = (m) => infos.push(m);

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, sortKeys(v[k])])) : v);
const canonical = (v) => JSON.stringify(sortKeys(v));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v);
const pointer = (root, ptr) => {
  if (ptr === '') return root;
  let cur = root;
  for (const raw of ptr.slice(1).split('/')) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(cur)) cur = cur[Number(k)];
    else if (isObj(cur) && k in cur) cur = cur[k];
    else return undefined;
  }
  return cur;
};

if (role !== 'provider' && role !== 'consumer') {
  console.error('Uso: node .ai-stack/contracts/check.mjs --role provider|consumer [--expect slug@version=hash] [--only slug#parte/op,op]');
  process.exit(2);
}
if (!existsSync(join(DIR, 'index.json'))) {
  console.error('No hay .ai-stack/contracts/index.json: este repo no tiene contratos del kit.');
  process.exit(2);
}

// --only slug#parte/op1,op2 → operaciones a verificar por contrato (una serie verifica lo suyo)
const only = new Map();
for (const o of opt('--only')) {
  const m = /^([a-z0-9][a-z0-9-]{2,62})(?:#([^/]+)\/(.+))?$/.exec(o);
  if (!m) { err(`--only inválido: ${o}`); continue; }
  only.set(m[1], m[3] ? new Set(m[3].split(',').map((x) => x.trim()).filter(Boolean)) : null);
}
const expect = new Map(opt('--expect').map((e) => { const m = /^(.+)@(.+)=([0-9a-f]{64})$/.exec(e); return m ? [m[1], { version: m[2], hash: m[3] }] : [e, null]; }));

// ── formas (perfil de JSON Schema 2020-12 del contrato) ─────────────────────────────
const UNSUPPORTED = ['oneOf', 'anyOf', 'allOf', 'not', 'if', 'then', 'else', 'patternProperties'];
function checkValue(schema, value, at, resolve, out, hops = 0) {
  if (!isObj(schema) || hops > 32) return;
  if (typeof schema.$ref === 'string') {
    const t = schema.$ref.startsWith('#/') ? resolve(schema.$ref) : undefined;
    if (t !== undefined) checkValue(t, value, at, resolve, out, hops + 1);
    return;
  }
  if (UNSUPPORTED.some((k) => k in schema)) return;
  const actual = typeOf(value);
  if ('type' in schema) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!(types.includes(actual) || (actual === 'integer' && types.includes('number')))) { out.push(`${at || '/'}: se esperaba ${types.join(' o ')} y llegó ${actual}`); return; }
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => canonical(e) === canonical(value))) { out.push(`${at || '/'}: el valor no está entre los permitidos`); return; }
  if (Array.isArray(value) && isObj(schema.items)) value.forEach((v, i) => checkValue(schema.items, v, `${at}/${i}`, resolve, out));
  if (isObj(value)) {
    const props = isObj(schema.properties) ? schema.properties : {};
    for (const k of Array.isArray(schema.required) ? [...schema.required].sort() : []) if (!(k in value)) out.push(`${at || '/'}: falta el campo obligatorio «${k}»`);
    for (const k of Object.keys(value).sort()) {
      if (k in props) checkValue(props[k], value[k], `${at}/${k}`, resolve, out);
      else if (schema.additionalProperties === false) out.push(`${at}/${k}: el campo no está en el contrato`);
    }
  }
}

/** Claves del ejemplo que lo observado no tiene con el mismo tipo; lo que sobra se informa. */
function sameKeys(example, observed, at, out, extra) {
  if (isObj(example)) {
    if (!isObj(observed)) { out.push(`${at || '/'}: se esperaba un objeto`); return; }
    for (const k of Object.keys(example).sort()) {
      if (!(k in observed)) { out.push(`${at}/${k}: falta (¿otra escritura del campo?)`); continue; }
      if (typeOf(example[k]) !== typeOf(observed[k]) && !(typeOf(example[k]) === 'integer' && typeOf(observed[k]) === 'number')) out.push(`${at}/${k}: se esperaba ${typeOf(example[k])} y llegó ${typeOf(observed[k])}`);
      else sameKeys(example[k], observed[k], `${at}/${k}`, out, extra);
    }
    for (const k of Object.keys(observed).sort()) if (!(k in example)) extra.push(`${at}/${k}`);
  } else if (Array.isArray(example) && Array.isArray(observed) && example.length) {
    observed.forEach((o, i) => sameKeys(example[0], o, `${at}/${i}`, out, extra));
  }
}

/** Ejemplos de las partes http-api: clave → { operationId, status, value, asserts, schema, resolve }. */
function examplesOf(doc) {
  const out = new Map();
  for (const part of Array.isArray(doc.parts) ? doc.parts : []) {
    if (part?.type !== 'http-api' || !isObj(part.openapi)) continue;
    const oa = part.openapi;
    const resolve = (ref) => pointer(oa, ref.slice(1));
    const deref = (o) => (isObj(o) && typeof o.$ref === 'string' ? resolve(o.$ref) : o);
    for (const path of Object.keys(oa.paths ?? {})) {
      for (const method of ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace']) {
        const op = oa.paths[path]?.[method];
        if (!isObj(op)) continue;
        const keys = new Set();
        for (const p of Array.isArray(op.parameters) ? op.parameters : []) for (const k of Object.keys(deref(p)?.examples ?? {})) keys.add(k);
        for (const k of Object.keys(deref(op.requestBody)?.content?.['application/json']?.examples ?? {})) keys.add(k);
        let empty = null;
        for (const status of Object.keys(op.responses ?? {}).sort()) {
          const r = deref(op.responses[status]);
          const json = r?.content?.['application/json'];
          if (!isObj(json) && /^2/.test(status) && empty === null) empty = status;
          for (const [k, ex] of Object.entries(json?.examples ?? {})) {
            keys.delete(k);
            out.set(k, { part: part.id, operationId: op.operationId, status: Number(status), value: ex?.value, asserts: Array.isArray(ex?.['x-qubipods-assert']) ? ex['x-qubipods-assert'] : [], schema: json.schema, resolve });
          }
        }
        for (const k of keys) out.set(k, { part: part.id, operationId: op.operationId, status: Number(empty ?? 0), value: undefined, asserts: [], schema: undefined, resolve });
      }
    }
  }
  return out;
}

/** Nombres de campos de todas las formas del contrato. */
function fieldNames(doc) {
  const names = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (isObj(node)) {
      if (isObj(node.properties)) for (const k of Object.keys(node.properties)) names.add(k);
      for (const [k, v] of Object.entries(node)) if (k !== 'examples' && k !== 'example') walk(v);
    }
  };
  walk(doc.parts);
  return names;
}

const words = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase().split(/\s+/);
function variants(name) {
  const w = words(name);
  if (w.length < 2) return [];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const all = [w.join('_'), w[0] + w.slice(1).map(cap).join(''), w.map(cap).join(''), w.join('-'), w.join('_').toUpperCase()];
  return [...new Set(all)].filter((v) => v !== name);
}

const SKIP = new Set(['.git', 'node_modules', '.ai-stack', '.agentos', 'dist', 'build', 'bin', 'obj', '.dart_tool', 'Pods', 'coverage', '.next', 'out', 'vendor']);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|dart|cs|kt|kts|swift|java|py|go|rb|php|vue|svelte)$/;
function* sourceFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) yield* sourceFiles(join(dir, e.name)); }
    else if (CODE.test(e.name)) { const p = join(dir, e.name); if (statSync(p).size <= 512 * 1024) yield p; }
  }
}

// ── published-file (mismas reglas que api/src/contracts/published-file.ts) ──────────
const esc = (k) => String(k).replace(/~/g, '~0').replace(/\//g, '~1');
function subsetProblems(expected, actual, at = '') {
  if (isObj(expected)) {
    if (!isObj(actual)) return [`${at || '/'}: se esperaba un objeto`];
    return Object.keys(expected).sort().flatMap((k) => (k in actual ? subsetProblems(expected[k], actual[k], `${at}/${esc(k)}`) : [`${at}/${esc(k)}: falta`]));
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${at || '/'}: se esperaba una lista`];
    return expected.flatMap((e, i) => (actual.some((a) => !subsetProblems(e, a).length) ? [] : [`${at}/${i}: ningún elemento lo cumple`]));
  }
  return canonical(expected) === canonical(actual) ? [] : [`${at || '/'}: debe ser ${JSON.stringify(expected)}`];
}
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}
function fileProblems(f, content) {
  if (f.format === 'json') return f.mustContain === undefined ? [] : subsetProblems(f.mustContain, content).map((p) => `mustContain ${p}`);
  if (f.format === 'csv') {
    const header = f.header !== false;
    const ordered = !header || f.ordered === true;
    const columns = Array.isArray(f.columns) ? f.columns : [];
    const rows = parseCsv(content, typeof f.delimiter === 'string' ? f.delimiter : ',');
    if (!rows.length) return ['el CSV está vacío'];
    const out = [];
    const width = header ? rows[0].length : columns.length;
    if (header) {
      const head = rows[0].map((c) => c.trim());
      if (ordered ? !columns.every((c, i) => head[i] === c) : !columns.every((c) => head.includes(c))) out.push(`el encabezado debe tener ${ordered ? 'al inicio, en ese orden, ' : ''}las columnas ${columns.join(', ')}`);
    }
    rows.slice(header ? 1 : 0).forEach((r, i) => { if (header ? r.length !== width : r.length < width) out.push(`la fila ${i + 1} tiene ${r.length} columnas y se esperaban ${header ? width : `al menos ${width}`}`); });
    return out;
  }
  if (f.format === 'sitemap') {
    if (!/<urlset[\s>]/.test(content)) return ['un sitemap tiene un elemento <urlset>'];
    const locs = new Set([...content.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')));
    return (Array.isArray(f.urls) ? f.urls : []).filter((u) => !locs.has(u)).map((u) => `falta la URL ${u}`);
  }
  const lines = new Set(content.split(/\r?\n/));
  return (Array.isArray(f.lines) ? f.lines : []).filter((l) => !lines.has(l)).map((l) => `falta la línea «${l}»`);
}

/** Los archivos que publica el repo: cada uno existe en su `path` y cumple su especificación. */
function checkPublishedFiles(c, doc, ops) {
  for (const part of Array.isArray(doc.parts) ? doc.parts : []) {
    if (part?.type !== 'published-file') continue;
    for (const f of Array.isArray(part.files) ? part.files : []) {
      if (!isObj(f) || (ops && !ops.has(f.id))) continue;
      const file = join(root, String(f.path));
      if (typeof f.path !== 'string' || f.path.split('/').includes('..') || !existsSync(file)) { err(`${c.slug}/${f.id}: falta el archivo ${f.path} en el repo`); continue; }
      let content = readFileSync(file, 'utf8');
      if (f.format === 'json') {
        try { content = JSON.parse(content); } catch { err(`${c.slug}/${f.id}: ${f.path} no es JSON válido`); continue; }
      }
      for (const p of fileProblems(f, content)) err(`${c.slug}/${f.id}: ${f.path}: ${p}`);
    }
  }
}

// ── verificación ───────────────────────────────────────────────────────────────────
// --index <sha256>: el index.json es exactamente el que espera la construcción (la plataforma lo arma con esa versión)
const wantIndex = opt('--index')[0];
if (wantIndex) {
  const got = createHash('sha256').update(readFileSync(join(DIR, 'index.json'))).digest('hex');
  if (got !== wantIndex) err(`la copia de .ai-stack/contracts/ no es la que espera esta construcción (index.json ${got.slice(0, 12)} ≠ ${wantIndex.slice(0, 12)}): no la edites; si cambió la versión, espera la copia nueva del kit`);
}
const index = readJson(join(DIR, 'index.json'));
const mine = (index.contracts ?? []).filter((c) => c.role === role && (!only.size || only.has(c.slug)));
for (const [slug, e] of expect) if (!e) err(`--expect inválido: ${slug}`);

for (const c of mine) {
  const docPath = join(DIR, c.manifest ?? `${c.slug}/contract.json`);
  if (!existsSync(docPath)) { err(`${c.slug}: falta la copia ${relative(root, docPath)}`); continue; }
  const doc = readJson(docPath);
  const rest = { ...doc };
  delete rest.version;
  const hash = createHash('sha256').update(canonical(rest)).digest('hex');
  if (hash !== c.hash) err(`${c.slug}: la copia no es la publicada (hash ${hash.slice(0, 12)} ≠ ${String(c.hash).slice(0, 12)}): no edites .ai-stack/contracts/`);
  const want = expect.get(c.slug);
  if (want && (want.hash !== c.hash || want.version !== c.version)) err(`${c.slug}: el repo tiene ${c.version} y la construcción espera ${want.version} (hash ${want.hash.slice(0, 12)})`);
  const ops = only.get(c.slug);
  const examples = [...examplesOf(doc)].filter(([, ex]) => !ops || ops.has(ex.operationId));

  // routes y los tipos de formato propio (pod-contracts F): sus ejemplos van en el sobre
  checkOwnExamples(c, doc, ops);
  if (role === 'provider') {
    checkPublishedFiles(c, doc, ops);
    for (const [key, ex] of examples) {
      const file = join(OBSERVED, c.slug, `${key}.json`);
      if (!existsSync(file)) { err(`${c.slug}/${key}: falta lo observado en ${relative(root, file).split(sep).join('/')} (¿la prueba del ejemplo no corrió?)`); continue; }
      let obs;
      try { obs = readJson(file); } catch { err(`${c.slug}/${key}: lo observado no es JSON`); continue; }
      if (obs.status !== ex.status) err(`${c.slug}/${key}: estado ${obs.status}, el ejemplo espera ${ex.status}`);
      if (ex.value === undefined) continue;
      const problems = [];
      if (ex.schema !== undefined) checkValue(ex.schema, obs.body, '', ex.resolve, problems);
      const extra = [];
      sameKeys(ex.value, obs.body, '', problems, extra);
      for (const ptr of ex.asserts) if (canonical(pointer(obs.body, ptr)) !== canonical(pointer(ex.value, ptr))) problems.push(`${ptr}: debe ser ${JSON.stringify(pointer(ex.value, ptr))}`);
      for (const p of [...new Set(problems)]) err(`${c.slug}/${key}: ${p}`);
      if (extra.length) info(`${c.slug}/${key}: campos de más (se aceptan): ${extra.join(', ')}`);
    }
  } else {
    for (const [key] of examples) {
      const fixture = join(DIR, c.slug, 'fixtures', `${key}.json`);
      if (!existsSync(fixture)) err(`${c.slug}/${key}: falta el fixture ${relative(root, fixture).split(sep).join('/')}`);
      const file = join(OBSERVED, c.slug, `${key}.json`);
      let obs = null;
      try { obs = existsSync(file) ? readJson(file) : null; } catch { obs = null; }
      if (!obs || obs.exercised !== true) err(`${c.slug}/${key}: ninguna prueba ejercitó el fixture (falta ${relative(root, file).split(sep).join('/')} con exercised: true)`);
    }
    // lint de alias: otra escritura de un campo del contrato en el código
    const aliases = new Map();
    for (const name of fieldNames(doc)) for (const v of variants(name)) if (!fieldNames(doc).has(v)) aliases.set(v, name);
    if (aliases.size) {
      const re = new RegExp(`(["'\`])(${[...aliases.keys()].map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\1`, 'g');
      for (const file of sourceFiles(root)) {
        const lines = readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
          for (const m of line.matchAll(re)) {
            const field = aliases.get(m[2]);
            if (new RegExp(`qubipods-contract-ignore\\s+(${m[2]}|${field})\\b`).test(line)) continue;
            err(`${relative(root, file).split(sep).join('/')}:${i + 1}: «${m[2]}» es otra escritura de «${field}» (${c.slug}); usa «${field}» o marca la línea con qubipods-contract-ignore ${m[2]}`);
          }
        });
      }
    }
  }
}

/**
 * Ejemplos del sobre (routes, config) y de mensajes de `event`. routes: el proveedor (la web que aloja) observa
 * `{ status }` por URL y debe ser 200; el consumidor (la app que abre) observa `{ route, params }` y debe ser lo que dice
 * `expect`. config y event, en el consumidor: cada fixture ejercitado. published-file tiene su chequeo estático aparte.
 */
function checkOwnExamples(c, doc, ops) {
  if (ops) return; // --only limita operaciones http-api: los ejemplos propios se verifican en la verificación completa
  const parts = new Map((Array.isArray(doc.parts) ? doc.parts : []).map((p) => [p?.id, p]));
  const observed = (key) => {
    const file = join(OBSERVED, c.slug, `${key}.json`);
    try { return existsSync(file) ? readJson(file) : undefined; } catch { return null; }
  };
  const where = (key) => relative(root, join(OBSERVED, c.slug, `${key}.json`)).split(sep).join('/');
  for (const ex of Array.isArray(doc.examples) ? doc.examples : []) {
    const part = parts.get(ex?.part);
    if (!part || typeof ex.id !== 'string') continue;
    if (part.type === 'routes') {
      const obs = observed(ex.id);
      if (obs === undefined) { err(`${c.slug}/${ex.id}: falta lo observado en ${where(ex.id)} (¿la prueba de la ruta no corrió?)`); continue; }
      if (obs === null) { err(`${c.slug}/${ex.id}: lo observado no es JSON`); continue; }
      if (role === 'provider') {
        if (obs.status !== 200) err(`${c.slug}/${ex.id}: ${ex.url} respondió ${obs.status}, se espera 200`);
      } else {
        if (obs.route !== ex.expect?.route) err(`${c.slug}/${ex.id}: ${ex.url} abrió ${obs.route ?? 'nada'}, se espera ${ex.expect?.route}`);
        if (canonical(obs.params ?? {}) !== canonical(ex.expect?.params ?? {})) err(`${c.slug}/${ex.id}: parámetros ${JSON.stringify(obs.params ?? {})}, se esperan ${JSON.stringify(ex.expect?.params ?? {})}`);
      }
    } else if (part.type === 'config' && role === 'consumer') {
      const obs = observed(ex.id);
      if (!obs || obs.exercised !== true) err(`${c.slug}/${ex.id}: ninguna prueba ejercitó el fixture (falta ${where(ex.id)} con exercised: true)`);
    }
  }
  // event: el proveedor observa { payload, headers? } construido con el código real; el consumidor, exercised
  for (const part of parts.values()) {
    if (part?.type !== 'event' || !isObj(part.asyncapi?.components?.messages)) continue;
    for (const m of Object.values(part.asyncapi.components.messages)) {
      for (const e of Array.isArray(m?.examples) ? m.examples : []) {
        if (typeof e?.name !== 'string') continue;
        const obs = observed(e.name);
        if (role === 'consumer') {
          if (!obs || obs.exercised !== true) err(`${c.slug}/${e.name}: ninguna prueba ejercitó el mensaje (falta ${where(e.name)} con exercised: true)`);
          continue;
        }
        if (!obs || obs.payload === undefined) { err(`${c.slug}/${e.name}: falta lo observado del mensaje en ${where(e.name)} ({ payload })`); continue; }
        const problems = [];
        const extra = [];
        sameKeys(e.payload, obs.payload, '/payload', problems, extra);
        if (e.headers !== undefined) sameKeys(e.headers, obs.headers ?? {}, '/headers', problems, extra);
        for (const p of [...new Set(problems)]) err(`${c.slug}/${e.name}: ${p}`);
        if (extra.length) info(`${c.slug}/${e.name}: campos de más (se aceptan): ${extra.join(', ')}`);
      }
    }
  }
}

const result = { ok: errors.length === 0, role, contracts: mine.map((c) => `${c.slug}@${c.version}`), errors, infos };
try {
  mkdirSync(join(root, '.agentos', 'contracts'), { recursive: true });
  writeFileSync(join(root, '.agentos', 'contracts', `result-${role}.json`), JSON.stringify(result, null, 2) + '\n');
} catch { /* sin permiso de escritura: la salida igual sale por consola */ }
for (const i of infos) console.log(`info  ${i}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(result.ok ? `contracts ${role}: OK (${result.contracts.join(', ') || 'sin contratos'})` : `contracts ${role}: ${errors.length} error(es)`);
process.exit(result.ok ? 0 : 1);
