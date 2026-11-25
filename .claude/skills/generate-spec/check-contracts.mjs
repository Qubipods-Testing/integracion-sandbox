#!/usr/bin/env node
// Qubipods · validación de contratos qubipods.contract/1 (las mismas reglas que aplica la plataforma al leer el PR de spec).
// La publica la plataforma con el kit; no la edites. Uso:
//   node .claude/skills/generate-spec/check-contracts.mjs openspec/changes/<id-del-cambio>/contracts/*.contract.json [--provider <sistema>]
// Sale con 1 si algún contrato tiene errores: corrígelos antes de abrir el pull request.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const CONTRACT_LINT_PATH = ".claude/skills/generate-spec/check-contracts.mjs";
const __node = createRequire(import.meta.url);
const __defs = {
  "validate": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PARTS = exports.MAX_EXAMPLES = exports.MAX_DOC_OPERATIONS = exports.MAX_CANONICAL_BYTES = void 0;
exports.validateContract = validateContract;
const model_1 = __mod("model");
const own_1 = __mod("own");
const shapes_1 = __mod("shapes");
const types_1 = __mod("types/index");
exports.MAX_CANONICAL_BYTES = 64 * 1024;
exports.MAX_DOC_OPERATIONS = 100;
exports.MAX_EXAMPLES = 50;
exports.MAX_PARTS = 20;
const SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;
const PART_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const EXAMPLE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SHAPE_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
function validateContract(input) {
    const issues = [];
    if (!(0, model_1.isObject)(input))
        return { ok: false, issues: [(0, model_1.issue)('', 'doc.not-object', 'El contrato debe ser un objeto JSON')], types: [] };
    if (input.format !== model_1.CONTRACT_FORMAT)
        issues.push((0, model_1.issue)('/format', 'format.unsupported', `format debe ser «${model_1.CONTRACT_FORMAT}»`));
    if (typeof input.slug !== 'string' || !SLUG.test(input.slug)) {
        issues.push((0, model_1.issue)('/slug', 'slug.invalid', 'El slug debe tener de 3 a 63 caracteres en minúsculas, números y guiones, y empezar con letra o número'));
    }
    if (!text(input.title, 120))
        issues.push((0, model_1.issue)('/title', 'text.invalid', 'El título es obligatorio y tiene hasta 120 caracteres'));
    if (input.summary !== undefined && !text(input.summary, 500))
        issues.push((0, model_1.issue)('/summary', 'text.invalid', 'El resumen tiene hasta 500 caracteres'));
    if (!(0, model_1.isObject)(input.provider) || !text(input.provider.system, 120))
        issues.push((0, model_1.issue)('/provider/system', 'provider.invalid', 'provider.system es el sistema que publica el contrato'));
    const types = new Set();
    let operations = 0;
    let examples = 0;
    if (!Array.isArray(input.parts) || !input.parts.length || input.parts.length > exports.MAX_PARTS) {
        issues.push((0, model_1.issue)('/parts', 'parts.invalid', `El contrato debe tener de 1 a ${exports.MAX_PARTS} partes`));
    }
    else {
        const ids = new Set();
        input.parts.forEach((part, i) => {
            const at = `/parts/${i}`;
            if (!(0, model_1.isObject)(part)) {
                issues.push((0, model_1.issue)(at, 'part.invalid', 'Cada parte debe ser un objeto'));
                return;
            }
            if (typeof part.id !== 'string' || !PART_ID.test(part.id))
                issues.push((0, model_1.issue)(`${at}/id`, 'part.id-invalid', 'El id de la parte tiene hasta 32 caracteres en minúsculas, números y guiones'));
            else if (ids.has(part.id))
                issues.push((0, model_1.issue)(`${at}/id`, 'part.id-duplicate', `El id de parte «${part.id}» está repetido`));
            else
                ids.add(part.id);
            const type = (0, types_1.contractType)(part.type);
            if (!type) {
                issues.push((0, model_1.issue)(`${at}/type`, 'part.type-unknown', 'Tipo de parte desconocido'));
                return;
            }
            types.add(type.id);
            const partIssues = type.validatePart(part, at, input);
            issues.push(...partIssues);
            const counts = type.count(part, input);
            examples += counts.examples;
            if (!partIssues.some((x) => x.code === 'doc.too-many-operations'))
                operations += counts.operations;
        });
    }
    envelopeShapes(input, issues);
    envelopeExamples(input, issues);
    if (operations > exports.MAX_DOC_OPERATIONS)
        issues.push((0, model_1.issue)('/parts', 'doc.too-many-operations', `Un contrato admite hasta ${exports.MAX_DOC_OPERATIONS} operaciones, mensajes o rutas`));
    if (examples > exports.MAX_EXAMPLES)
        issues.push((0, model_1.issue)('/parts', 'doc.too-many-examples', `Un contrato admite hasta ${exports.MAX_EXAMPLES} ejemplos`));
    const canonical = (0, model_1.canonicalJson)(input);
    if (Buffer.byteLength(canonical, 'utf8') > exports.MAX_CANONICAL_BYTES)
        issues.push((0, model_1.issue)('', 'doc.too-large', 'El contrato no puede superar 64 KB'));
    const ok = !issues.some((x) => x.severity === 'error');
    const sortedTypes = [...types].sort();
    if (!ok)
        return { ok, issues, types: sortedTypes };
    const doc = input;
    return { ok, issues, doc, canonical, hash: (0, model_1.contractHash)(doc), types: sortedTypes };
}
function envelopeShapes(input, issues) {
    if (input.shapes === undefined)
        return;
    if (!(0, model_1.isObject)(input.shapes)) {
        issues.push((0, model_1.issue)('/shapes', 'shapes.invalid', 'shapes debe ser un objeto con formas por nombre'));
        return;
    }
    const resolve = (0, own_1.shapesResolver)(input);
    for (const name of Object.keys(input.shapes)) {
        const at = `/shapes/${(0, model_1.esc)(name)}`;
        if (!SHAPE_NAME.test(name))
            issues.push((0, model_1.issue)(at, 'shapes.name-invalid', 'El nombre de una forma tiene hasta 64 letras, números, puntos, guiones o guiones bajos, y empieza con letra'));
        (0, shapes_1.checkShape)(input.shapes[name], at, resolve, issues);
    }
}
function envelopeExamples(input, issues) {
    if (input.examples === undefined)
        return;
    if (!Array.isArray(input.examples)) {
        issues.push((0, model_1.issue)('/examples', 'examples.invalid', 'examples debe ser una lista'));
        return;
    }
    const parts = new Map();
    if (Array.isArray(input.parts))
        for (const p of input.parts)
            if ((0, model_1.isObject)(p) && typeof p.id === 'string' && !parts.has(p.id))
                parts.set(p.id, p.type);
    const ids = new Set();
    input.examples.forEach((ex, i) => {
        const at = `/examples/${i}`;
        if (!(0, model_1.isObject)(ex)) {
            issues.push((0, model_1.issue)(at, 'example.invalid', 'Cada ejemplo debe ser un objeto'));
            return;
        }
        if (typeof ex.id !== 'string' || !EXAMPLE_ID.test(ex.id))
            issues.push((0, model_1.issue)(`${at}/id`, 'example.id-invalid', 'El id del ejemplo tiene hasta 64 caracteres en minúsculas, números y guiones'));
        else if (ids.has(ex.id))
            issues.push((0, model_1.issue)(`${at}/id`, 'example.id-duplicate', `El id de ejemplo «${ex.id}» está repetido`));
        else
            ids.add(ex.id);
        const type = typeof ex.part === 'string' && parts.has(ex.part) ? (0, types_1.contractType)(parts.get(ex.part)) : undefined;
        if (typeof ex.part !== 'string' || !parts.has(ex.part))
            issues.push((0, model_1.issue)(`${at}/part`, 'example.part-unknown', 'part debe ser el id de una parte del contrato'));
        else if (type && !type.ownFormat)
            issues.push((0, model_1.issue)(`${at}/part`, 'example.part-invalid', `Los ejemplos de una parte ${type.id} van dentro de su documento estándar, no en examples`));
    });
}
//# sourceMappingURL=validate.js.map
  },
  "model": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issue = exports.esc = exports.sameJson = exports.isObject = exports.COMPAT_RANK = exports.CONTRACT_FORMAT = void 0;
exports.canonicalJson = canonicalJson;
exports.contractHash = contractHash;
exports.pointer = pointer;
const crypto_1 = __node("crypto");
exports.CONTRACT_FORMAT = 'qubipods.contract/1';
exports.COMPAT_RANK = { INICIAL: 0, PARCHE: 1, COMPATIBLE: 2, ROMPE: 3 };
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
exports.isObject = isObject;
function canonicalJson(value) {
    return JSON.stringify(sortKeys(value));
}
function sortKeys(value) {
    if (Array.isArray(value))
        return value.map(sortKeys);
    if (!(0, exports.isObject)(value))
        return value;
    const out = {};
    for (const k of Object.keys(value).sort())
        if (value[k] !== undefined)
            out[k] = sortKeys(value[k]);
    return out;
}
function contractHash(doc) {
    const rest = { ...doc };
    delete rest.version;
    return (0, crypto_1.createHash)('sha256').update(canonicalJson(rest)).digest('hex');
}
const sameJson = (a, b) => canonicalJson(a) === canonicalJson(b);
exports.sameJson = sameJson;
const esc = (key) => String(key).replace(/~/g, '~0').replace(/\//g, '~1');
exports.esc = esc;
function pointer(root, ptr) {
    if (ptr === '')
        return root;
    if (!ptr.startsWith('/'))
        return undefined;
    let cur = root;
    for (const raw of ptr.slice(1).split('/')) {
        const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
        if (Array.isArray(cur)) {
            if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= cur.length)
                return undefined;
            cur = cur[Number(key)];
        }
        else if ((0, exports.isObject)(cur) && Object.prototype.hasOwnProperty.call(cur, key)) {
            cur = cur[key];
        }
        else {
            return undefined;
        }
    }
    return cur;
}
const issue = (path, code, message, severity = 'error') => ({ path, code, message, severity });
exports.issue = issue;
//# sourceMappingURL=model.js.map
  },
  "own": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoPath = exports.text = exports.ptr = exports.OWN_COMMON_RULES = exports.SHAPES_REF = void 0;
exports.shapesResolver = shapesResolver;
exports.partExamples = partExamples;
exports.exampleChanges = exampleChanges;
exports.byId = byId;
const model_1 = __mod("model");
exports.SHAPES_REF = '#/shapes/';
function shapesResolver(doc) {
    return (ref) => {
        if (typeof ref !== 'string' || !ref.startsWith(exports.SHAPES_REF) || ref.slice(exports.SHAPES_REF.length).includes('/'))
            return undefined;
        const schema = (0, model_1.pointer)(doc, ref.slice(1));
        return schema === undefined ? undefined : { schema, path: ref.slice(1) };
    };
}
function partExamples(doc, partId) {
    const list = doc.examples;
    if (!Array.isArray(list))
        return [];
    const out = [];
    list.forEach((ex, i) => {
        if ((0, model_1.isObject)(ex) && ex.part === partId)
            out.push({ ex, at: `/examples/${i}` });
    });
    return out;
}
const C = 'COMPATIBLE';
const P = 'PARCHE';
exports.OWN_COMMON_RULES = {
    'example.added': C,
    'example.removed': C,
    'example.changed': C,
    'text.changed': P,
};
function exampleChanges(before, after, ctx, add) {
    const b = new Map(partExamples(ctx.before, before.id).map((e) => [String(e.ex.id), e]));
    const a = new Map(partExamples(ctx.after, after.id).map((e) => [String(e.ex.id), e]));
    for (const [id, e] of b)
        if (!a.has(id))
            add('example.removed', e.at, { before: id });
    for (const [id, e] of a) {
        const old = b.get(id);
        if (!old)
            add('example.added', e.at, { after: id });
        else if (!(0, model_1.sameJson)(old.ex, e.ex))
            add('example.changed', e.at, { after: id });
    }
}
function byId(list) {
    const out = new Map();
    if (Array.isArray(list))
        list.forEach((v, i) => (0, model_1.isObject)(v) && typeof v.id === 'string' && !out.has(v.id) && out.set(v.id, { i, v }));
    return out;
}
const ptr = (...keys) => keys.map((k) => '/' + (0, model_1.esc)(k)).join('');
exports.ptr = ptr;
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
exports.text = text;
const repoPath = (v) => typeof v === 'string' && v.length > 0 && v.length <= 300 && !v.startsWith('/') && !v.includes('\\') && !v.split('/').some((s) => s === '..' || s === '');
exports.repoPath = repoPath;
//# sourceMappingURL=own.js.map
  },
  "shapes": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocalRef = exports.MAX_SHAPE_DEPTH = void 0;
exports.unsupportedKeys = unsupportedKeys;
exports.checkShape = checkShape;
exports.checkValue = checkValue;
const model_1 = __mod("model");
exports.MAX_SHAPE_DEPTH = 8;
const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']);
const SUPPORTED = new Set([
    'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'format', 'pattern',
    'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems',
    '$ref',
]);
const ANNOTATIONS = new Set(['title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly', '$comment']);
const NUMBERS = ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum'];
const LENGTHS = ['minLength', 'maxLength', 'minItems', 'maxItems'];
const isLocalRef = (ref) => typeof ref === 'string' && ref.startsWith('#/');
exports.isLocalRef = isLocalRef;
function unsupportedKeys(schema) {
    const keys = Object.keys(schema).filter((k) => !SUPPORTED.has(k) && !ANNOTATIONS.has(k) && !k.startsWith('x-'));
    if ('$ref' in schema && !(0, exports.isLocalRef)(schema.$ref))
        keys.push('$ref');
    if (Array.isArray(schema.items))
        keys.push('items');
    return keys.sort();
}
const unsupported = (at, keys) => (0, model_1.issue)(at, 'profile.unsupported', `Fuera del perfil soportado (${keys.join(', ')}): se acepta, pero cualquier cambio aquí cuenta como «rompe»`, 'info');
function checkShape(schema, at, resolve, out, depth = 1) {
    if (!(0, model_1.isObject)(schema)) {
        out.push((0, model_1.issue)(at, 'shape.invalid', 'La forma debe ser un objeto JSON Schema'));
        return;
    }
    if (depth > exports.MAX_SHAPE_DEPTH) {
        out.push((0, model_1.issue)(at, 'shape.too-deep', `La forma no puede anidarse más de ${exports.MAX_SHAPE_DEPTH} niveles`));
        return;
    }
    const off = unsupportedKeys(schema);
    if (off.length) {
        out.push(unsupported(at, off));
        return;
    }
    if ('$ref' in schema) {
        if (!resolve(schema.$ref))
            out.push((0, model_1.issue)(at, 'ref.unresolved', `La referencia ${schema.$ref} no existe en el documento`));
        return;
    }
    if ('type' in schema) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!types.length || types.some((t) => !TYPES.has(t)))
            out.push((0, model_1.issue)(`${at}/type`, 'shape.invalid', 'type debe ser string, number, integer, boolean, object, array o null, o una lista de ellos'));
    }
    if ('properties' in schema) {
        if (!(0, model_1.isObject)(schema.properties))
            out.push((0, model_1.issue)(`${at}/properties`, 'shape.invalid', 'properties debe ser un objeto'));
        else
            for (const k of Object.keys(schema.properties))
                checkShape(schema.properties[k], `${at}/properties/${(0, model_1.esc)(k)}`, resolve, out, depth + 1);
    }
    if ('required' in schema && !(Array.isArray(schema.required) && schema.required.every((r) => typeof r === 'string'))) {
        out.push((0, model_1.issue)(`${at}/required`, 'shape.invalid', 'required debe ser una lista de nombres de campo'));
    }
    if ('items' in schema)
        checkShape(schema.items, `${at}/items`, resolve, out, depth + 1);
    if ((0, model_1.isObject)(schema.additionalProperties))
        checkShape(schema.additionalProperties, `${at}/additionalProperties`, resolve, out, depth + 1);
    else if ('additionalProperties' in schema && typeof schema.additionalProperties !== 'boolean') {
        out.push((0, model_1.issue)(`${at}/additionalProperties`, 'shape.invalid', 'additionalProperties debe ser true, false o una forma'));
    }
    if ('enum' in schema && !(Array.isArray(schema.enum) && schema.enum.length))
        out.push((0, model_1.issue)(`${at}/enum`, 'shape.invalid', 'enum debe ser una lista con al menos un valor'));
    if ('pattern' in schema && !validPattern(schema.pattern))
        out.push((0, model_1.issue)(`${at}/pattern`, 'shape.invalid', 'pattern no es una expresión regular válida'));
    for (const k of NUMBERS)
        if (k in schema && typeof schema[k] !== 'number')
            out.push((0, model_1.issue)(`${at}/${k}`, 'shape.invalid', `${k} debe ser un número`));
    for (const k of LENGTHS)
        if (k in schema && !(Number.isInteger(schema[k]) && schema[k] >= 0))
            out.push((0, model_1.issue)(`${at}/${k}`, 'shape.invalid', `${k} debe ser un entero no negativo`));
}
function validPattern(p) {
    if (typeof p !== 'string')
        return false;
    try {
        new RegExp(p, 'u');
        return true;
    }
    catch {
        return false;
    }
}
const typeOf = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
const FORMATS = {
    uri: (s) => /^[a-z][a-z0-9+.-]*:\S+$/i.test(s),
    'date-time': (s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !isNaN(Date.parse(s)),
    date: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)),
    email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    uuid: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
};
function checkValue(schema, value, at, resolve, out, hops = 0) {
    if (!(0, model_1.isObject)(schema) || hops > 32)
        return;
    if ('$ref' in schema) {
        const target = (0, exports.isLocalRef)(schema.$ref) ? resolve(schema.$ref) : undefined;
        if (target)
            checkValue(target.schema, value, at, resolve, out, hops + 1);
        return;
    }
    if (unsupportedKeys(schema).length)
        return;
    const actual = typeOf(value);
    if ('type' in schema) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const fits = types.includes(actual) || (actual === 'integer' && types.includes('number'));
        if (!fits) {
            out.push({ path: at, message: `Se esperaba ${types.join(' o ')} y el ejemplo trae ${actual}` });
            return;
        }
    }
    if (Array.isArray(schema.enum) && !schema.enum.some((e) => (0, model_1.sameJson)(e, value))) {
        out.push({ path: at, message: 'El valor no está entre los permitidos (enum)' });
        return;
    }
    if (typeof value === 'string')
        checkString(schema, value, at, out);
    if (typeof value === 'number')
        checkNumber(schema, value, at, out);
    if (Array.isArray(value)) {
        if (typeof schema.minItems === 'number' && value.length < schema.minItems)
            out.push({ path: at, message: `Debe tener al menos ${schema.minItems} elementos` });
        if (typeof schema.maxItems === 'number' && value.length > schema.maxItems)
            out.push({ path: at, message: `Debe tener como máximo ${schema.maxItems} elementos` });
        if ((0, model_1.isObject)(schema.items))
            value.forEach((v, i) => checkValue(schema.items, v, `${at}/${i}`, resolve, out));
    }
    if ((0, model_1.isObject)(value))
        checkObject(schema, value, at, resolve, out);
}
function checkString(schema, value, at, out) {
    const len = [...value].length;
    if (typeof schema.minLength === 'number' && len < schema.minLength)
        out.push({ path: at, message: `Debe tener al menos ${schema.minLength} caracteres` });
    if (typeof schema.maxLength === 'number' && len > schema.maxLength)
        out.push({ path: at, message: `Debe tener como máximo ${schema.maxLength} caracteres` });
    if (typeof schema.pattern === 'string' && validPattern(schema.pattern) && !new RegExp(schema.pattern, 'u').test(value))
        out.push({ path: at, message: `No cumple el patrón ${schema.pattern}` });
    const fmt = typeof schema.format === 'string' ? FORMATS[schema.format] : undefined;
    if (fmt && !fmt(value))
        out.push({ path: at, message: `No tiene el formato ${schema.format}` });
}
function checkNumber(schema, value, at, out) {
    if (typeof schema.minimum === 'number' && value < schema.minimum)
        out.push({ path: at, message: `Debe ser mayor o igual que ${schema.minimum}` });
    if (typeof schema.maximum === 'number' && value > schema.maximum)
        out.push({ path: at, message: `Debe ser menor o igual que ${schema.maximum}` });
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum)
        out.push({ path: at, message: `Debe ser mayor que ${schema.exclusiveMinimum}` });
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum)
        out.push({ path: at, message: `Debe ser menor que ${schema.exclusiveMaximum}` });
}
function checkObject(schema, value, at, resolve, out) {
    const props = (0, model_1.isObject)(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? [...schema.required].sort() : [];
    for (const k of required)
        if (!(k in value))
            out.push({ path: at, message: `Falta el campo obligatorio «${k}»` });
    for (const k of Object.keys(value).sort()) {
        const at2 = `${at}/${(0, model_1.esc)(k)}`;
        if (k in props)
            checkValue(props[k], value[k], at2, resolve, out);
        else if (schema.additionalProperties === false)
            out.push({ path: at2, message: `El campo «${k}» no está en la forma` });
        else if ((0, model_1.isObject)(schema.additionalProperties))
            checkValue(schema.additionalProperties, value[k], at2, resolve, out);
    }
}
//# sourceMappingURL=shapes.js.map
  },
  "types/index": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractType = exports.CONTRACT_TYPES = void 0;
const config_1 = __mod("types/config");
const event_1 = __mod("types/event");
const http_api_1 = __mod("types/http-api");
const published_file_1 = __mod("types/published-file");
const routes_1 = __mod("types/routes");
const TYPES = [http_api_1.httpApi, routes_1.routes, published_file_1.publishedFile, event_1.event, config_1.config];
exports.CONTRACT_TYPES = new Map(TYPES.map((t) => [t.id, t]));
const contractType = (id) => (typeof id === 'string' ? exports.CONTRACT_TYPES.get(id) : undefined);
exports.contractType = contractType;
//# sourceMappingURL=index.js.map
  },
  "types/config": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const config_1 = __mod("config");
exports.config = {
    id: 'config',
    rules: config_1.CONFIG_RULES,
    ownFormat: true,
    validatePart: config_1.validateConfig,
    count: config_1.countConfig,
    diff: config_1.diffConfig,
};
//# sourceMappingURL=config.js.map
  },
  "config": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fitsType = exports.KEY_TYPES = exports.CONFIG_FORMATS = exports.CONFIG_RULES = void 0;
exports.countConfig = countConfig;
exports.validateConfig = validateConfig;
exports.diffConfig = diffConfig;
const model_1 = __mod("model");
const own_1 = __mod("own");
const schema_diff_1 = __mod("schema-diff");
const R = 'ROMPE';
const C = 'COMPATIBLE';
exports.CONFIG_RULES = {
    'key.removed': R,
    'key.type-changed': R,
    'key.values-narrowed': R,
    'key.secret-changed': R,
    'key.required-to-optional': R,
    'key.source-changed': R,
    'source.removed': R,
    'source.changed': R,
    'key.added': C,
    'key.values-widened': C,
    'key.default-changed': C,
    'key.optional-to-required': C,
    'source.added': C,
    ...own_1.OWN_COMMON_RULES,
};
exports.CONFIG_FORMATS = ['json', 'env', 'yaml'];
exports.KEY_TYPES = ['string', 'integer', 'number', 'boolean'];
const MAX_SOURCES = 20;
const MAX_KEYS = 200;
const KEY = /^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/;
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ROOT = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
const PART_KEYS = new Set(['id', 'type', 'description', 'sources', 'keys']);
const SOURCE_KEYS = new Set(['path', 'format', 'root']);
const SECRET_KEYS = new Set(['key', 'source', 'type', 'required', 'secret', 'description']);
const KEY_KEYS = new Set([...SECRET_KEYS, 'default', 'values']);
const EXAMPLE_KEYS = new Set(['id', 'part', 'description', 'values']);
const keysOf = (part) => (Array.isArray(part.keys) ? part.keys.filter(model_1.isObject) : []);
const fitsType = (type, v) => type === 'string' ? typeof v === 'string' : type === 'boolean' ? typeof v === 'boolean' : type === 'integer' ? Number.isInteger(v) : type === 'number' ? typeof v === 'number' && isFinite(v) : false;
exports.fitsType = fitsType;
const sourceOf = (part, k) => {
    const sources = Array.isArray(part.sources) ? part.sources.filter(model_1.isObject) : [];
    return typeof k.source === 'string' ? sources.find((s) => s.path === k.source) : sources.length === 1 ? sources[0] : undefined;
};
function countConfig(part, doc) {
    return { operations: 0, examples: (0, own_1.partExamples)(doc, part.id).length };
}
function validateConfig(part, at, doc) {
    const out = [];
    for (const k of Object.keys(part))
        if (!PART_KEYS.has(k) && !k.startsWith('x-'))
            out.push((0, model_1.issue)(`${at}/${(0, model_1.esc)(k)}`, 'part.key-unknown', `«${k}» no es una clave de una parte config`));
    if (part.description !== undefined && !(0, own_1.text)(part.description, 500))
        out.push((0, model_1.issue)(`${at}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
    if (!Array.isArray(part.sources) || !part.sources.length || part.sources.length > MAX_SOURCES)
        out.push((0, model_1.issue)(`${at}/sources`, 'config.sources-invalid', `sources tiene de 1 a ${MAX_SOURCES} archivos de configuración`));
    else {
        const paths = new Set();
        part.sources.forEach((s, i) => {
            const sAt = `${at}/sources/${i}`;
            if (!(0, model_1.isObject)(s))
                return out.push((0, model_1.issue)(sAt, 'config.sources-invalid', 'Cada fuente es un objeto con path y format'));
            for (const k of Object.keys(s))
                if (!SOURCE_KEYS.has(k) && !k.startsWith('x-'))
                    out.push((0, model_1.issue)(`${sAt}/${(0, model_1.esc)(k)}`, 'source.key-unknown', `«${k}» no es una clave de una fuente`));
            if (!(0, own_1.repoPath)(s.path))
                out.push((0, model_1.issue)(`${sAt}/path`, 'source.path-invalid', 'path es la ruta del archivo dentro del repositorio, sin / inicial ni ..'));
            else if (paths.has(s.path))
                out.push((0, model_1.issue)(`${sAt}/path`, 'source.path-duplicate', `La fuente ${s.path} está repetida`));
            else
                paths.add(s.path);
            if (!exports.CONFIG_FORMATS.includes(s.format))
                out.push((0, model_1.issue)(`${sAt}/format`, 'source.format-invalid', `format debe ser ${exports.CONFIG_FORMATS.join(', ')}`));
            if (s.root !== undefined && (s.format === 'env' || typeof s.root !== 'string' || !ROOT.test(s.root)))
                out.push((0, model_1.issue)(`${sAt}/root`, 'source.root-invalid', 'root es la sección donde viven las claves (Envios o app.envios), solo en json o yaml'));
        });
    }
    if (!Array.isArray(part.keys) || !part.keys.length || part.keys.length > MAX_KEYS) {
        out.push((0, model_1.issue)(`${at}/keys`, 'config.keys-invalid', `keys tiene de 1 a ${MAX_KEYS} claves`));
        return out;
    }
    const many = Array.isArray(part.sources) && part.sources.length > 1;
    const seen = new Set();
    part.keys.forEach((k, i) => {
        const kAt = `${at}/keys/${i}`;
        if (!(0, model_1.isObject)(k))
            return out.push((0, model_1.issue)(kAt, 'config.keys-invalid', 'Cada clave es un objeto'));
        const name = typeof k.key === 'string' && KEY.test(k.key) ? k.key : undefined;
        if (!name)
            out.push((0, model_1.issue)(`${kAt}/key`, 'key.name-invalid', 'key tiene hasta 128 letras, números, puntos, dos puntos, guiones o guiones bajos, y empieza con letra o _'));
        else if (seen.has(name))
            out.push((0, model_1.issue)(`${kAt}/key`, 'key.duplicate', `La clave ${name} está repetida`));
        else
            seen.add(name);
        const source = sourceOf(part, k);
        if (k.source !== undefined && !source)
            out.push((0, model_1.issue)(`${kAt}/source`, 'key.source-unknown', 'source es el path de una de las fuentes'));
        else if (k.source === undefined && many)
            out.push((0, model_1.issue)(kAt, 'key.source-missing', 'Con más de una fuente, cada clave dice en cuál vive (source)'));
        if (name && source?.format === 'env' && !ENV_KEY.test(name))
            out.push((0, model_1.issue)(`${kAt}/key`, 'key.name-invalid', 'Una clave de un archivo env tiene solo letras, números y guiones bajos'));
        if (!exports.KEY_TYPES.includes(k.type))
            out.push((0, model_1.issue)(`${kAt}/type`, 'key.type-invalid', `type debe ser ${exports.KEY_TYPES.join(', ')}`));
        for (const f of ['required', 'secret'])
            if (typeof k[f] !== 'boolean')
                out.push((0, model_1.issue)(`${kAt}/${f}`, 'key.flag-invalid', `${f} es true o false`));
        if (k.description !== undefined && !(0, own_1.text)(k.description, 500))
            out.push((0, model_1.issue)(`${kAt}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
        if (k.secret === true) {
            for (const f of Object.keys(k)) {
                if (SECRET_KEYS.has(f))
                    continue;
                out.push((0, model_1.issue)(`${kAt}/${(0, model_1.esc)(f)}`, 'key.secret-value', f === 'default' || f === 'values' ? `Una clave secreta no lleva ${f === 'default' ? 'valor por defecto' : 'valores'} en el contrato` : `Una clave secreta solo lleva key, source, type, required, secret y description`));
            }
            return;
        }
        for (const f of Object.keys(k))
            if (!KEY_KEYS.has(f) && !f.startsWith('x-'))
                out.push((0, model_1.issue)(`${kAt}/${(0, model_1.esc)(f)}`, 'key.key-unknown', `«${f}» no es una clave de config`));
        if (k.values !== undefined && !(Array.isArray(k.values) && k.values.length > 0 && k.values.length <= 100 && k.values.every((v) => (0, exports.fitsType)(k.type, v)) && new Set(k.values.map((v) => JSON.stringify(v))).size === k.values.length)) {
            out.push((0, model_1.issue)(`${kAt}/values`, 'key.values-invalid', 'values es una lista sin repetidos de valores del tipo de la clave'));
        }
        if (k.default !== undefined) {
            if (!(0, exports.fitsType)(k.type, k.default))
                out.push((0, model_1.issue)(`${kAt}/default`, 'key.default-invalid', 'El valor por defecto no es del tipo de la clave'));
            else if (Array.isArray(k.values) && !k.values.some((v) => (0, model_1.sameJson)(v, k.default)))
                out.push((0, model_1.issue)(`${kAt}/default`, 'key.default-invalid', 'El valor por defecto no está entre los valores permitidos'));
        }
    });
    const keys = new Map(keysOf(part).filter((k) => typeof k.key === 'string').map((k) => [k.key, k]));
    const examples = (0, own_1.partExamples)(doc, part.id);
    if (!examples.length)
        out.push((0, model_1.issue)(at, 'example.missing', `La parte ${part.id} necesita al menos un ejemplo con los valores de sus claves`));
    for (const { ex, at: eAt } of examples) {
        for (const f of Object.keys(ex))
            if (!EXAMPLE_KEYS.has(f) && !f.startsWith('x-'))
                out.push((0, model_1.issue)(`${eAt}/${(0, model_1.esc)(f)}`, 'example.key-unknown', `«${f}» no es una clave de un ejemplo de config`));
        if (!(0, model_1.isObject)(ex.values)) {
            out.push((0, model_1.issue)(`${eAt}/values`, 'example.invalid', 'values es un objeto con el valor de cada clave'));
            continue;
        }
        for (const name of Object.keys(ex.values).sort()) {
            const vAt = `${eAt}/values/${(0, model_1.esc)(name)}`;
            const k = keys.get(name);
            if (!k)
                out.push((0, model_1.issue)(vAt, 'example.key-unknown', `La clave ${name} no está en keys`));
            else if (k.secret === true)
                out.push((0, model_1.issue)(vAt, 'example.secret-value', `Un ejemplo no trae el valor de la clave secreta ${name}`));
            else if (!(0, exports.fitsType)(k.type, ex.values[name]))
                out.push((0, model_1.issue)(vAt, 'example.invalid', `Se esperaba un valor ${k.type}`));
            else if (Array.isArray(k.values) && !k.values.some((v) => (0, model_1.sameJson)(v, ex.values[name])))
                out.push((0, model_1.issue)(vAt, 'example.invalid', 'El valor no está entre los permitidos (values)'));
        }
        const missing = [...keys.values()].filter((k) => k.required === true && k.secret !== true && k.default === undefined && !(k.key in ex.values)).map((k) => k.key);
        if (missing.length)
            out.push((0, model_1.issue)(`${eAt}/values`, 'example.incomplete', `El ejemplo no trae ${missing.join(', ')}`));
    }
    return out;
}
function diffConfig(before, after, ctx) {
    const out = [];
    const add = (rule, path, extra = {}) => {
        const { compat, ...values } = extra;
        out.push({ rule, part: after.id, path, ...values, compat: compat ?? exports.CONFIG_RULES[rule] });
    };
    if (before.description !== after.description)
        add('text.changed', '/description', { before: before.description, after: after.description });
    const bs = new Map((Array.isArray(before.sources) ? before.sources.filter(model_1.isObject) : []).map((s, i) => [s.path, { s, i }]));
    const as = (Array.isArray(after.sources) ? after.sources.filter(model_1.isObject) : []).map((s, i) => ({ s, i }));
    const aPaths = new Set(as.map((x) => x.s.path));
    for (const [path, x] of bs)
        if (!aPaths.has(path))
            add('source.removed', (0, own_1.ptr)('sources', x.i), { before: path });
    for (const x of as) {
        const old = bs.get(x.s.path);
        if (!old)
            add('source.added', (0, own_1.ptr)('sources', x.i), { after: x.s.path });
        else if (old.s.format !== x.s.format || old.s.root !== x.s.root)
            add('source.changed', (0, own_1.ptr)('sources', x.i), { before: { format: old.s.format, root: old.s.root }, after: { format: x.s.format, root: x.s.root } });
    }
    const bk = new Map(keysOf(before).map((k, i) => [k.key, { k, i }]));
    const ak = keysOf(after).map((k, i) => ({ k, i }));
    const aNames = new Set(ak.map((x) => x.k.key));
    for (const [name, x] of bk)
        if (!aNames.has(name))
            add('key.removed', (0, own_1.ptr)('keys', x.i), { before: name });
    for (const { k: a, i } of ak) {
        const at = (0, own_1.ptr)('keys', i);
        const old = bk.get(a.key);
        if (!old) {
            add('key.added', at, { after: a.key });
            continue;
        }
        const b = old.k;
        if (b.type !== a.type)
            add('key.type-changed', `${at}/type`, { before: b.type, after: a.type });
        if (b.secret !== a.secret)
            add('key.secret-changed', `${at}/secret`, { before: b.secret, after: a.secret });
        if (b.required === true && a.required !== true)
            add('key.required-to-optional', `${at}/required`);
        if (b.required !== true && a.required === true)
            add('key.optional-to-required', `${at}/required`);
        if (sourceOf(before, b)?.path !== sourceOf(after, a)?.path)
            add('key.source-changed', `${at}/source`, { before: sourceOf(before, b)?.path, after: sourceOf(after, a)?.path });
        if (b.description !== a.description)
            add('text.changed', `${at}/description`, { before: b.description, after: a.description });
        if (a.secret === true || b.secret === true)
            continue;
        if (!(0, model_1.sameJson)(b.default, a.default))
            add('key.default-changed', `${at}/default`, { before: b.default, after: a.default });
        const bv = Array.isArray(b.values) ? b.values : undefined;
        const av = Array.isArray(a.values) ? a.values : undefined;
        if (!bv && av)
            add('key.values-narrowed', `${at}/values`, { after: av });
        else if (bv && !av)
            add('key.values-widened', `${at}/values`, { before: bv });
        else if (bv && av) {
            const removed = bv.filter((v) => !av.some((w) => (0, model_1.sameJson)(v, w)));
            const added = av.filter((v) => !bv.some((w) => (0, model_1.sameJson)(v, w)));
            if (removed.length)
                add('key.values-narrowed', `${at}/values`, { before: removed });
            if (added.length)
                add('key.values-widened', `${at}/values`, { after: added });
        }
    }
    (0, own_1.exampleChanges)(before, after, ctx, add);
    return (0, schema_diff_1.strictestPerPath)(out);
}
//# sourceMappingURL=config.js.map
  },
  "schema-diff": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentExists = exports.SchemaDiff = void 0;
exports.follow = follow;
exports.expand = expand;
exports.textMap = textMap;
exports.strictestPerPath = strictestPerPath;
exports.textChanges = textChanges;
const model_1 = __mod("model");
const shapes_1 = __mod("shapes");
const C = 'COMPATIBLE';
const MINS = ['minimum', 'exclusiveMinimum', 'minLength', 'minItems'];
const MAXS = ['maximum', 'exclusiveMaximum', 'maxLength', 'maxItems'];
const TEXT_KEYS = new Set(['summary', 'description', 'title']);
const NOT_TEXT = new Set(['examples', 'example', 'x-qubipods-assert', 'enum', 'default', 'const']);
class SchemaDiff {
    rb;
    ra;
    add;
    seen = new Set();
    constructor(rb, ra, add) {
        this.rb = rb;
        this.ra = ra;
        this.add = add;
    }
    schema(bRaw, aRaw, ctx, bAtIn, aAtIn) {
        if (bRaw === undefined && aRaw === undefined)
            return;
        const b = follow(bRaw, bAtIn, this.rb);
        const a = follow(aRaw, aAtIn, this.ra);
        const memo = `${ctx}|${b.at}|${a.at}`;
        if (this.seen.has(memo))
            return;
        this.seen.add(memo);
        const bs = b.schema;
        const as = a.schema;
        if (!(0, model_1.isObject)(bs) || !(0, model_1.isObject)(as)) {
            if (!(0, model_1.sameJson)(bs, as))
                this.add('type.changed', a.at, { before: bs, after: as });
            return;
        }
        if ((0, shapes_1.unsupportedKeys)(bs).length || (0, shapes_1.unsupportedKeys)(as).length) {
            if (!(0, model_1.sameJson)(expand(bs, this.rb), expand(as, this.ra)))
                this.add('unsupported.changed', a.at);
            return;
        }
        const bt = types(bs);
        const at = types(as);
        if (bt.base && at.base && !(0, model_1.sameJson)(bt.base, at.base)) {
            this.add('type.changed', `${a.at}/type`, { before: bs.type, after: as.type });
            return;
        }
        if (!bt.base && at.base)
            this.constraint(ctx, 'tightened', `${a.at}/type`, undefined, as.type);
        if (bt.base && !at.base)
            this.constraint(ctx, 'loosened', `${a.at}/type`, bs.type, undefined);
        if (!bt.nullable && at.nullable) {
            if (ctx === 'response')
                this.add('response.field.nullable-added', a.at, { before: bs.type, after: as.type });
            else
                this.constraint(ctx, 'loosened', `${a.at}/type`, bs.type, as.type);
        }
        if (bt.nullable && !at.nullable)
            this.constraint(ctx, 'tightened', `${a.at}/type`, bs.type, as.type);
        this.enumeration(bs, as, ctx, a.at);
        this.bounds(bs, as, ctx, b.at, a.at);
        this.fields(bs, as, ctx, b.at, a.at);
        if (bs.items !== undefined && as.items !== undefined)
            this.schema(bs.items, as.items, ctx, `${b.at}/items`, `${a.at}/items`);
        else if (bs.items === undefined && as.items !== undefined)
            this.constraint(ctx, 'tightened', `${a.at}/items`, undefined, as.items);
        else if (bs.items !== undefined && as.items === undefined)
            this.constraint(ctx, 'loosened', `${a.at}/items`, bs.items, undefined);
    }
    constraint(ctx, how, path, before, after) {
        this.add(`${ctx}.constraint.${how}`, path, { before, after });
    }
    enumeration(bs, as, ctx, at) {
        const be = Array.isArray(bs.enum) ? bs.enum : undefined;
        const ae = Array.isArray(as.enum) ? as.enum : undefined;
        if (!be && ae)
            return this.constraint(ctx, 'tightened', `${at}/enum`, undefined, ae);
        if (be && !ae)
            return this.constraint(ctx, 'loosened', `${at}/enum`, be, undefined);
        if (!be || !ae)
            return;
        const removed = be.filter((v) => !ae.some((w) => (0, model_1.sameJson)(v, w)));
        const added = ae.filter((v) => !be.some((w) => (0, model_1.sameJson)(v, w)));
        if (removed.length)
            this.add(`${ctx}.enum.value-removed`, `${at}/enum`, { before: removed });
        if (added.length) {
            const open = ctx === 'response' && as['x-extensible'] === true;
            this.add(`${ctx}.enum.value-added`, `${at}/enum`, { after: added, ...(open ? { compat: C } : {}) });
        }
    }
    bounds(bs, as, ctx, bAt, at) {
        const cmp = (k, tighter) => {
            const bv = bs[k];
            const av = as[k];
            if (bv === av)
                return;
            if (bv === undefined)
                this.constraint(ctx, 'tightened', `${at}/${k}`, bv, av);
            else if (av === undefined)
                this.constraint(ctx, 'loosened', `${at}/${k}`, bv, av);
            else
                this.constraint(ctx, tighter(bv, av) ? 'tightened' : 'loosened', `${at}/${k}`, bv, av);
        };
        for (const k of MINS)
            cmp(k, (b, a) => a > b);
        for (const k of MAXS)
            cmp(k, (b, a) => a < b);
        for (const k of ['pattern', 'format']) {
            if (bs[k] === as[k])
                continue;
            this.constraint(ctx, as[k] === undefined ? 'loosened' : 'tightened', `${at}/${k}`, bs[k], as[k]);
        }
        const bap = bs.additionalProperties;
        const aap = as.additionalProperties;
        if (bap !== false && aap === false)
            this.constraint(ctx, 'tightened', `${at}/additionalProperties`, bap, aap);
        else if (bap === false && aap !== false)
            this.constraint(ctx, 'loosened', `${at}/additionalProperties`, bap, aap);
        else if ((0, model_1.isObject)(bap) && (0, model_1.isObject)(aap))
            this.schema(bap, aap, ctx, `${bAt}/additionalProperties`, `${at}/additionalProperties`);
    }
    fields(bs, as, ctx, bAt, aAt) {
        const bp = (0, model_1.isObject)(bs.properties) ? bs.properties : {};
        const ap = (0, model_1.isObject)(as.properties) ? as.properties : {};
        const breq = new Set(Array.isArray(bs.required) ? bs.required : []);
        const areq = new Set(Array.isArray(as.required) ? as.required : []);
        for (const k of Object.keys(bp).sort()) {
            if (!(k in ap))
                this.add(`${ctx}.field.removed`, `${aAt}/properties/${(0, model_1.esc)(k)}`, { before: k });
        }
        for (const k of Object.keys(ap).sort()) {
            const at = `${aAt}/properties/${(0, model_1.esc)(k)}`;
            if (!(k in bp)) {
                if (ctx === 'response')
                    this.add('response.field.added', at, { after: k });
                else
                    this.add(areq.has(k) ? 'request.field.added-required' : 'request.field.added', at, { after: k });
                continue;
            }
            if (breq.has(k) && !areq.has(k))
                this.add(`${ctx}.field.required-to-optional`, at);
            if (!breq.has(k) && areq.has(k))
                this.add(`${ctx}.field.optional-to-required`, at);
            this.schema(bp[k], ap[k], ctx, `${bAt}/properties/${(0, model_1.esc)(k)}`, at);
        }
    }
}
exports.SchemaDiff = SchemaDiff;
function follow(schema, at, resolve) {
    let cur = schema;
    let ptr = at;
    for (let i = 0; i < 32 && (0, model_1.isObject)(cur) && (0, shapes_1.isLocalRef)(cur.$ref); i++) {
        const t = resolve(cur.$ref);
        if (!t)
            break;
        cur = t.schema;
        ptr = t.path;
    }
    return { schema: cur, at: ptr };
}
function expand(schema, resolve, depth = 0) {
    if (depth > 16)
        return schema;
    if (Array.isArray(schema))
        return schema.map((s) => expand(s, resolve, depth + 1));
    if (!(0, model_1.isObject)(schema))
        return schema;
    if ((0, shapes_1.isLocalRef)(schema.$ref)) {
        const t = resolve(schema.$ref);
        if (t)
            return expand(t.schema, resolve, depth + 1);
    }
    return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, expand(v, resolve, depth + 1)]));
}
function types(s) {
    if (s.type === undefined)
        return { nullable: false };
    const list = Array.isArray(s.type) ? s.type : [s.type];
    return { base: list.filter((t) => t !== 'null').sort(), nullable: list.includes('null') };
}
function textMap(root) {
    const out = new Map();
    const walk = (node, at) => {
        if (Array.isArray(node))
            node.forEach((v, i) => walk(v, `${at}/${i}`));
        else if ((0, model_1.isObject)(node)) {
            for (const k of Object.keys(node)) {
                if (NOT_TEXT.has(k))
                    continue;
                const path = `${at}/${(0, model_1.esc)(k)}`;
                if (TEXT_KEYS.has(k) && typeof node[k] === 'string')
                    out.set(path, node[k]);
                else
                    walk(node[k], path);
            }
        }
    };
    walk(root, '');
    return out;
}
const parentExists = (root, path) => (0, model_1.isObject)((0, model_1.pointer)(root, path.slice(0, path.lastIndexOf('/'))));
exports.parentExists = parentExists;
function strictestPerPath(changes) {
    const top = new Map();
    for (const c of changes)
        top.set(c.path, Math.max(top.get(c.path) ?? 0, model_1.COMPAT_RANK[c.compat]));
    const kept = changes.filter((c) => model_1.COMPAT_RANK[c.compat] === top.get(c.path));
    const unique = new Map();
    for (const c of kept) {
        const k = `${c.path}\u0000${c.rule}`;
        if (!unique.has(k))
            unique.set(k, c);
    }
    return [...unique.values()].sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : x.rule < y.rule ? -1 : x.rule > y.rule ? 1 : 0));
}
function textChanges(before, after, add, prefix = '') {
    const bt = textMap(before);
    const at = textMap(after);
    for (const [path, a] of at) {
        const b = bt.get(path);
        if (b !== a && (b !== undefined || (0, exports.parentExists)(before, path)))
            add('text.changed', prefix + path, { before: b, after: a });
    }
    for (const [path, b] of bt)
        if (!at.has(path) && (0, exports.parentExists)(after, path))
            add('text.changed', prefix + path, { before: b });
}
//# sourceMappingURL=schema-diff.js.map
  },
  "types/event": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.event = void 0;
const event_1 = __mod("event");
exports.event = {
    id: 'event',
    rules: event_1.EVENT_RULES,
    ownFormat: false,
    validatePart: event_1.validateEvent,
    count: event_1.countEvent,
    diff: event_1.diffEvent,
};
//# sourceMappingURL=event.js.map
  },
  "event": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_EVENT_OPERATIONS = exports.JSON_CONTENT = exports.EVENT_RULES = void 0;
exports.asyncApiResolver = asyncApiResolver;
exports.eventOperations = eventOperations;
exports.countEvent = countEvent;
exports.validateEvent = validateEvent;
exports.diffEvent = diffEvent;
const model_1 = __mod("model");
const openapi_diff_1 = __mod("openapi-diff");
const schema_diff_1 = __mod("schema-diff");
const shapes_1 = __mod("shapes");
const R = 'ROMPE';
const C = 'COMPATIBLE';
const SHARED = Object.keys(openapi_diff_1.HTTP_API_RULES).filter((r) => /^(request\.(field|enum|constraint)|response\.(field|enum|constraint))\./.test(r));
exports.EVENT_RULES = {
    'event.removed': R,
    'event.added': C,
    'event.action-changed': R,
    'channel.address-changed': R,
    'message.removed': R,
    'message.added': R,
    'type.changed': R,
    'unsupported.changed': R,
    ...Object.fromEntries(SHARED.map((r) => [r, openapi_diff_1.HTTP_API_RULES[r]])),
    'example.added': C,
    'example.removed': C,
    'example.changed': C,
    'text.changed': 'PARCHE',
};
exports.JSON_CONTENT = 'application/json';
exports.MAX_EVENT_OPERATIONS = 100;
const OP_ID = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const ANNOTATIONS = ['title', 'summary', 'description', 'tags', 'externalDocs'];
const ROOT_KEYS = new Set(['asyncapi', 'id', 'info', 'defaultContentType', 'channels', 'operations', 'components']);
const CHANNEL_KEYS = new Set(['address', 'messages', ...ANNOTATIONS]);
const OPERATION_KEYS = new Set(['action', 'channel', 'messages', ...ANNOTATIONS]);
const MESSAGE_KEYS = new Set(['name', 'contentType', 'payload', 'headers', 'examples', ...ANNOTATIONS]);
const COMPONENT_KEYS = new Set(['messages', 'schemas']);
const PART_KEYS = new Set(['id', 'type', 'description', 'asyncapi']);
const unsupported = (at, what) => (0, model_1.issue)(at, 'profile.unsupported', `${what} está fuera del perfil soportado: se acepta, pero cualquier cambio aquí cuenta como «rompe»`, 'info');
const offKeys = (obj, allowed) => Object.keys(obj).filter((k) => !allowed.has(k) && !k.startsWith('x-')).sort();
const offPart = (obj, allowed) => ((0, model_1.isObject)(obj) ? Object.fromEntries(offKeys(obj, allowed).map((k) => [k, obj[k]])) : {});
function asyncApiResolver(aa, base) {
    return (ref) => {
        if (!(0, shapes_1.isLocalRef)(ref))
            return undefined;
        const schema = (0, model_1.pointer)(aa, ref.slice(1));
        return schema === undefined ? undefined : { schema, path: base + ref.slice(1) };
    };
}
function deref(obj, at, resolve) {
    if ((0, model_1.isObject)(obj) && '$ref' in obj) {
        const t = resolve(obj.$ref);
        return t && (0, model_1.isObject)(t.schema) ? { value: t.schema, at: t.path } : undefined;
    }
    return (0, model_1.isObject)(obj) ? { value: obj, at } : undefined;
}
function eventOperations(aa, base, resolve) {
    const out = [];
    const ops = (0, model_1.isObject)(aa.operations) ? aa.operations : {};
    for (const id of Object.keys(ops)) {
        const op = ops[id];
        if (!(0, model_1.isObject)(op))
            continue;
        const at = `${base}/operations/${(0, model_1.esc)(id)}`;
        const ref = (0, model_1.isObject)(op.channel) && typeof op.channel.$ref === 'string' ? op.channel.$ref : '';
        const m = /^#\/channels\/([^/]+)$/.exec(ref);
        const name = m ? m[1].replace(/~1/g, '/').replace(/~0/g, '~') : '';
        const ch = m && (0, model_1.isObject)(aa.channels) && (0, model_1.isObject)(aa.channels[name]) ? aa.channels[name] : undefined;
        const channel = ch ? { name, value: ch, at: `${base}/channels/${(0, model_1.esc)(name)}` } : undefined;
        const chMessages = channel && (0, model_1.isObject)(channel.value.messages) ? channel.value.messages : {};
        const keys = [];
        const bad = [];
        if (Array.isArray(op.messages)) {
            op.messages.forEach((r, i) => {
                const mm = (0, model_1.isObject)(r) && typeof r.$ref === 'string' ? /^#\/channels\/([^/]+)\/messages\/([^/]+)$/.exec(r.$ref) : null;
                const key = mm ? mm[2].replace(/~1/g, '/').replace(/~0/g, '~') : '';
                if (!mm || !channel || mm[1].replace(/~1/g, '/').replace(/~0/g, '~') !== name || !(key in chMessages))
                    bad.push(i);
                else if (!keys.includes(key))
                    keys.push(key);
            });
        }
        else
            keys.push(...Object.keys(chMessages));
        const messages = [];
        for (const key of keys) {
            const d = deref(chMessages[key], `${channel.at}/messages/${(0, model_1.esc)(key)}`, resolve);
            if (d)
                messages.push({ key, value: d.value, at: d.at });
        }
        out.push({ id, action: op.action, at, channel, messages, bad });
    }
    return out;
}
function usedMessages(ops) {
    const seen = new Map();
    for (const o of ops)
        for (const m of o.messages)
            if (!seen.has(m.at))
                seen.set(m.at, m);
    return [...seen.values()];
}
function countEvent(part) {
    const aa = part.asyncapi;
    if (!(0, model_1.isObject)(aa))
        return { operations: 0, examples: 0 };
    const ops = eventOperations(aa, '', asyncApiResolver(aa, ''));
    return { operations: ops.length, examples: usedMessages(ops).reduce((n, m) => n + (Array.isArray(m.value.examples) ? m.value.examples.length : 0), 0) };
}
function validateEvent(part, at) {
    const out = [];
    for (const k of Object.keys(part))
        if (!PART_KEYS.has(k) && !k.startsWith('x-'))
            out.push((0, model_1.issue)(`${at}/${(0, model_1.esc)(k)}`, 'part.key-unknown', `«${k}» no es una clave de una parte event`));
    const base = `${at}/asyncapi`;
    const aa = part.asyncapi;
    if (!(0, model_1.isObject)(aa)) {
        out.push((0, model_1.issue)(base, 'asyncapi.invalid', 'La parte event debe llevar su documento AsyncAPI en «asyncapi»'));
        return out;
    }
    if (typeof aa.asyncapi !== 'string' || !/^3\.0\.\d+$/.test(aa.asyncapi)) {
        out.push((0, model_1.issue)(`${base}/asyncapi`, 'asyncapi.version', 'El documento debe ser AsyncAPI 3.0 (asyncapi: "3.0.x")'));
        return out;
    }
    if (!(0, model_1.isObject)(aa.info) || typeof aa.info.title !== 'string' || typeof aa.info.version !== 'string')
        out.push((0, model_1.issue)(`${base}/info`, 'asyncapi.invalid', 'info debe tener title y version'));
    for (const k of offKeys(aa, ROOT_KEYS))
        out.push(unsupported(`${base}/${(0, model_1.esc)(k)}`, k));
    if (aa.defaultContentType !== undefined && aa.defaultContentType !== exports.JSON_CONTENT)
        out.push(unsupported(`${base}/defaultContentType`, `El contenido ${aa.defaultContentType}`));
    const resolve = asyncApiResolver(aa, base);
    if (aa.components !== undefined && !(0, model_1.isObject)(aa.components))
        out.push((0, model_1.issue)(`${base}/components`, 'asyncapi.invalid', 'components debe ser un objeto'));
    const components = (0, model_1.isObject)(aa.components) ? aa.components : {};
    for (const k of offKeys(components, COMPONENT_KEYS))
        out.push(unsupported(`${base}/components/${(0, model_1.esc)(k)}`, `components.${k}`));
    const schemas = (0, model_1.isObject)(components.schemas) ? components.schemas : {};
    for (const name of Object.keys(schemas))
        (0, shapes_1.checkShape)(schemas[name], `${base}/components/schemas/${(0, model_1.esc)(name)}`, resolve, out);
    if (!(0, model_1.isObject)(aa.channels) || !Object.keys(aa.channels).length)
        out.push((0, model_1.issue)(`${base}/channels`, 'asyncapi.invalid', 'channels debe tener al menos un canal'));
    const channels = (0, model_1.isObject)(aa.channels) ? aa.channels : {};
    const checked = new Set();
    for (const name of Object.keys(channels)) {
        const cAt = `${base}/channels/${(0, model_1.esc)(name)}`;
        const ch = channels[name];
        if (!(0, model_1.isObject)(ch) || '$ref' in ch) {
            out.push((0, model_1.issue)(cAt, 'channel.invalid', 'Cada canal es un objeto con address y messages'));
            continue;
        }
        for (const k of offKeys(ch, CHANNEL_KEYS))
            out.push(unsupported(`${cAt}/${(0, model_1.esc)(k)}`, k));
        if (typeof ch.address !== 'string' || !ch.address.trim())
            out.push((0, model_1.issue)(`${cAt}/address`, 'channel.address-invalid', 'address es la dirección del canal (un tópico, una cola o una ruta)'));
        if (!(0, model_1.isObject)(ch.messages) || !Object.keys(ch.messages).length) {
            out.push((0, model_1.issue)(`${cAt}/messages`, 'channel.invalid', 'El canal declara al menos un mensaje en messages'));
            continue;
        }
        for (const key of Object.keys(ch.messages)) {
            const mAt = `${cAt}/messages/${(0, model_1.esc)(key)}`;
            const d = deref(ch.messages[key], mAt, resolve);
            if (!d)
                out.push((0, model_1.issue)(mAt, 'ref.unresolved', 'El mensaje no existe o no es un objeto'));
            else if (!checked.has(d.at)) {
                checked.add(d.at);
                validateMessage(d.value, d.at, resolve, out);
            }
        }
    }
    const ops = (0, model_1.isObject)(aa.operations) ? aa.operations : {};
    if (!(0, model_1.isObject)(aa.operations) || !Object.keys(ops).length)
        out.push((0, model_1.issue)(`${base}/operations`, 'asyncapi.invalid', 'operations debe tener al menos una operación'));
    if (Object.keys(ops).length > exports.MAX_EVENT_OPERATIONS)
        out.push((0, model_1.issue)(`${base}/operations`, 'doc.too-many-operations', `Una parte admite hasta ${exports.MAX_EVENT_OPERATIONS} operaciones`));
    const resolved = eventOperations(aa, base, resolve);
    for (const id of Object.keys(ops)) {
        const oAt = `${base}/operations/${(0, model_1.esc)(id)}`;
        if (!OP_ID.test(id))
            out.push((0, model_1.issue)(oAt, 'operation.id-invalid', 'El id de una operación tiene hasta 64 letras, números, puntos, guiones o guiones bajos, y empieza con letra'));
        const op = ops[id];
        if (!(0, model_1.isObject)(op)) {
            out.push((0, model_1.issue)(oAt, 'asyncapi.invalid', 'Cada operación es un objeto'));
            continue;
        }
        for (const k of offKeys(op, OPERATION_KEYS))
            out.push(unsupported(`${oAt}/${(0, model_1.esc)(k)}`, k));
        if (op.action !== 'send' && op.action !== 'receive')
            out.push((0, model_1.issue)(`${oAt}/action`, 'operation.action-invalid', 'action es send (el proveedor lo emite) o receive (el proveedor lo recibe)'));
        const o = resolved.find((x) => x.id === id);
        if (!o.channel)
            out.push((0, model_1.issue)(`${oAt}/channel`, 'ref.unresolved', 'channel es { "$ref": "#/channels/<canal>" } con un canal del documento'));
        if (op.messages !== undefined && !Array.isArray(op.messages))
            out.push((0, model_1.issue)(`${oAt}/messages`, 'asyncapi.invalid', 'messages es una lista de referencias a mensajes del canal'));
        for (const i of o.bad)
            out.push((0, model_1.issue)(`${oAt}/messages/${i}`, 'ref.unresolved', 'Cada mensaje es { "$ref": "#/channels/<canal>/messages/<clave>" } del mismo canal de la operación'));
    }
    for (const m of usedMessages(resolved)) {
        if (!Array.isArray(m.value.examples) || !m.value.examples.length)
            out.push((0, model_1.issue)(m.at, 'example.missing', `El mensaje ${m.value.name ?? m.key} necesita al menos un ejemplo`));
    }
    return out;
}
function validateMessage(msg, at, resolve, out) {
    for (const k of offKeys(msg, MESSAGE_KEYS))
        out.push(unsupported(`${at}/${(0, model_1.esc)(k)}`, k));
    if (msg.contentType !== undefined && msg.contentType !== exports.JSON_CONTENT)
        out.push(unsupported(`${at}/contentType`, `El contenido ${msg.contentType}`));
    if (msg.payload === undefined)
        out.push((0, model_1.issue)(at, 'message.payload-missing', 'El mensaje define su payload'));
    else
        (0, shapes_1.checkShape)(msg.payload, `${at}/payload`, resolve, out);
    if (msg.headers !== undefined) {
        (0, shapes_1.checkShape)(msg.headers, `${at}/headers`, resolve, out);
        const h = deref(msg.headers, `${at}/headers`, resolve);
        if (h && h.value.type !== 'object')
            out.push((0, model_1.issue)(`${at}/headers`, 'message.headers-invalid', 'headers es una forma de tipo object'));
    }
    if (msg.examples === undefined)
        return;
    if (!Array.isArray(msg.examples)) {
        out.push((0, model_1.issue)(`${at}/examples`, 'asyncapi.invalid', 'examples es una lista'));
        return;
    }
    const names = new Set();
    msg.examples.forEach((ex, i) => {
        const eAt = `${at}/examples/${i}`;
        if (!(0, model_1.isObject)(ex)) {
            out.push((0, model_1.issue)(eAt, 'example.invalid', 'Cada ejemplo es un objeto con name y payload'));
            return;
        }
        if (typeof ex.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(ex.name))
            out.push((0, model_1.issue)(`${eAt}/name`, 'example.name-invalid', 'Cada ejemplo tiene name, hasta 64 caracteres en minúsculas, números y guiones'));
        else if (names.has(ex.name))
            out.push((0, model_1.issue)(`${eAt}/name`, 'example.duplicate', `El ejemplo «${ex.name}» está repetido en el mensaje`));
        else
            names.add(ex.name);
        if (ex.payload === undefined)
            out.push((0, model_1.issue)(eAt, 'example.invalid', 'El ejemplo trae su payload'));
        const found = [];
        if (ex.payload !== undefined && msg.payload !== undefined)
            (0, shapes_1.checkValue)(msg.payload, ex.payload, `${eAt}/payload`, resolve, found);
        if (ex.headers !== undefined && msg.headers !== undefined)
            (0, shapes_1.checkValue)(msg.headers, ex.headers, `${eAt}/headers`, resolve, found);
        for (const f of found)
            out.push((0, model_1.issue)(f.path, 'example.invalid', f.message));
    });
}
function diffEvent(before, after) {
    const out = [];
    const add = (rule, path, extra = {}) => {
        const { compat, ...values } = extra;
        out.push({ rule, part: after.id, path, ...values, compat: compat ?? exports.EVENT_RULES[rule] });
    };
    const baa = (0, model_1.isObject)(before.asyncapi) ? before.asyncapi : {};
    const aaa = (0, model_1.isObject)(after.asyncapi) ? after.asyncapi : {};
    const rb = asyncApiResolver(baa, '');
    const ra = asyncApiResolver(aaa, '');
    const sd = new schema_diff_1.SchemaDiff(rb, ra, add);
    const bOps = new Map(eventOperations(baa, '', rb).map((o) => [o.id, o]));
    const aOps = eventOperations(aaa, '', ra);
    const aIds = new Set(aOps.map((o) => o.id));
    for (const [id, o] of bOps)
        if (!aIds.has(id))
            add('event.removed', o.at, { before: id });
    for (const a of aOps) {
        const b = bOps.get(a.id);
        if (!b) {
            add('event.added', a.at, { after: a.id });
            continue;
        }
        if (b.action !== a.action)
            add('event.action-changed', `${a.at}/action`, { before: b.action, after: a.action });
        const bAddr = b.channel?.value.address;
        const aAddr = a.channel?.value.address;
        if (bAddr !== aAddr)
            add('channel.address-changed', `${a.channel?.at ?? a.at}/address`, { before: bAddr, after: aAddr });
        if (!(0, model_1.sameJson)(offPart(b.channel?.value, CHANNEL_KEYS), offPart(a.channel?.value, CHANNEL_KEYS)) || !(0, model_1.sameJson)(offPart(baa.operations?.[b.id], OPERATION_KEYS), offPart(aaa.operations?.[a.id], OPERATION_KEYS))) {
            add('unsupported.changed', a.at);
        }
        const ctx = a.action === 'receive' ? 'request' : 'response';
        const bm = new Map(b.messages.map((m) => [m.key, m]));
        const am = new Set(a.messages.map((m) => m.key));
        for (const [key, m] of bm)
            if (!am.has(key))
                add('message.removed', m.at, { before: key });
        for (const m of a.messages) {
            const old = bm.get(m.key);
            if (!old) {
                add('message.added', m.at, { after: m.key, ...(ctx === 'request' ? { compat: C } : {}) });
                continue;
            }
            message(old, m, ctx, sd, add);
        }
    }
    (0, schema_diff_1.textChanges)(baa, aaa, add);
    return (0, schema_diff_1.strictestPerPath)(out);
}
function message(b, a, ctx, sd, add) {
    if (!(0, model_1.sameJson)(offPart(b.value, MESSAGE_KEYS), offPart(a.value, MESSAGE_KEYS)) || (b.value.contentType ?? exports.JSON_CONTENT) !== (a.value.contentType ?? exports.JSON_CONTENT))
        add('unsupported.changed', a.at);
    sd.schema(b.value.payload, a.value.payload, ctx, `${b.at}/payload`, `${a.at}/payload`);
    const bh = b.value.headers;
    const ah = a.value.headers;
    if (bh !== undefined && ah !== undefined)
        sd.schema(bh, ah, ctx, `${b.at}/headers`, `${a.at}/headers`);
    else if (bh !== undefined)
        add(`${ctx}.field.removed`, `${a.at}/headers`);
    else if (ah !== undefined)
        add(`${ctx}.field.added`, `${a.at}/headers`);
    const list = (v) => (Array.isArray(v) ? v.filter(model_1.isObject) : []);
    const be = new Map(list(b.value.examples).map((e, i) => [String(e.name), { e, i }]));
    const ae = list(a.value.examples).map((e, i) => ({ e, i }));
    const aNames = new Set(ae.map((x) => String(x.e.name)));
    for (const [name, x] of be)
        if (!aNames.has(name))
            add('example.removed', `${b.at}/examples/${x.i}`, { before: name });
    for (const x of ae) {
        const old = be.get(String(x.e.name));
        if (!old)
            add('example.added', `${a.at}/examples/${x.i}`, { after: x.e.name });
        else if (!(0, model_1.sameJson)(old.e, x.e))
            add('example.changed', `${a.at}/examples/${x.i}`, { after: x.e.name });
    }
}
//# sourceMappingURL=event.js.map
  },
  "openapi-diff": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_API_RULES = exports.strictestPerPath = void 0;
exports.diffHttpApi = diffHttpApi;
const model_1 = __mod("model");
const openapi_1 = __mod("openapi");
const schema_diff_1 = __mod("schema-diff");
Object.defineProperty(exports, "strictestPerPath", { enumerable: true, get: function () { return schema_diff_1.strictestPerPath; } });
const R = 'ROMPE';
const C = 'COMPATIBLE';
const P = 'PARCHE';
exports.HTTP_API_RULES = {
    'operation.removed': R,
    'operation.method-or-path-changed': R,
    'operation.added': C,
    'request.param.added-required': R,
    'request.param.added-optional': C,
    'request.param.removed': R,
    'request.param.optional-to-required': R,
    'request.param.required-to-optional': C,
    'request.body.added-required': R,
    'request.body.added-optional': C,
    'request.body.removed': R,
    'request.body.optional-to-required': R,
    'request.body.required-to-optional': C,
    'request.field.added-required': R,
    'request.field.added': C,
    'request.field.removed': R,
    'request.field.optional-to-required': R,
    'request.field.required-to-optional': C,
    'request.enum.value-removed': R,
    'request.enum.value-added': C,
    'request.constraint.tightened': R,
    'request.constraint.loosened': C,
    'response.field.removed': R,
    'response.field.required-to-optional': R,
    'response.field.nullable-added': R,
    'response.field.added': C,
    'response.field.optional-to-required': C,
    'response.enum.value-added': R,
    'response.enum.value-removed': C,
    'response.constraint.loosened': R,
    'response.constraint.tightened': C,
    'response.status.removed': R,
    'response.status.added': C,
    'type.changed': R,
    'casing.changed': R,
    'unsupported.changed': R,
    'example.added': C,
    'example.removed': C,
    'example.changed': C,
    'text.changed': P,
};
function diffHttpApi(before, after) {
    return new HttpApiDiff(before, after).run();
}
class HttpApiDiff {
    before;
    after;
    out = [];
    sd;
    boa;
    aoa;
    rb;
    ra;
    constructor(before, after) {
        this.before = before;
        this.after = after;
        this.boa = (0, model_1.isObject)(before.openapi) ? before.openapi : {};
        this.aoa = (0, model_1.isObject)(after.openapi) ? after.openapi : {};
        this.rb = (0, openapi_1.openApiResolver)(this.boa, '');
        this.ra = (0, openapi_1.openApiResolver)(this.aoa, '');
        this.sd = new schema_diff_1.SchemaDiff(this.rb, this.ra, (rule, path, extra) => this.add(rule, path, extra));
    }
    run() {
        if (this.before.casing !== this.after.casing)
            this.add('casing.changed', '/casing', { before: this.before.casing, after: this.after.casing });
        const bOps = new Map((0, openapi_1.operations)(this.boa).map((o) => [o.id, o]));
        const aOps = new Map((0, openapi_1.operations)(this.aoa).map((o) => [o.id, o]));
        for (const [id, o] of bOps)
            if (!aOps.has(id))
                this.add('operation.removed', o.at, { before: `${o.method.toUpperCase()} ${o.path}` });
        for (const [id, a] of aOps) {
            const b = bOps.get(id);
            if (!b) {
                this.add('operation.added', a.at, { after: `${a.method.toUpperCase()} ${a.path}` });
                continue;
            }
            if (b.method !== a.method || b.path !== a.path) {
                this.add('operation.method-or-path-changed', a.at, { before: `${b.method.toUpperCase()} ${b.path}`, after: `${a.method.toUpperCase()} ${a.path}` });
            }
            this.operation(b, a);
        }
        this.texts();
        return (0, schema_diff_1.strictestPerPath)(this.out);
    }
    add(rule, path, extra = {}) {
        const { compat, ...values } = extra;
        this.out.push({ rule, part: this.after.id, path, ...values, compat: compat ?? exports.HTTP_API_RULES[rule] });
    }
    operation(b, a) {
        const key = (p) => `${p.value.in}:${p.value.name}`;
        const bp = new Map((0, openapi_1.operationParams)(b, this.boa, '', this.rb).map((p) => [key(p), p]));
        const ap = new Map((0, openapi_1.operationParams)(a, this.aoa, '', this.ra).map((p) => [key(p), p]));
        for (const [k, p] of bp)
            if (!ap.has(k))
                this.add('request.param.removed', p.at, { before: k });
        for (const [k, p] of ap) {
            const old = bp.get(k);
            if (!old) {
                this.add(p.value.required === true ? 'request.param.added-required' : 'request.param.added-optional', p.at, { after: k });
                continue;
            }
            this.required('request.param', !!old.value.required, !!p.value.required, p.at);
            if (!(0, model_1.sameJson)(unsupportedPart(old.value), unsupportedPart(p.value)))
                this.add('unsupported.changed', p.at);
            this.sd.schema(old.value.schema, p.value.schema, 'request', `${old.at}/schema`, `${p.at}/schema`);
        }
        const bb = (0, openapi_1.deref)(b.op.requestBody, `${b.at}/requestBody`, this.rb);
        const ab = (0, openapi_1.deref)(a.op.requestBody, `${a.at}/requestBody`, this.ra);
        const bJson = jsonOf(bb?.value.content);
        const aJson = jsonOf(ab?.value.content);
        if (!bJson && aJson)
            this.add(ab.value.required === true ? 'request.body.added-required' : 'request.body.added-optional', ab.at);
        else if (bJson && !aJson)
            this.add('request.body.removed', bb.at);
        else if (bJson && aJson) {
            this.required('request.body', bb.value.required === true, ab.value.required === true, ab.at);
            this.sd.schema(bJson.schema, aJson.schema, 'request', `${bb.at}/content/${(0, model_1.esc)(openapi_1.JSON_MEDIA)}/schema`, `${ab.at}/content/${(0, model_1.esc)(openapi_1.JSON_MEDIA)}/schema`);
        }
        if (!(0, model_1.sameJson)(otherMedia(bb?.value.content), otherMedia(ab?.value.content)))
            this.add('unsupported.changed', `${a.at}/requestBody/content`);
        const bRes = (0, model_1.isObject)(b.op.responses) ? b.op.responses : {};
        const aRes = (0, model_1.isObject)(a.op.responses) ? a.op.responses : {};
        for (const s of Object.keys(bRes).sort()) {
            if (!(s in aRes))
                this.add('response.status.removed', `${b.at}/responses/${(0, model_1.esc)(s)}`, { before: s, compat: /^2/.test(s) ? R : C });
        }
        for (const s of Object.keys(aRes).sort()) {
            const rAt = `${a.at}/responses/${(0, model_1.esc)(s)}`;
            if (!(s in bRes)) {
                this.add('response.status.added', rAt, { after: s });
                continue;
            }
            const br = (0, openapi_1.deref)(bRes[s], `${b.at}/responses/${(0, model_1.esc)(s)}`, this.rb);
            const ar = (0, openapi_1.deref)(aRes[s], rAt, this.ra);
            if (!br || !ar)
                continue;
            const bj = jsonOf(br.value.content);
            const aj = jsonOf(ar.value.content);
            const at = `${ar.at}/content/${(0, model_1.esc)(openapi_1.JSON_MEDIA)}`;
            if (bj?.schema !== undefined && aj?.schema === undefined)
                this.add('response.field.removed', at);
            else if (bj?.schema === undefined && aj?.schema !== undefined)
                this.add('response.field.added', at);
            else if (bj && aj)
                this.sd.schema(bj.schema, aj.schema, 'response', `${br.at}/content/${(0, model_1.esc)(openapi_1.JSON_MEDIA)}/schema`, `${at}/schema`);
            const bOff = { media: otherMedia(br.value.content), headers: br.value.headers, links: br.value.links };
            const aOff = { media: otherMedia(ar.value.content), headers: ar.value.headers, links: ar.value.links };
            if (!(0, model_1.sameJson)(bOff, aOff))
                this.add('unsupported.changed', ar.at);
        }
        if (!(0, model_1.sameJson)(b.op.callbacks, a.op.callbacks))
            this.add('unsupported.changed', `${a.at}/callbacks`);
        this.examples((0, openapi_1.collect)(b, this.boa, '', this.rb).all, (0, openapi_1.collect)(a, this.aoa, '', this.ra).all, a.at);
    }
    required(prefix, before, after, at) {
        if (before && !after)
            this.add(`${prefix}.required-to-optional`, at);
        if (!before && after)
            this.add(`${prefix}.optional-to-required`, at);
    }
    examples(before, after, opAt) {
        const sig = (list, key) => list.filter((e) => e.key === key).map((e) => ({ where: e.where, value: e.value, asserts: e.asserts })).sort((x, y) => (x.where < y.where ? -1 : x.where > y.where ? 1 : 0));
        const bKeys = [...new Set(before.map((e) => e.key))].sort();
        const aKeys = [...new Set(after.map((e) => e.key))].sort();
        const where = (list, key) => list.find((e) => e.key === key && !/^(query|path|header|body)/.test(e.where))?.at ?? list.find((e) => e.key === key)?.at ?? opAt;
        for (const k of bKeys)
            if (!aKeys.includes(k))
                this.add('example.removed', where(before, k), { before: k });
        for (const k of aKeys) {
            if (!bKeys.includes(k))
                this.add('example.added', where(after, k), { after: k });
            else if (!(0, model_1.sameJson)(sig(before, k), sig(after, k)))
                this.add('example.changed', where(after, k), { after: k });
        }
    }
    texts() {
        (0, schema_diff_1.textChanges)(this.boa, this.aoa, (rule, path, extra) => this.add(rule, path, extra));
    }
}
const jsonOf = (content) => ((0, model_1.isObject)(content) && (0, model_1.isObject)(content[openapi_1.JSON_MEDIA]) ? content[openapi_1.JSON_MEDIA] : undefined);
const otherMedia = (content) => ((0, model_1.isObject)(content) ? Object.fromEntries(Object.entries(content).filter(([k]) => k !== openapi_1.JSON_MEDIA)) : {});
const unsupportedPart = (p) => (p.in === 'cookie' || 'content' in p ? p : null);
//# sourceMappingURL=openapi-diff.js.map
  },
  "openapi": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_OPERATIONS = exports.JSON_MEDIA = exports.CASINGS = exports.METHODS = void 0;
exports.openApiResolver = openApiResolver;
exports.operations = operations;
exports.deref = deref;
exports.countHttpApi = countHttpApi;
exports.validateHttpApi = validateHttpApi;
exports.operationParams = operationParams;
exports.collect = collect;
const model_1 = __mod("model");
const shapes_1 = __mod("shapes");
exports.METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];
exports.CASINGS = ['camelCase', 'snake_case', 'PascalCase'];
exports.JSON_MEDIA = 'application/json';
exports.MAX_OPERATIONS = 100;
const PARAM_IN = new Set(['path', 'query', 'header']);
const OP_KEYS = new Set(['operationId', 'summary', 'description', 'tags', 'parameters', 'requestBody', 'responses', 'deprecated', 'security', 'servers', 'externalDocs']);
const PATH_ITEM_KEYS = new Set(['summary', 'description', 'parameters', ...exports.METHODS]);
const COMPONENTS = new Set(['schemas', 'parameters', 'requestBodies', 'responses']);
const STATUS = /^([1-5]\d\d|[1-5]XX|default)$/;
const unsupported = (at, what) => (0, model_1.issue)(at, 'profile.unsupported', `${what} está fuera del perfil soportado: se acepta, pero cualquier cambio aquí cuenta como «rompe»`, 'info');
function openApiResolver(oa, base) {
    return (ref) => {
        if (!(0, shapes_1.isLocalRef)(ref))
            return undefined;
        const schema = (0, model_1.pointer)(oa, ref.slice(1));
        return schema === undefined ? undefined : { schema, path: base + ref.slice(1) };
    };
}
function operations(oa, base = '') {
    const out = [];
    const paths = (0, model_1.isObject)(oa.paths) ? oa.paths : {};
    for (const p of Object.keys(paths)) {
        const item = paths[p];
        if (!(0, model_1.isObject)(item))
            continue;
        for (const m of exports.METHODS) {
            if ((0, model_1.isObject)(item[m]))
                out.push({ id: item[m].operationId, method: m, path: p, at: `${base}/paths/${(0, model_1.esc)(p)}/${m}`, op: item[m] });
        }
    }
    return out;
}
function deref(obj, at, resolve) {
    if ((0, model_1.isObject)(obj) && '$ref' in obj) {
        const t = resolve(obj.$ref);
        return t && (0, model_1.isObject)(t.schema) ? { value: t.schema, at: t.path } : undefined;
    }
    return (0, model_1.isObject)(obj) ? { value: obj, at } : undefined;
}
function countHttpApi(part) {
    const oa = part.openapi;
    if (!(0, model_1.isObject)(oa))
        return { operations: 0, examples: 0 };
    const resolve = openApiResolver(oa, '');
    let examples = 0;
    const ops = operations(oa);
    for (const o of ops) {
        const keys = new Set();
        for (const e of collect(o, oa, '', resolve).all)
            keys.add(e.key);
        examples += keys.size;
    }
    return { operations: ops.length, examples };
}
function validateHttpApi(part, at) {
    const out = [];
    if (!exports.CASINGS.includes(part.casing))
        out.push((0, model_1.issue)(`${at}/casing`, 'part.casing-invalid', `casing debe ser ${exports.CASINGS.join(', ')}`));
    const base = `${at}/openapi`;
    const oa = part.openapi;
    if (!(0, model_1.isObject)(oa)) {
        out.push((0, model_1.issue)(base, 'openapi.invalid', 'La parte http-api debe llevar su documento OpenAPI en «openapi»'));
        return out;
    }
    if (typeof oa.openapi !== 'string' || !/^3\.1\.\d+$/.test(oa.openapi)) {
        out.push((0, model_1.issue)(`${base}/openapi`, 'openapi.version', 'El documento debe ser OpenAPI 3.1 (openapi: "3.1.x")'));
        return out;
    }
    if (!(0, model_1.isObject)(oa.info) || typeof oa.info.title !== 'string' || typeof oa.info.version !== 'string') {
        out.push((0, model_1.issue)(`${base}/info`, 'openapi.invalid', 'info debe tener title y version'));
    }
    const resolve = openApiResolver(oa, base);
    if (oa.components !== undefined && !(0, model_1.isObject)(oa.components))
        out.push((0, model_1.issue)(`${base}/components`, 'openapi.invalid', 'components debe ser un objeto'));
    const components = (0, model_1.isObject)(oa.components) ? oa.components : {};
    for (const k of Object.keys(components))
        if (!COMPONENTS.has(k) && !k.startsWith('x-'))
            out.push(unsupported(`${base}/components/${(0, model_1.esc)(k)}`, `components.${k}`));
    const schemas = (0, model_1.isObject)(components.schemas) ? components.schemas : {};
    for (const name of Object.keys(schemas))
        (0, shapes_1.checkShape)(schemas[name], `${base}/components/schemas/${(0, model_1.esc)(name)}`, resolve, out);
    if (!(0, model_1.isObject)(oa.paths)) {
        out.push((0, model_1.issue)(`${base}/paths`, 'openapi.invalid', 'paths debe ser un objeto con al menos una operación'));
        return out;
    }
    for (const k of Object.keys(oa))
        if (['webhooks', 'callbacks'].includes(k))
            out.push(unsupported(`${base}/${k}`, k));
    for (const p of Object.keys(oa.paths)) {
        const pAt = `${base}/paths/${(0, model_1.esc)(p)}`;
        if (!p.startsWith('/'))
            out.push((0, model_1.issue)(pAt, 'path.invalid', 'Cada ruta debe empezar con /'));
        const item = oa.paths[p];
        if (!(0, model_1.isObject)(item)) {
            out.push((0, model_1.issue)(pAt, 'path.invalid', 'Cada ruta debe ser un objeto con sus operaciones'));
            continue;
        }
        for (const k of Object.keys(item))
            if (!PATH_ITEM_KEYS.has(k) && !k.startsWith('x-'))
                out.push(unsupported(`${pAt}/${(0, model_1.esc)(k)}`, k));
    }
    const ops = operations(oa, base);
    if (!ops.length)
        out.push((0, model_1.issue)(`${base}/paths`, 'openapi.invalid', 'paths debe tener al menos una operación'));
    if (ops.length > exports.MAX_OPERATIONS)
        out.push((0, model_1.issue)(`${base}/paths`, 'doc.too-many-operations', `Un contrato admite hasta ${exports.MAX_OPERATIONS} operaciones`));
    const seen = new Set();
    for (const o of ops) {
        if (typeof o.id !== 'string' || !o.id)
            out.push((0, model_1.issue)(o.at, 'operation.id-missing', `La operación ${o.method.toUpperCase()} ${o.path} no tiene operationId`));
        else if (seen.has(o.id))
            out.push((0, model_1.issue)(`${o.at}/operationId`, 'operation.id-duplicate', `operationId «${o.id}» está repetido`));
        else
            seen.add(o.id);
        validateOperation(o, oa, base, resolve, out);
    }
    return out;
}
function operationParams(o, oa, base, resolve, out = []) {
    const pathItem = oa.paths[o.path];
    const all = [];
    const lists = [[pathItem.parameters, `${base}/paths/${(0, model_1.esc)(o.path)}/parameters`], [o.op.parameters, `${o.at}/parameters`]];
    for (const [list, at] of lists) {
        if (list === undefined)
            continue;
        if (!Array.isArray(list)) {
            out.push((0, model_1.issue)(at, 'openapi.invalid', 'parameters debe ser una lista'));
            continue;
        }
        list.forEach((raw, i) => {
            const p = deref(raw, `${at}/${i}`, resolve);
            if (!p) {
                out.push((0, model_1.issue)(`${at}/${i}`, (0, model_1.isObject)(raw) && '$ref' in raw ? 'ref.unresolved' : 'openapi.invalid', 'El parámetro no existe o no es un objeto'));
                return;
            }
            const dup = all.findIndex((x) => x.value.name === p.value.name && x.value.in === p.value.in);
            if (dup >= 0)
                all.splice(dup, 1);
            all.push(p);
        });
    }
    return all;
}
function collect(o, oa, base, resolve, out = []) {
    const req = [];
    const res = [];
    const params = operationParams(o, oa, base, resolve, out);
    for (const p of params) {
        if ((0, model_1.isObject)(p.value.examples)) {
            for (const key of Object.keys(p.value.examples)) {
                const ex = p.value.examples[key];
                req.push({ key, where: `${p.value.in}:${p.value.name}`, at: `${p.at}/examples/${(0, model_1.esc)(key)}`, value: (0, model_1.isObject)(ex) ? ex.value : undefined, schema: p.value.schema, side: 'param' });
            }
        }
    }
    const body = deref(o.op.requestBody, `${o.at}/requestBody`, resolve);
    const bodyJson = body && (0, model_1.isObject)(body.value.content) ? body.value.content[exports.JSON_MEDIA] : undefined;
    if (body && (0, model_1.isObject)(bodyJson) && (0, model_1.isObject)(bodyJson.examples)) {
        for (const key of Object.keys(bodyJson.examples)) {
            const ex = bodyJson.examples[key];
            req.push({ key, where: 'body', at: `${body.at}/content/${(0, model_1.esc)(exports.JSON_MEDIA)}/examples/${(0, model_1.esc)(key)}`, value: (0, model_1.isObject)(ex) ? ex.value : undefined, schema: bodyJson.schema, side: 'body' });
        }
    }
    const responses = (0, model_1.isObject)(o.op.responses) ? o.op.responses : {};
    let emptySuccess;
    for (const status of Object.keys(responses).sort()) {
        const r = deref(responses[status], `${o.at}/responses/${(0, model_1.esc)(status)}`, resolve);
        if (!r)
            continue;
        const json = (0, model_1.isObject)(r.value.content) ? r.value.content[exports.JSON_MEDIA] : undefined;
        if (!(0, model_1.isObject)(json) && /^2/.test(status) && emptySuccess === undefined)
            emptySuccess = status;
        if ((0, model_1.isObject)(json) && (0, model_1.isObject)(json.examples)) {
            for (const key of Object.keys(json.examples)) {
                const ex = json.examples[key];
                res.push({ key, where: status, at: `${r.at}/content/${(0, model_1.esc)(exports.JSON_MEDIA)}/examples/${(0, model_1.esc)(key)}`, value: (0, model_1.isObject)(ex) ? ex.value : undefined, schema: json.schema, side: 'response', status, asserts: (0, model_1.isObject)(ex) ? ex['x-qubipods-assert'] : undefined });
            }
        }
    }
    return { params, body, req, res, emptySuccess, all: [...req, ...res] };
}
function validateOperation(o, oa, base, resolve, out) {
    for (const k of Object.keys(o.op)) {
        if (k === 'callbacks')
            out.push(unsupported(`${o.at}/callbacks`, 'callbacks'));
        else if (!OP_KEYS.has(k) && !k.startsWith('x-'))
            out.push(unsupported(`${o.at}/${(0, model_1.esc)(k)}`, k));
    }
    const ex = collect(o, oa, base, resolve, out);
    const template = new Set([...o.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]));
    const declared = new Set();
    for (const p of ex.params) {
        const v = p.value;
        if (typeof v.name !== 'string' || !v.name)
            out.push((0, model_1.issue)(p.at, 'openapi.invalid', 'El parámetro debe tener name'));
        if (v.in === 'cookie' || 'content' in v) {
            out.push(unsupported(p.at, v.in === 'cookie' ? 'Un parámetro cookie' : 'Un parámetro con content'));
            continue;
        }
        if (!PARAM_IN.has(v.in))
            out.push((0, model_1.issue)(`${p.at}/in`, 'openapi.invalid', 'in debe ser path, query o header'));
        if (v.in === 'path') {
            declared.add(v.name);
            if (v.required !== true || !template.has(v.name))
                out.push((0, model_1.issue)(p.at, 'parameter.path-invalid', `El parámetro de ruta «${v.name}» debe ser obligatorio y aparecer en la ruta`));
        }
        if ('example' in v)
            out.push(unsupported(`${p.at}/example`, 'example (usa examples con clave)'));
        if (v.schema === undefined)
            out.push((0, model_1.issue)(p.at, 'openapi.invalid', 'El parámetro debe tener schema'));
        else
            (0, shapes_1.checkShape)(v.schema, `${p.at}/schema`, resolve, out);
    }
    for (const name of template)
        if (!declared.has(name))
            out.push((0, model_1.issue)(o.at, 'parameter.path-missing', `Falta declarar el parámetro de ruta «${name}»`));
    if (o.op.requestBody !== undefined && !ex.body)
        out.push((0, model_1.issue)(`${o.at}/requestBody`, 'ref.unresolved', 'El cuerpo no existe o no es un objeto'));
    if (ex.body)
        contentShapes(ex.body.value.content, `${ex.body.at}/content`, resolve, out);
    if (!(0, model_1.isObject)(o.op.responses) || !Object.keys(o.op.responses).length)
        out.push((0, model_1.issue)(`${o.at}/responses`, 'openapi.invalid', 'La operación debe declarar sus respuestas'));
    const responses = (0, model_1.isObject)(o.op.responses) ? o.op.responses : {};
    for (const status of Object.keys(responses)) {
        const rAt = `${o.at}/responses/${(0, model_1.esc)(status)}`;
        if (!STATUS.test(status))
            out.push((0, model_1.issue)(rAt, 'response.status-invalid', 'El estado debe ser un código HTTP (200), un rango (2XX) o default'));
        const r = deref(responses[status], rAt, resolve);
        if (!r) {
            out.push((0, model_1.issue)(rAt, 'ref.unresolved', 'La respuesta no existe o no es un objeto'));
            continue;
        }
        contentShapes(r.value.content, `${r.at}/content`, resolve, out);
        for (const k of ['headers', 'links'])
            if (k in r.value)
                out.push(unsupported(`${r.at}/${k}`, k));
    }
    validateExamples(o, ex, resolve, out);
}
function contentShapes(content, at, resolve, out) {
    if (content === undefined)
        return;
    if (!(0, model_1.isObject)(content)) {
        out.push((0, model_1.issue)(at, 'openapi.invalid', 'content debe ser un objeto'));
        return;
    }
    for (const mt of Object.keys(content)) {
        const mAt = `${at}/${(0, model_1.esc)(mt)}`;
        if (mt !== exports.JSON_MEDIA)
            out.push(unsupported(mAt, `El contenido ${mt}`));
        else if ((0, model_1.isObject)(content[mt]) && content[mt].schema !== undefined)
            (0, shapes_1.checkShape)(content[mt].schema, `${mAt}/schema`, resolve, out);
    }
}
function validateExamples(o, ex, resolve, out) {
    if (!ex.all.length) {
        out.push((0, model_1.issue)(o.at, 'example.missing', `La operación ${o.id ?? o.method.toUpperCase() + ' ' + o.path} necesita al menos un ejemplo`));
        return;
    }
    const byKey = new Map();
    for (const r of ex.res) {
        if (byKey.has(r.key))
            out.push((0, model_1.issue)(r.at, 'example.duplicate', `El ejemplo «${r.key}» está en más de una respuesta`));
        else
            byKey.set(r.key, r);
    }
    const keys = [...new Set(ex.all.map((e) => e.key))];
    const asked = new Map();
    for (const key of [...keys].sort()) {
        const response = byKey.get(key);
        if (!response && !ex.emptySuccess)
            continue;
        const request = (0, model_1.canonicalJson)(Object.fromEntries(ex.req.filter((e) => e.key === key).map((e) => [e.where, e.value ?? null])));
        const first = asked.get(request);
        if (first === undefined)
            asked.set(request, key);
        else
            out.push((0, model_1.issue)((response ?? ex.req.find((e) => e.key === key)).at, 'example.ambiguous', `Los ejemplos «${first}» y «${key}» piden lo mismo: el consumidor no puede ejercitar los dos. Cada ejemplo de una operación pide algo distinto`));
    }
    for (const key of keys) {
        const response = byKey.get(key);
        const requests = ex.req.filter((e) => e.key === key);
        const status = response?.status ?? ex.emptySuccess;
        if (!status) {
            out.push((0, model_1.issue)(requests[0].at, 'example.unpaired', `El ejemplo «${key}» no tiene una respuesta con la misma clave`));
            continue;
        }
        if (response) {
            problems(response, resolve, out);
            if (response.asserts !== undefined) {
                const asserts = Array.isArray(response.asserts) ? response.asserts : [response.asserts];
                asserts.forEach((ptr, i) => {
                    if (typeof ptr !== 'string' || (0, model_1.pointer)(response.value, ptr) === undefined) {
                        out.push((0, model_1.issue)(`${response.at}/x-qubipods-assert/${i}`, 'example.assert-missing', 'x-qubipods-assert debe apuntar a un valor del ejemplo'));
                    }
                });
            }
        }
        if (/^4/.test(status))
            continue;
        for (const r of requests)
            problems(r, resolve, out);
        const missing = ex.params.filter((p) => p.value.required === true && !requests.some((r) => r.side === 'param' && (0, model_1.isObject)(p.value.examples) && r.at === `${p.at}/examples/${(0, model_1.esc)(key)}`)).map((p) => p.value.name);
        if (ex.body?.value.required === true && !requests.some((r) => r.side === 'body'))
            missing.push('el cuerpo');
        if (missing.length)
            out.push((0, model_1.issue)((response ?? requests[0]).at, 'example.incomplete', `El ejemplo «${key}» no trae ${missing.join(', ')}`));
    }
}
function problems(e, resolve, out) {
    if (e.value === undefined) {
        out.push((0, model_1.issue)(e.at, 'example.invalid', 'El ejemplo debe tener value (externalValue está fuera del perfil)'));
        return;
    }
    if (e.schema === undefined)
        return;
    const found = [];
    (0, shapes_1.checkValue)(e.schema, e.value, `${e.at}/value`, resolve, found);
    for (const f of found)
        out.push((0, model_1.issue)(f.path, 'example.invalid', f.message));
}
//# sourceMappingURL=openapi.js.map
  },
  "types/http-api": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpApi = void 0;
const openapi_1 = __mod("openapi");
const openapi_diff_1 = __mod("openapi-diff");
exports.httpApi = {
    id: 'http-api',
    rules: openapi_diff_1.HTTP_API_RULES,
    ownFormat: false,
    validatePart: openapi_1.validateHttpApi,
    count: openapi_1.countHttpApi,
    diff: openapi_diff_1.diffHttpApi,
};
//# sourceMappingURL=http-api.js.map
  },
  "types/published-file": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedFile = void 0;
const published_file_1 = __mod("published-file");
exports.publishedFile = {
    id: 'published-file',
    rules: published_file_1.PUBLISHED_FILE_RULES,
    ownFormat: true,
    validatePart: published_file_1.validatePublishedFiles,
    count: published_file_1.countPublishedFiles,
    diff: published_file_1.diffPublishedFiles,
};
//# sourceMappingURL=published-file.js.map
  },
  "published-file": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sitemapLocs = exports.DELIMITERS = exports.FILE_FORMATS = exports.PUBLISHED_FILE_RULES = void 0;
exports.csvSpec = csvSpec;
exports.parseCsv = parseCsv;
exports.subsetProblems = subsetProblems;
exports.contentProblems = contentProblems;
exports.countPublishedFiles = countPublishedFiles;
exports.validatePublishedFiles = validatePublishedFiles;
exports.diffPublishedFiles = diffPublishedFiles;
const model_1 = __mod("model");
const own_1 = __mod("own");
const schema_diff_1 = __mod("schema-diff");
const R = 'ROMPE';
const C = 'COMPATIBLE';
exports.PUBLISHED_FILE_RULES = {
    'file.removed': R,
    'file.path-changed': R,
    'file.served-at-changed': R,
    'file.format-changed': R,
    'file.content-type-changed': R,
    'content.required-removed': R,
    'csv.column-removed': R,
    'csv.column-renamed': R,
    'csv.column-inserted': R,
    'csv.column-moved': R,
    'csv.delimiter-changed': R,
    'csv.header-changed': R,
    'csv.ordered-changed': R,
    'file.added': C,
    'content.required-added': C,
    'csv.column-appended': C,
    ...own_1.OWN_COMMON_RULES,
};
exports.FILE_FORMATS = ['json', 'csv', 'sitemap', 'text'];
exports.DELIMITERS = [',', ';', '\t', '|'];
const MAX_FILES = 100;
const FILE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CONTENT_TYPE = /^[a-z]+\/[a-z0-9.+-]+(\s*;\s*[a-z-]+=[A-Za-z0-9._-]+)*$/;
const PART_KEYS = new Set(['id', 'type', 'description', 'files']);
const COMMON = ['id', 'path', 'servedAt', 'format', 'contentType', 'description'];
const BY_FORMAT = { json: ['mustContain'], csv: ['columns', 'delimiter', 'header', 'ordered'], sitemap: ['urls'], text: ['lines'] };
const EXAMPLE_KEYS = new Set(['id', 'part', 'description', 'file', 'content']);
const filesOf = (part) => (Array.isArray(part.files) ? part.files.filter(model_1.isObject) : []);
function csvSpec(f) {
    const header = f.header !== false;
    return { columns: Array.isArray(f.columns) ? f.columns : [], delimiter: typeof f.delimiter === 'string' ? f.delimiter : ',', header, ordered: !header || f.ordered === true };
}
function parseCsv(textIn, delimiter) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < textIn.length; i++) {
        const ch = textIn[i];
        if (quoted) {
            if (ch === '"' && textIn[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else if (ch === '"')
                quoted = false;
            else
                cell += ch;
        }
        else if (ch === '"' && cell === '')
            quoted = true;
        else if (ch === delimiter) {
            row.push(cell);
            cell = '';
        }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && textIn[i + 1] === '\n')
                i++;
            row.push(cell);
            if (row.length > 1 || row[0] !== '')
                rows.push(row);
            row = [];
            cell = '';
        }
        else
            cell += ch;
    }
    row.push(cell);
    if (row.length > 1 || row[0] !== '')
        rows.push(row);
    return rows;
}
function subsetProblems(expected, actual, at = '') {
    if ((0, model_1.isObject)(expected)) {
        if (!(0, model_1.isObject)(actual))
            return [`${at || '/'}: se esperaba un objeto`];
        return Object.keys(expected).sort().flatMap((k) => (k in actual ? subsetProblems(expected[k], actual[k], `${at}/${(0, model_1.esc)(k)}`) : [`${at}/${(0, model_1.esc)(k)}: falta`]));
    }
    if (Array.isArray(expected)) {
        if (!Array.isArray(actual))
            return [`${at || '/'}: se esperaba una lista`];
        return expected.flatMap((e, i) => (actual.some((a) => !subsetProblems(e, a).length) ? [] : [`${at}/${i}: ningún elemento lo cumple`]));
    }
    return (0, model_1.sameJson)(expected, actual) ? [] : [`${at || '/'}: debe ser ${JSON.stringify(expected)}`];
}
const sitemapLocs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
exports.sitemapLocs = sitemapLocs;
function contentProblems(f, content) {
    if (f.format === 'json')
        return f.mustContain === undefined ? [] : subsetProblems(f.mustContain, content).map((p) => `mustContain ${p}`);
    if (typeof content !== 'string')
        return ['El contenido de un archivo csv, sitemap o text es un texto'];
    if (f.format === 'csv') {
        const spec = csvSpec(f);
        const rows = parseCsv(content, spec.delimiter);
        if (!rows.length)
            return ['El CSV está vacío'];
        const width = spec.header ? rows[0].length : spec.columns.length;
        const out = [];
        if (spec.header) {
            const head = rows[0].map((c) => c.trim());
            if (spec.ordered ? !spec.columns.every((c, i) => head[i] === c) : !spec.columns.every((c) => head.includes(c))) {
                out.push(`El encabezado debe tener ${spec.ordered ? 'al inicio, en ese orden,' : ''} las columnas ${spec.columns.join(', ')}`.replace('  ', ' '));
            }
        }
        rows.slice(spec.header ? 1 : 0).forEach((r, i) => {
            if (spec.header ? r.length !== width : r.length < width)
                out.push(`La fila ${i + 1} tiene ${r.length} columnas y se esperaban ${spec.header ? width : `al menos ${width}`}`);
        });
        return out;
    }
    if (f.format === 'sitemap') {
        if (!/<urlset[\s>]/.test(content))
            return ['Un sitemap tiene un elemento <urlset>'];
        const locs = new Set((0, exports.sitemapLocs)(content));
        return (Array.isArray(f.urls) ? f.urls : []).filter((u) => !locs.has(u)).map((u) => `Falta la URL ${u}`);
    }
    const lines = new Set(content.split(/\r?\n/));
    return (Array.isArray(f.lines) ? f.lines : []).filter((l) => !lines.has(l)).map((l) => `Falta la línea «${l}»`);
}
function countPublishedFiles(part, doc) {
    return { operations: 0, examples: (0, own_1.partExamples)(doc, part.id).length };
}
const uniqueStrings = (v, max = 200) => Array.isArray(v) && v.length > 0 && v.length <= max && v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 300) && new Set(v).size === v.length;
const absoluteUrl = (v) => /^https?:\/\/[^\s/]+(\/\S*)?$/.test(v);
function validatePublishedFiles(part, at, doc) {
    const out = [];
    for (const k of Object.keys(part))
        if (!PART_KEYS.has(k) && !k.startsWith('x-'))
            out.push((0, model_1.issue)(`${at}/${(0, model_1.esc)(k)}`, 'part.key-unknown', `«${k}» no es una clave de una parte published-file`));
    if (part.description !== undefined && !(0, own_1.text)(part.description, 500))
        out.push((0, model_1.issue)(`${at}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
    if (!Array.isArray(part.files) || !part.files.length || part.files.length > MAX_FILES) {
        out.push((0, model_1.issue)(`${at}/files`, 'files.invalid', `files debe tener de 1 a ${MAX_FILES} archivos`));
        return out;
    }
    const ids = new Set();
    const served = new Set();
    part.files.forEach((f, i) => {
        const fAt = `${at}/files/${i}`;
        if (!(0, model_1.isObject)(f)) {
            out.push((0, model_1.issue)(fAt, 'files.invalid', 'Cada archivo debe ser un objeto'));
            return;
        }
        if (typeof f.id !== 'string' || !FILE_ID.test(f.id))
            out.push((0, model_1.issue)(`${fAt}/id`, 'file.id-invalid', 'El id del archivo tiene hasta 64 caracteres en minúsculas, números y guiones'));
        else if (ids.has(f.id))
            out.push((0, model_1.issue)(`${fAt}/id`, 'file.id-duplicate', `El id de archivo «${f.id}» está repetido`));
        else
            ids.add(f.id);
        if (!(0, own_1.repoPath)(f.path))
            out.push((0, model_1.issue)(`${fAt}/path`, 'file.path-invalid', 'path es la ruta del archivo dentro del repositorio, sin / inicial ni ..'));
        if (typeof f.servedAt !== 'string' || !/^\/\S{0,299}$/.test(f.servedAt))
            out.push((0, model_1.issue)(`${fAt}/servedAt`, 'file.served-at-invalid', 'servedAt es la ruta donde se sirve el archivo y empieza con /'));
        else if (served.has(f.servedAt))
            out.push((0, model_1.issue)(`${fAt}/servedAt`, 'file.served-at-duplicate', `Dos archivos se sirven en ${f.servedAt}`));
        else
            served.add(f.servedAt);
        if (typeof f.contentType !== 'string' || !CONTENT_TYPE.test(f.contentType))
            out.push((0, model_1.issue)(`${fAt}/contentType`, 'file.content-type-invalid', 'contentType es un tipo de contenido (application/json, text/csv)'));
        if (f.description !== undefined && !(0, own_1.text)(f.description, 500))
            out.push((0, model_1.issue)(`${fAt}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
        if (!exports.FILE_FORMATS.includes(f.format)) {
            out.push((0, model_1.issue)(`${fAt}/format`, 'file.format-invalid', `format debe ser ${exports.FILE_FORMATS.join(', ')}`));
            return;
        }
        const allowed = new Set([...COMMON, ...BY_FORMAT[f.format]]);
        for (const k of Object.keys(f))
            if (!allowed.has(k) && !k.startsWith('x-'))
                out.push((0, model_1.issue)(`${fAt}/${(0, model_1.esc)(k)}`, 'file.key-invalid', `«${k}» no corresponde a un archivo ${f.format}`));
        if (f.format === 'csv') {
            if (!uniqueStrings(f.columns) || f.columns.some((c) => /[\r\n"]/.test(c)))
                out.push((0, model_1.issue)(`${fAt}/columns`, 'file.columns-invalid', 'columns es la lista de columnas del CSV, sin repetidas'));
            if (f.delimiter !== undefined && !exports.DELIMITERS.includes(f.delimiter))
                out.push((0, model_1.issue)(`${fAt}/delimiter`, 'file.delimiter-invalid', 'delimiter es coma, punto y coma, tabulador o barra vertical'));
            for (const k of ['header', 'ordered'])
                if (f[k] !== undefined && typeof f[k] !== 'boolean')
                    out.push((0, model_1.issue)(`${fAt}/${k}`, 'file.csv-invalid', `${k} es true o false`));
            if (f.header === false && f.ordered === false)
                out.push((0, model_1.issue)(`${fAt}/ordered`, 'file.csv-invalid', 'Un CSV sin encabezado se lee por posición: sus columnas siempre van en orden'));
        }
        if (f.format === 'sitemap' && f.urls !== undefined && !(uniqueStrings(f.urls) && f.urls.every(absoluteUrl)))
            out.push((0, model_1.issue)(`${fAt}/urls`, 'file.urls-invalid', 'urls es una lista sin repetidas de URL completas'));
        if (f.format === 'text' && f.lines !== undefined && !(uniqueStrings(f.lines) && f.lines.every((l) => !/[\r\n]/.test(l))))
            out.push((0, model_1.issue)(`${fAt}/lines`, 'file.lines-invalid', 'lines es una lista sin repetidas de líneas que el archivo debe tener'));
    });
    const files = new Map(filesOf(part).map((f) => [f.id, f]));
    const covered = new Set();
    for (const { ex, at: eAt } of (0, own_1.partExamples)(doc, part.id)) {
        for (const k of Object.keys(ex))
            if (!EXAMPLE_KEYS.has(k) && !k.startsWith('x-'))
                out.push((0, model_1.issue)(`${eAt}/${(0, model_1.esc)(k)}`, 'example.key-unknown', `«${k}» no es una clave de un ejemplo de archivo`));
        const f = typeof ex.file === 'string' ? files.get(ex.file) : undefined;
        if (!f) {
            out.push((0, model_1.issue)(`${eAt}/file`, 'example.file-unknown', 'file debe ser el id de un archivo de la parte'));
            continue;
        }
        covered.add(f.id);
        if (ex.content === undefined) {
            out.push((0, model_1.issue)(`${eAt}/content`, 'example.content-missing', 'El ejemplo trae el contenido del archivo en content'));
            continue;
        }
        if (!exports.FILE_FORMATS.includes(f.format))
            continue;
        for (const p of contentProblems(f, ex.content))
            out.push((0, model_1.issue)(`${eAt}/content`, 'example.invalid', p));
    }
    part.files.forEach((f, i) => {
        if ((0, model_1.isObject)(f) && typeof f.id === 'string' && !covered.has(f.id))
            out.push((0, model_1.issue)(`${at}/files/${i}`, 'example.missing', `El archivo ${f.id} necesita al menos un ejemplo`));
    });
    return out;
}
function diffPublishedFiles(before, after, ctx) {
    const out = [];
    const add = (rule, path, extra = {}) => {
        const { compat, ...values } = extra;
        out.push({ rule, part: after.id, path, ...values, compat: compat ?? exports.PUBLISHED_FILE_RULES[rule] });
    };
    if (before.description !== after.description)
        add('text.changed', '/description', { before: before.description, after: after.description });
    const b = (0, own_1.byId)(before.files);
    const a = (0, own_1.byId)(after.files);
    for (const [id, f] of b)
        if (!a.has(id))
            add('file.removed', (0, own_1.ptr)('files', f.i), { before: id });
    for (const [id, f] of a) {
        const old = b.get(id);
        const at = (0, own_1.ptr)('files', f.i);
        if (!old) {
            add('file.added', at, { after: id });
            continue;
        }
        const bf = old.v;
        const af = f.v;
        const field = (k, rule) => bf[k] !== af[k] && add(rule, `${at}/${k}`, { before: bf[k], after: af[k] });
        field('path', 'file.path-changed');
        field('servedAt', 'file.served-at-changed');
        field('contentType', 'file.content-type-changed');
        field('description', 'text.changed');
        if (bf.format !== af.format) {
            add('file.format-changed', `${at}/format`, { before: bf.format, after: af.format });
            continue;
        }
        if (af.format === 'json')
            required(bf.mustContain, af.mustContain, `${at}/mustContain`, add);
        if (af.format === 'sitemap')
            lines(bf.urls, af.urls, `${at}/urls`, add);
        if (af.format === 'text')
            lines(bf.lines, af.lines, `${at}/lines`, add);
        if (af.format === 'csv')
            csv(bf, af, at, add);
    }
    (0, own_1.exampleChanges)(before, after, ctx, add);
    return (0, schema_diff_1.strictestPerPath)(out);
}
function required(b, a, at, add) {
    if ((0, model_1.sameJson)(b, a))
        return;
    if (b === undefined)
        return add('content.required-added', at, { after: a });
    if (a === undefined)
        return add('content.required-removed', at, { before: b });
    if ((0, model_1.isObject)(b) && (0, model_1.isObject)(a)) {
        for (const k of Object.keys(b).sort())
            if (!(k in a))
                add('content.required-removed', `${at}/${(0, model_1.esc)(k)}`, { before: b[k] });
        for (const k of Object.keys(a).sort())
            if (k in b)
                required(b[k], a[k], `${at}/${(0, model_1.esc)(k)}`, add);
            else
                add('content.required-added', `${at}/${(0, model_1.esc)(k)}`, { after: a[k] });
        return;
    }
    if (Array.isArray(b) && Array.isArray(a)) {
        b.forEach((e, i) => !a.some((x) => !subsetProblems(e, x).length) && add('content.required-removed', `${at}/${i}`, { before: e }));
        a.forEach((e, j) => !b.some((x) => (0, model_1.sameJson)(x, e)) && add('content.required-added', `${at}/${j}`, { after: e }));
        return;
    }
    add('content.required-removed', at, { before: b, after: a });
}
function lines(before, after, at, add) {
    const b = Array.isArray(before) ? before : [];
    const a = Array.isArray(after) ? after : [];
    b.forEach((v, i) => !a.includes(v) && add('content.required-removed', `${at}/${i}`, { before: v }));
    a.forEach((v, j) => !b.includes(v) && add('content.required-added', `${at}/${j}`, { after: v }));
}
function csv(bf, af, at, add) {
    const b = csvSpec(bf);
    const a = csvSpec(af);
    if (b.delimiter !== a.delimiter)
        add('csv.delimiter-changed', `${at}/delimiter`, { before: b.delimiter, after: a.delimiter });
    if (b.header !== a.header)
        add('csv.header-changed', `${at}/header`, { before: b.header, after: a.header });
    if (b.ordered !== a.ordered)
        add('csv.ordered-changed', `${at}/ordered`, { before: b.ordered, after: a.ordered, compat: a.ordered ? C : R });
    const renamedB = new Set();
    const renamedA = new Set();
    for (let i = 0; i < Math.min(b.columns.length, a.columns.length); i++) {
        if (!a.columns.includes(b.columns[i]) && !b.columns.includes(a.columns[i])) {
            renamedB.add(i);
            renamedA.add(i);
            add('csv.column-renamed', `${at}/columns/${i}`, { before: b.columns[i], after: a.columns[i] });
        }
    }
    b.columns.forEach((c, i) => !renamedB.has(i) && !a.columns.includes(c) && add('csv.column-removed', `${at}/columns/${i}`, { before: c }));
    const kept = a.columns.map((c, j) => (b.columns.includes(c) ? j : -1)).filter((j) => j >= 0);
    const lastKept = kept.length ? Math.max(...kept) : -1;
    a.columns.forEach((c, j) => {
        if (renamedA.has(j) || b.columns.includes(c))
            return;
        add(a.ordered && j < lastKept ? 'csv.column-inserted' : 'csv.column-appended', `${at}/columns/${j}`, { after: c });
    });
    if (b.ordered && a.ordered) {
        const bOrder = b.columns.filter((c) => a.columns.includes(c));
        const aOrder = a.columns.filter((c) => b.columns.includes(c));
        if (!(0, model_1.sameJson)(bOrder, aOrder))
            add('csv.column-moved', `${at}/columns`, { before: bOrder, after: aOrder });
    }
}
//# sourceMappingURL=published-file.js.map
  },
  "types/routes": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const routes_1 = __mod("routes");
exports.routes = {
    id: 'routes',
    rules: routes_1.ROUTES_RULES,
    ownFormat: true,
    validatePart: routes_1.validateRoutes,
    count: routes_1.countRoutes,
    diff: routes_1.diffRoutes,
};
//# sourceMappingURL=routes.js.map
  },
  "routes": function (exports, module) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ROUTES = exports.PLATFORMS = exports.ROUTES_RULES = void 0;
exports.patternSegments = patternSegments;
exports.matchPattern = matchPattern;
exports.countRoutes = countRoutes;
exports.validateRoutes = validateRoutes;
exports.diffRoutes = diffRoutes;
const model_1 = __mod("model");
const openapi_diff_1 = __mod("openapi-diff");
const own_1 = __mod("own");
const schema_diff_1 = __mod("schema-diff");
const shapes_1 = __mod("shapes");
const R = 'ROMPE';
const C = 'COMPATIBLE';
exports.ROUTES_RULES = {
    'route.removed': R,
    'route.pattern-changed': R,
    'route.target-changed': R,
    'param.type-changed': R,
    'param.constraint.tightened': R,
    'host.removed': R,
    'platform.removed': R,
    'query.added-required': R,
    'query.removed': R,
    'query.optional-to-required': R,
    'unsupported.changed': R,
    'route.added': C,
    'host.added': C,
    'platform.added': C,
    'query.added-optional': C,
    'query.required-to-optional': C,
    'param.constraint.loosened': C,
    ...own_1.OWN_COMMON_RULES,
};
exports.PLATFORMS = ['ios', 'android', 'web'];
exports.MAX_ROUTES = 100;
const MAX_HOSTS = 20;
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;
const ROUTE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LITERAL = /^[A-Za-z0-9._~!$&'()*+,;=:@%-]+$/;
const PLACEHOLDER = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const QUERY_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const PART_KEYS = new Set(['id', 'type', 'description', 'hosts', 'routes']);
const ROUTE_KEYS = new Set(['id', 'pattern', 'description', 'params', 'query', 'requiredQuery', 'target', 'platforms']);
const EXAMPLE_KEYS = new Set(['id', 'part', 'description', 'url', 'expect']);
const known = (obj, keys) => Object.keys(obj).filter((k) => !keys.has(k) && !k.startsWith('x-'));
function patternSegments(pattern) {
    if (typeof pattern !== 'string' || !pattern.startsWith('/') || pattern.length > 300)
        return undefined;
    if (pattern === '/')
        return [];
    const out = [];
    for (const seg of pattern.slice(1).split('/')) {
        const m = PLACEHOLDER.exec(seg);
        if (m)
            out.push({ param: m[1] });
        else if (LITERAL.test(seg) && !seg.includes('{') && !seg.includes('}'))
            out.push({ literal: seg });
        else
            return undefined;
    }
    return out;
}
function matchPattern(segs, path) {
    const parts = path === '/' ? [] : path.slice(1).split('/');
    if (parts.length !== segs.length)
        return undefined;
    const params = {};
    for (let i = 0; i < segs.length; i++) {
        if (segs[i].literal !== undefined) {
            if (segs[i].literal !== parts[i])
                return undefined;
        }
        else {
            if (!parts[i])
                return undefined;
            try {
                params[segs[i].param] = decodeURIComponent(parts[i]);
            }
            catch {
                return undefined;
            }
        }
    }
    return params;
}
const routesOf = (part) => (Array.isArray(part.routes) ? part.routes.filter(model_1.isObject) : []);
function countRoutes(part, doc) {
    return { operations: routesOf(part).length, examples: (0, own_1.partExamples)(doc, part.id).length };
}
function validateRoutes(part, at, doc) {
    const out = [];
    const resolve = (0, own_1.shapesResolver)(doc);
    for (const k of known(part, PART_KEYS))
        out.push((0, model_1.issue)(`${at}/${(0, model_1.esc)(k)}`, 'part.key-unknown', `«${k}» no es una clave de una parte routes`));
    if (part.description !== undefined && !(0, own_1.text)(part.description, 500))
        out.push((0, model_1.issue)(`${at}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
    const hosts = Array.isArray(part.hosts) ? part.hosts : undefined;
    if (!hosts || !hosts.length || hosts.length > MAX_HOSTS)
        out.push((0, model_1.issue)(`${at}/hosts`, 'routes.hosts-invalid', `hosts es una lista de 1 a ${MAX_HOSTS} dominios`));
    else {
        const seen = new Set();
        hosts.forEach((h, i) => {
            if (typeof h !== 'string' || !HOST.test(h))
                out.push((0, model_1.issue)(`${at}/hosts/${i}`, 'routes.host-invalid', 'Cada host es un dominio en minúsculas, sin esquema ni ruta (envios.example)'));
            else if (seen.has(h))
                out.push((0, model_1.issue)(`${at}/hosts/${i}`, 'routes.host-duplicate', `El host ${h} está repetido`));
            else
                seen.add(h);
        });
    }
    if (!Array.isArray(part.routes) || !part.routes.length) {
        out.push((0, model_1.issue)(`${at}/routes`, 'routes.invalid', 'routes debe tener al menos una ruta'));
        return out;
    }
    if (part.routes.length > exports.MAX_ROUTES)
        out.push((0, model_1.issue)(`${at}/routes`, 'doc.too-many-operations', `Una parte admite hasta ${exports.MAX_ROUTES} rutas`));
    const ids = new Set();
    const shapesOfPatterns = new Map();
    part.routes.forEach((r, i) => {
        const rAt = `${at}/routes/${i}`;
        if (!(0, model_1.isObject)(r)) {
            out.push((0, model_1.issue)(rAt, 'routes.invalid', 'Cada ruta debe ser un objeto'));
            return;
        }
        for (const k of known(r, ROUTE_KEYS))
            out.push((0, model_1.issue)(`${rAt}/${(0, model_1.esc)(k)}`, 'route.key-unknown', `«${k}» no es una clave de una ruta`));
        if (typeof r.id !== 'string' || !ROUTE_ID.test(r.id))
            out.push((0, model_1.issue)(`${rAt}/id`, 'route.id-invalid', 'El id de la ruta tiene hasta 64 caracteres en minúsculas, números y guiones'));
        else if (ids.has(r.id))
            out.push((0, model_1.issue)(`${rAt}/id`, 'route.id-duplicate', `El id de ruta «${r.id}» está repetido`));
        else
            ids.add(r.id);
        if (r.description !== undefined && !(0, own_1.text)(r.description, 500))
            out.push((0, model_1.issue)(`${rAt}/description`, 'text.invalid', 'description tiene hasta 500 caracteres'));
        if (!(0, own_1.text)(r.target, 120))
            out.push((0, model_1.issue)(`${rAt}/target`, 'route.target-invalid', 'target es la pantalla o vista que abre la ruta, hasta 120 caracteres'));
        const platforms = Array.isArray(r.platforms) ? r.platforms : undefined;
        if (!platforms || !platforms.length || platforms.some((p) => !exports.PLATFORMS.includes(p)) || new Set(platforms).size !== platforms.length) {
            out.push((0, model_1.issue)(`${rAt}/platforms`, 'route.platforms-invalid', `platforms es una lista sin repetidos de ${exports.PLATFORMS.join(', ')}`));
        }
        const segs = patternSegments(r.pattern);
        const names = (segs ?? []).filter((s) => s.param).map((s) => s.param);
        if (!segs)
            out.push((0, model_1.issue)(`${rAt}/pattern`, 'route.pattern-invalid', 'pattern empieza con / y tiene segmentos literales o {parametro}'));
        else if (new Set(names).size !== names.length)
            out.push((0, model_1.issue)(`${rAt}/pattern`, 'route.pattern-invalid', 'Un parámetro aparece dos veces en el patrón'));
        else {
            const shape = '/' + segs.map((s) => (s.param ? '{}' : s.literal)).join('/');
            const other = shapesOfPatterns.get(shape);
            if (other !== undefined)
                out.push((0, model_1.issue)(`${rAt}/pattern`, 'route.pattern-duplicate', `El patrón calza con las mismas rutas que ${other}`));
            else
                shapesOfPatterns.set(shape, String(r.pattern));
        }
        if (r.params !== undefined && !(0, model_1.isObject)(r.params))
            out.push((0, model_1.issue)(`${rAt}/params`, 'route.params-invalid', 'params es un objeto con la forma de cada parámetro de la ruta'));
        const params = (0, model_1.isObject)(r.params) ? r.params : {};
        for (const n of names)
            if (!(n in params))
                out.push((0, model_1.issue)(`${rAt}/params`, 'route.param-missing', `Falta la forma del parámetro «${n}»`));
        for (const n of Object.keys(params)) {
            if (!names.includes(n))
                out.push((0, model_1.issue)(`${rAt}/params/${(0, model_1.esc)(n)}`, 'route.param-unknown', `«${n}» no aparece en el patrón`));
            else
                (0, shapes_1.checkShape)(params[n], `${rAt}/params/${(0, model_1.esc)(n)}`, resolve, out);
        }
        if (r.query !== undefined && !(0, model_1.isObject)(r.query))
            out.push((0, model_1.issue)(`${rAt}/query`, 'route.query-invalid', 'query es un objeto con la forma de cada parámetro de query'));
        const query = (0, model_1.isObject)(r.query) ? r.query : {};
        for (const q of Object.keys(query)) {
            if (!QUERY_NAME.test(q))
                out.push((0, model_1.issue)(`${rAt}/query/${(0, model_1.esc)(q)}`, 'route.query-invalid', 'El nombre de un parámetro de query tiene hasta 64 letras, números, puntos, guiones o guiones bajos'));
            (0, shapes_1.checkShape)(query[q], `${rAt}/query/${(0, model_1.esc)(q)}`, resolve, out);
        }
        if (r.requiredQuery !== undefined) {
            const req = Array.isArray(r.requiredQuery) ? r.requiredQuery : undefined;
            if (!req || req.some((q) => typeof q !== 'string' || !(q in query)) || new Set(req).size !== req.length) {
                out.push((0, model_1.issue)(`${rAt}/requiredQuery`, 'route.query-invalid', 'requiredQuery es una lista sin repetidos de parámetros declarados en query'));
            }
        }
    });
    validateExamples(part, at, doc, resolve, out);
    return out;
}
function coerce(schema, raw, resolve) {
    const s = (0, schema_diff_1.follow)(schema, '', resolve).schema;
    const types = (0, model_1.isObject)(s) ? (Array.isArray(s.type) ? s.type : [s.type]) : [];
    if (types.includes('string'))
        return raw;
    if (types.includes('integer') && /^-?\d+$/.test(raw))
        return Number(raw);
    if (types.includes('number') && raw.trim() !== '' && !isNaN(Number(raw)))
        return Number(raw);
    if (types.includes('boolean') && (raw === 'true' || raw === 'false'))
        return raw === 'true';
    return raw;
}
function validateExamples(part, at, doc, resolve, out) {
    const routes = routesOf(part);
    const hosts = Array.isArray(part.hosts) ? part.hosts : [];
    const covered = new Set();
    for (const { ex, at: eAt } of (0, own_1.partExamples)(doc, part.id)) {
        for (const k of known(ex, EXAMPLE_KEYS))
            out.push((0, model_1.issue)(`${eAt}/${(0, model_1.esc)(k)}`, 'example.key-unknown', `«${k}» no es una clave de un ejemplo de rutas`));
        let url;
        try {
            if (typeof ex.url !== 'string')
                throw new Error();
            url = new URL(ex.url);
            if (!['http:', 'https:'].includes(url.protocol))
                throw new Error();
        }
        catch {
            out.push((0, model_1.issue)(`${eAt}/url`, 'example.url-invalid', 'url es una URL completa con https:// o http://'));
            continue;
        }
        if (!hosts.includes(url.host))
            out.push((0, model_1.issue)(`${eAt}/url`, 'example.host-unknown', `El host ${url.host} no está en hosts`));
        const matches = [];
        for (const r of routes) {
            const segs = patternSegments(r.pattern);
            const params = segs && matchPattern(segs, url.pathname);
            if (params)
                matches.push({ route: r, params });
        }
        if (!matches.length) {
            out.push((0, model_1.issue)(`${eAt}/url`, 'example.route-none', `La ruta ${url.pathname} no calza con ninguna ruta`));
            continue;
        }
        if (matches.length > 1) {
            out.push((0, model_1.issue)(`${eAt}/url`, 'example.route-ambiguous', `La ruta ${url.pathname} calza con más de una ruta (${matches.map((m) => m.route.id).join(', ')})`));
            continue;
        }
        const { route, params } = matches[0];
        covered.add(route.id);
        const problems = [];
        const shapes = (0, model_1.isObject)(route.params) ? route.params : {};
        const extracted = {};
        for (const n of Object.keys(params).sort()) {
            extracted[n] = params[n];
            if (n in shapes)
                (0, shapes_1.checkValue)(shapes[n], coerce(shapes[n], params[n], resolve), `${eAt}/url`, resolve, problems);
        }
        const query = (0, model_1.isObject)(route.query) ? route.query : {};
        for (const q of Object.keys(query).sort()) {
            const raw = url.searchParams.get(q);
            if (raw === null)
                continue;
            extracted[q] = raw;
            (0, shapes_1.checkValue)(query[q], coerce(query[q], raw, resolve), `${eAt}/url`, resolve, problems);
        }
        for (const p of problems)
            out.push((0, model_1.issue)(p.path, 'example.invalid', p.message));
        for (const q of Array.isArray(route.requiredQuery) ? route.requiredQuery : []) {
            if (!url.searchParams.has(q))
                out.push((0, model_1.issue)(`${eAt}/url`, 'example.query-missing', `Falta el parámetro de query obligatorio «${q}»`));
        }
        if (!(0, model_1.isObject)(ex.expect)) {
            out.push((0, model_1.issue)(`${eAt}/expect`, 'example.expect-invalid', 'expect es { route, params } con lo que la app debe abrir'));
            continue;
        }
        if (ex.expect.route !== route.id)
            out.push((0, model_1.issue)(`${eAt}/expect/route`, 'example.route-mismatch', `La URL abre la ruta ${route.id}`));
        if (!(0, model_1.isObject)(ex.expect.params) || !(0, model_1.sameJson)(ex.expect.params, extracted)) {
            out.push((0, model_1.issue)(`${eAt}/expect/params`, 'example.params-mismatch', `Los parámetros de la URL son ${JSON.stringify(extracted)}`));
        }
    }
    part.routes.forEach((r, i) => {
        if ((0, model_1.isObject)(r) && typeof r.id === 'string' && !covered.has(r.id))
            out.push((0, model_1.issue)(`${at}/routes/${i}`, 'example.missing', `La ruta ${r.id} necesita al menos un ejemplo`));
    });
}
function diffRoutes(before, after, ctx) {
    const out = [];
    const add = (rule, path, extra = {}) => {
        const { compat, ...values } = extra;
        out.push({ rule, part: after.id, path, ...values, compat: compat ?? exports.ROUTES_RULES[rule] });
    };
    const params = (rule, path, extra = {}) => {
        const { compat, ...values } = extra;
        if (rule === 'type.changed')
            return add('param.type-changed', path, values);
        if (rule === 'unsupported.changed')
            return add('unsupported.changed', path, values);
        add((compat ?? openapi_diff_1.HTTP_API_RULES[rule]) === R ? 'param.constraint.tightened' : 'param.constraint.loosened', path, values);
    };
    const sd = new schema_diff_1.SchemaDiff((0, own_1.shapesResolver)(ctx.before), (0, own_1.shapesResolver)(ctx.after), params);
    setDiff(before.hosts, after.hosts, '/hosts', 'host', add);
    textField(before, after, '/description', add);
    const b = (0, own_1.byId)(before.routes);
    const a = (0, own_1.byId)(after.routes);
    for (const [id, r] of b)
        if (!a.has(id))
            add('route.removed', (0, own_1.ptr)('routes', r.i), { before: id });
    for (const [id, r] of a) {
        const old = b.get(id);
        const at = (0, own_1.ptr)('routes', r.i);
        if (!old) {
            add('route.added', at, { after: id });
            continue;
        }
        const bv = old.v;
        const av = r.v;
        if (bv.pattern !== av.pattern)
            add('route.pattern-changed', `${at}/pattern`, { before: bv.pattern, after: av.pattern });
        if (bv.target !== av.target)
            add('route.target-changed', `${at}/target`, { before: bv.target, after: av.target });
        setDiff(bv.platforms, av.platforms, `${at}/platforms`, 'platform', add);
        textField(bv, av, `${at}/description`, add);
        const bp = (0, model_1.isObject)(bv.params) ? bv.params : {};
        const ap = (0, model_1.isObject)(av.params) ? av.params : {};
        for (const n of Object.keys(ap).sort())
            if (n in bp)
                sd.schema(bp[n], ap[n], 'request', `${(0, own_1.ptr)('routes', old.i, 'params', n)}`, `${at}${(0, own_1.ptr)('params', n)}`);
        const bq = (0, model_1.isObject)(bv.query) ? bv.query : {};
        const aq = (0, model_1.isObject)(av.query) ? av.query : {};
        const breq = new Set(Array.isArray(bv.requiredQuery) ? bv.requiredQuery : []);
        const areq = new Set(Array.isArray(av.requiredQuery) ? av.requiredQuery : []);
        for (const q of Object.keys(bq).sort())
            if (!(q in aq))
                add('query.removed', `${at}${(0, own_1.ptr)('query', q)}`, { before: q });
        for (const q of Object.keys(aq).sort()) {
            const qAt = `${at}${(0, own_1.ptr)('query', q)}`;
            if (!(q in bq)) {
                add(areq.has(q) ? 'query.added-required' : 'query.added-optional', qAt, { after: q });
                continue;
            }
            if (breq.has(q) && !areq.has(q))
                add('query.required-to-optional', qAt);
            if (!breq.has(q) && areq.has(q))
                add('query.optional-to-required', qAt);
            sd.schema(bq[q], aq[q], 'request', `${(0, own_1.ptr)('routes', old.i, 'query', q)}`, qAt);
        }
    }
    (0, own_1.exampleChanges)(before, after, ctx, add);
    return (0, schema_diff_1.strictestPerPath)(out);
}
function setDiff(before, after, at, what, add) {
    const b = Array.isArray(before) ? before : [];
    const a = Array.isArray(after) ? after : [];
    b.forEach((v, i) => !a.includes(v) && add(`${what}.removed`, `${at}/${i}`, { before: v }));
    a.forEach((v, i) => !b.includes(v) && add(`${what}.added`, `${at}/${i}`, { after: v }));
}
function textField(before, after, at, add) {
    const key = at.slice(at.lastIndexOf('/') + 1);
    if (before[key] !== after[key])
        add('text.changed', at, { before: before[key], after: after[key] });
}
//# sourceMappingURL=routes.js.map
  },
};
const __cache = {};
function __mod(id) {
  if (!__cache[id]) { const module = { exports: {} }; __cache[id] = module; __defs[id](module.exports, module); }
  return __cache[id].exports;
}
const { validateContract } = __mod('validate');
const args = process.argv.slice(2);
const provider = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : undefined;
const files = args.filter((a, i) => a !== '--provider' && args[i - 1] !== '--provider');
if (!files.length) {
  console.error('Uso: node ' + CONTRACT_LINT_PATH + ' openspec/changes/<id-del-cambio>/contracts/*.contract.json [--provider <sistema>]');
  process.exit(2);
}
const FILE = /^([a-z0-9][a-z0-9-]{2,62})\.contract\.json$/;
let errors = 0;
for (const file of files) {
  const name = basename(file);
  const say = (sev, path, message) => { if (sev === 'error') errors++; console.log((sev === 'error' ? 'ERROR ' : 'info  ') + file + ' ' + (path || '/') + ': ' + message); };
  const m = FILE.exec(name);
  if (!m) { say('error', '', 'el archivo debe llamarse <slug>.contract.json (slug en minúsculas, números y guiones): la plataforma no lee otro nombre'); continue; }
  let doc;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch { say('error', '', 'El archivo no es JSON válido'); continue; }
  const v = validateContract(doc);
  for (const i of v.issues) say(i.severity, i.path, i.message);
  if (v.ok && doc.slug !== m[1]) say('error', '/slug', 'El slug del documento debe ser ' + m[1] + ', como el nombre del archivo');
  if (v.ok && provider !== undefined && doc.provider.system !== provider) say('error', '/provider/system', 'provider.system debe ser ' + provider);
}
console.log(errors ? 'contracts: ' + errors + ' error(es): corrígelos y vuelve a correr; no abras el PR con un contrato que no pasa' : 'contracts: OK (' + files.length + ' archivo(s))');
process.exit(errors ? 1 : 0);
