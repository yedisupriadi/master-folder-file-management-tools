import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const errors = [];
const notes = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

const htmlFiles = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .sort()
  .map((name) => path.join(root, name));

if (htmlFiles.length === 0) fail('.', 'no root HTML files found');

for (const file of htmlFiles) {
  const name = relative(file);
  const source = fs.readFileSync(file, 'utf8');

  const requiredPatterns = [
    [/^<!doctype html>/i, 'missing HTML5 doctype'],
    [/<html\b[^>]*\blang=["'][^"']+["']/i, 'missing html lang attribute'],
    [/<meta\b[^>]*charset=["']?utf-8/i, 'missing UTF-8 charset'],
    [/<meta\b[^>]*name=["']viewport["']/i, 'missing viewport metadata'],
    [/<meta\b[^>]*name=["']description["']/i, 'missing page description'],
    [/<title>[^<]+<\/title>/i, 'missing page title'],
  ];
  for (const [pattern, message] of requiredPatterns) {
    if (!pattern.test(source)) fail(name, message);
  }

  const ids = [...source.matchAll(/\bid=(["'])([^"']+)\1/gi)].map((match) => match[2]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(name, `duplicate id "${id}"`);
    seen.add(id);
  }

  const idReferences = [
    ...source.matchAll(/\bgetElementById\(\s*(["'])([^"']+)\1\s*\)/g),
    ...source.matchAll(/(?:^|[^\w$])\$\(\s*(["'])([^"']+)\1\s*\)/gm),
  ];
  for (const match of idReferences) {
    if (!seen.has(match[2])) fail(name, `script references missing id "${match[2]}"`);
  }

  let scriptCount = 0;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    scriptCount += 1;
    try {
      new vm.Script(match[2], { filename: `${name}#inline-script-${scriptCount}` });
    } catch (error) {
      fail(name, `invalid inline JavaScript (${error.message})`);
    }
  }

  const localTargets = [
    ...source.matchAll(/\b(?:href|src)=(["'])([^"']+)\1/gi),
    ...source.matchAll(/\bhref\s*:\s*(["'])([^"']+\.html(?:[?#][^"']*)?)\1/g),
  ];
  for (const match of localTargets) {
    const target = match[2];
    if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) continue;
    const cleanTarget = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    if (!cleanTarget) continue;
    const resolved = path.resolve(path.dirname(file), cleanTarget);
    if (!fs.existsSync(resolved)) fail(name, `broken local link "${target}"`);
  }

  notes.push(`${name}: ${scriptCount} inline script block(s), ${ids.length} unique id(s)`);
}

const markdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  path.join('notion-proxy', 'README.md'),
].map((name) => path.join(root, name)).filter(fs.existsSync);

for (const file of markdownFiles) {
  const name = relative(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) continue;
    const cleanTarget = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    if (!cleanTarget) continue;
    const resolved = path.resolve(path.dirname(file), cleanTarget);
    if (!fs.existsSync(resolved)) fail(name, `broken local link "${target}"`);
  }
}
notes.push(`${markdownFiles.length} Markdown file(s): local links valid`);

const workerPath = path.join(root, 'notion-proxy', 'worker.js');
if (fs.existsSync(workerPath)) {
  const workerSource = fs.readFileSync(workerPath, 'utf8')
    .replace(/^export\s+default\s+/m, 'const __workerDefaultExport = ');
  try {
    new vm.Script(workerSource, { filename: relative(workerPath) });
    notes.push('notion-proxy/worker.js: JavaScript syntax valid');
  } catch (error) {
    fail(relative(workerPath), `invalid JavaScript (${error.message})`);
  }
} else {
  fail('notion-proxy/worker.js', 'required Worker entrypoint is missing');
}

for (const required of ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md']) {
  if (!fs.existsSync(path.join(root, required))) fail(required, 'required repository file is missing');
}

const secretPatterns = [
  ['Notion secret', /\b(?:ntn_|secret_)[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token', /\bgh[psuro]_[A-Za-z0-9]{30,}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const scannedFiles = [...htmlFiles, ...markdownFiles, workerPath, path.join(root, 'notion-proxy', 'wrangler.toml')]
  .filter(fs.existsSync);
for (const file of new Set(scannedFiles)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) fail(relative(file), `possible committed ${label}`);
  }
}
notes.push(`${new Set(scannedFiles).size} source/documentation file(s): no credential signatures found`);

for (const note of notes) console.log(`✓ ${note}`);

if (errors.length > 0) {
  console.error(`\nValidation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`\nValidation passed for ${htmlFiles.length} HTML page(s) and the Notion Worker.`);
}
