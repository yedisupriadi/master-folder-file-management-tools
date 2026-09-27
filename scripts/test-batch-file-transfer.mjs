import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('batch-file-transfer-core.js','utf8');
const context = vm.createContext({ window:{}, URL, Blob });
new vm.Script(source,{filename:'batch-file-transfer-core.js'}).runInContext(context);
const Core = context.window.BatchFileTransferCore;

assert.equal(Core.normalizeWindowsPath('  "C:/YDS/Root/Sub/File.pdf"  '), 'C:\\YDS\\Root\\Sub\\File.pdf');
assert.deepEqual(
  JSON.parse(JSON.stringify(Core.relativePartsForRoot('C:\\YDS\\Root\\Sub\\File.pdf','Root'))),
  ['Sub','File.pdf']
);
assert.equal(Core.fileNameFromPath('C:\\YDS\\Root\\Sub\\File.pdf'),'File.pdf');
assert.equal(Core.collisionName('Drawing.pdf',2),'Drawing (2).pdf');
assert.equal(Core.collisionName('README',3),'README (3)');

const parsed = Core.parseRows('C:\\Root\\A.pdf\nfoo\tC:\\Root\\B.pdf\tbar\nC:\\Root\\A.pdf');
assert.equal(parsed.length,3);
assert.equal(parsed[1].path,'C:\\Root\\B.pdf');
assert.equal(parsed[2].duplicate,true);
console.log('✓ Parse Excel rows, normalize Windows paths, and flag duplicates');

function notFound(){ const e=new Error('Not found'); e.name='NotFoundError'; return e; }

function makeFile(name, text='content') {
  let blob = new Blob([text]);
  return {
    kind:'file', name,
    async getFile(){ return blob; },
    _set(next){ blob = next instanceof Blob ? next : new Blob([String(next)]); }
  };
}

function makeDir(name) {
  const dirs = new Map();
  const files = new Map();
  const dir = {
    kind:'directory', name, dirs, files,
    async getDirectoryHandle(child, options={}) {
      if (dirs.has(child)) return dirs.get(child);
      if (!options.create) throw notFound();
      const created = makeDir(child); dirs.set(child,created); return created;
    },
    async getFileHandle(fileName, options={}) {
      if (files.has(fileName)) return files.get(fileName);
      if (!options.create) throw notFound();
      const handle = makeFile(fileName,'');
      handle.createWritable = async () => ({
        async write(value){ handle._set(value); },
        async close(){},
        async abort(){}
      });
      files.set(fileName,handle);
      return handle;
    },
    async removeEntry(entry) {
      if (files.delete(entry)) return;
      if (dirs.delete(entry)) return;
      throw notFound();
    },
    async isSameEntry(other){ return other === dir; }
  };
  return dir;
}

const root = makeDir('Root');
const sub = makeDir('Sub');
root.dirs.set('Sub',sub);
sub.files.set('A.pdf',makeFile('A.pdf','alpha'));
sub.files.set('B.pdf',makeFile('B.pdf','bravo'));
const target = makeDir('Target');

let out = await Core.transferOne({
  sourceRoot:root,targetDir:target,absolutePath:'C:\\Somewhere\\Root\\Sub\\A.pdf',operation:'copy',collision:'skip'
});
assert.equal(out.status,'copied');
assert.equal(await (await target.files.get('A.pdf').getFile()).text(),'alpha');
assert.equal(sub.files.has('A.pdf'),true);
console.log('✓ Copy writes and verifies the destination without deleting the source');

out = await Core.transferOne({
  sourceRoot:root,targetDir:target,absolutePath:'C:\\Somewhere\\Root\\Sub\\B.pdf',operation:'move',collision:'skip'
});
assert.equal(out.status,'moved');
assert.equal(await (await target.files.get('B.pdf').getFile()).text(),'bravo');
assert.equal(sub.files.has('B.pdf'),false);
console.log('✓ Move deletes the source only after a verified copy');

sub.files.set('A2.pdf',makeFile('A2.pdf','again'));
target.files.set('A2.pdf',makeFile('A2.pdf','old'));
out = await Core.transferOne({
  sourceRoot:root,targetDir:target,absolutePath:'C:\\Somewhere\\Root\\Sub\\A2.pdf',operation:'copy',collision:'rename'
});
assert.equal(out.targetName,'A2 (2).pdf');
assert.equal(await (await target.files.get('A2 (2).pdf').getFile()).text(),'again');
console.log('✓ Rename collision policy preserves the existing destination file');

const failTarget = makeDir('FailTarget');
failTarget.getFileHandle = async (fileName, options={}) => {
  if (!options.create) throw notFound();
  return {
    name:fileName,
    async createWritable(){
      return {
        async write(){ throw new Error('Disk full'); },
        async close(){},
        async abort(){}
      };
    },
    async getFile(){ return new Blob([]); }
  };
};
sub.files.set('Keep.pdf',makeFile('Keep.pdf','keep me'));
await assert.rejects(
  Core.transferOne({
    sourceRoot:root,targetDir:failTarget,absolutePath:'C:\\Somewhere\\Root\\Sub\\Keep.pdf',operation:'move',collision:'overwrite'
  }),
  /Disk full/
);
assert.equal(sub.files.has('Keep.pdf'),true);
console.log('✓ Failed MOVE retains the source file');

console.log('Batch file transfer tests passed.');
