import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');

function fakeElement(id = '') {
  return {
    id,
    value: '',
    checked: false,
    disabled: false,
    textContent: '',
    className: '',
    dataset: {},
    style: {},
    files: [],
    children: [],
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    remove() {},
    focus() {},
    select() {},
    click() {},
    setAttribute() {},
  };
}

function loadTool(fileName, exportName) {
  const html = fs.readFileSync(path.join(root, fileName), 'utf8');
  assert.equal(/\bTGM\b|trigammametri/i.test(html), false, `${fileName} must not contain TGM branding or private example domains`);

  const scriptMatches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scriptMatches.length, 1, `${fileName} should contain one inline application script`);

  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, fakeElement(id));
    return elements.get(id);
  };
  const spaces = fakeElement('spaceModeSpaces');
  spaces.value = 'spaces';
  spaces.checked = true;
  const pct20 = fakeElement('spaceModePct20');
  pct20.value = 'pct20';

  const document = {
    documentElement: { lang: 'id', dataset: {} },
    body: fakeElement('body'),
    head: fakeElement('head'),
    getElementById: getElement,
    querySelector(selector) {
      if (selector === 'input[name="spaceMode"]:checked') return pct20.checked ? pct20 : spaces;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'input[name="spaceMode"]') return [spaces, pct20];
      return [];
    },
    createElement: tag => {
      const element = fakeElement(tag);
      if (tag === 'canvas') {
        element.getContext = () => ({
          drawImage() {}, fillRect() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {},
        });
        element.toDataURL = () => 'data:image/png;base64,';
      }
      return element;
    },
    addEventListener() {},
    execCommand: () => true,
  };

  const makeStorage = () => {
    const data = new Map();
    return {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: key => data.delete(key),
    };
  };
  const window = {};
  const context = vm.createContext({
    window,
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    location: { href: '' },
    URL,
    Blob,
    Image: class {},
    Uint8Array,
    Uint8ClampedArray,
    setTimeout: () => 0,
    clearTimeout() {},
    console,
  });
  vm.runInContext(scriptMatches[0][1], context, { filename: fileName });
  assert.ok(window[exportName], `${fileName} did not expose ${exportName}`);
  return { api: window[exportName], spaces, pct20 };
}

const cleaner = loadTool('sharepoint-link-cleaner.html', 'SharePointLinkCleaner');
const rawSharingLink = 'https://contoso.sharepoint.com/:x:/r/sites/Project/Shared%20Documents/Reports/Status%20Report.xlsx?d=abc&web=1';
assert.equal(
  cleaner.api.normalizeSharePointUrl(rawSharingLink, 'spaces'),
  'https://contoso.sharepoint.com/sites/Project/Shared Documents/Reports/Status Report.xlsx',
);
assert.equal(
  cleaner.api.normalizeSharePointUrl(rawSharingLink, 'pct20'),
  'https://contoso.sharepoint.com/sites/Project/Shared%20Documents/Reports/Status%20Report.xlsx',
);
assert.equal(
  cleaner.api.folderFromFileUrl('https://contoso.sharepoint.com/sites/Project/Reports/Status.xlsx'),
  'https://contoso.sharepoint.com/sites/Project/Reports',
);
assert.equal(cleaner.api.normalizeSharePointUrl('ftp://example.com/file.pdf', 'pct20'), '');

const builder = loadTool('sharepoint-url-builder.html', 'SharePointUrlBuilder');
assert.equal(
  builder.api.ensureFolderUrl('https://contoso.sharepoint.com/sites/Project/Shared%20Documents/Reports/?web=1'),
  'https://contoso.sharepoint.com/sites/Project/Shared Documents/Reports/',
);
assert.equal(builder.api.cleanFileName('El IMG_0341, jpeg'), 'IMG_0341.jpeg');
assert.deepEqual(
  Array.from(builder.api.smartExtractFileNames('Name\nEl IMG_0341, jpeg\nStatus Report.pdf\nStatus Report.pdf')),
  ['IMG_0341.jpeg', 'Status Report.pdf'],
);
assert.equal(
  builder.api.buildFileUrl('https://contoso.sharepoint.com/sites/Project/Reports/', 'Drawing #12.pdf'),
  'https://contoso.sharepoint.com/sites/Project/Reports/Drawing %2312.pdf',
);
builder.spaces.checked = false;
builder.pct20.checked = true;
assert.equal(
  builder.api.buildFileUrl('https://contoso.sharepoint.com/sites/Project/Reports/', 'Status Report.xlsx'),
  'https://contoso.sharepoint.com/sites/Project/Reports/Status%20Report.xlsx',
);

console.log('✓ SharePoint Link Cleaner URL normalization and folder extraction');
console.log('✓ URL Builder filename cleanup, OCR extraction, encoding, and space modes');
console.log('2 SharePoint tool behavior groups passed.');
