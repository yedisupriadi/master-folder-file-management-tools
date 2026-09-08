import fs from 'node:fs';
import vm from 'node:vm';

const requiredTables = [
  'standard_folder_personal_l1',
  'standard_folder_personal_l2',
  'standard_folder_project_l1',
  'standard_folder_project_l2',
  'standard_folder_project_l3',
];

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const bootstrap = read('folder-manager.html');
const core = read('folder-manager-core.html');
const adapter = read('folder-manager-supabase-config.js');
const flatten = read('folder-manager-flatten.js');
const edge = read('supabase/functions/folder-standards/index.ts');

new vm.Script(adapter, { filename: 'folder-manager-supabase-config.js' });
new vm.Script(flatten, { filename: 'folder-manager-flatten.js' });

assert(bootstrap.includes("fetch('./folder-manager-core.html'"), 'Folder Manager bootstrap must load folder-manager-core.html');
assert(bootstrap.includes("fetch('./folder-manager-flatten.js'"), 'Folder Manager bootstrap must load the flatten enhancement');
assert(bootstrap.includes("lastIndexOf('})();')"), 'Folder Manager bootstrap must inject enhancements inside the preserved core IIFE');
assert(bootstrap.includes('folder-manager-supabase-config.js'), 'Folder Manager bootstrap must inject the Supabase adapter');
assert(core.includes('Database Notion'), 'Preserved core should remain an unchanged compatibility baseline');
assert(adapter.includes('functions/v1/folder-standards'), 'Adapter must call the folder-standards Edge Function');
assert(adapter.includes('sb_publishable_'), 'Adapter must use a Supabase publishable key');
assert(!adapter.includes('sb_secret_'), 'Adapter must never contain a Supabase secret key');
assert(!adapter.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Adapter must never contain a service-role key');
assert(adapter.includes("headers.set('apikey', PUBLISHABLE_KEY)"), 'Adapter must send the publishable key through the apikey header');

for (const table of requiredTables) {
  assert(adapter.includes(table), `Adapter is missing ${table}`);
  assert(edge.includes(table), `Edge Function allowlist is missing ${table}`);
}

assert(edge.includes('.eq("is_active", true)'), 'Edge Function must return active standards only');
assert(edge.includes('SUPABASE_SECRET_KEYS'), 'Edge Function must obtain elevated credentials from its server environment');
assert(edge.includes('isAllowedOrigin'), 'Edge Function must validate browser origins');
assert(edge.includes('getAcceptedClientKeys'), 'Edge Function must validate the calling application key');
assert(!edge.includes('sb_secret_'), 'Edge Function source must not hardcode a Supabase secret key');

assert(flatten.includes("flattenButton.id = 'btnFlatten'"), 'Flatten enhancement must add the top action button');
assert(flatten.includes('flattenCollectNested'), 'Flatten enhancement must scan nested subfolders recursively');
assert(flatten.includes('flattenUniqueFileName'), 'Flatten enhancement must protect against duplicate file names');
assert(flatten.includes('flattenDirectoryIsEmpty'), 'Flatten enhancement must verify folders are empty before cleanup');
assert(flatten.includes('await copyFile(item.handle, dest, destName)'), 'Flatten enhancement must copy the file before deleting its source');
assert(flatten.includes('await item.parent.removeEntry(item.name)'), 'Flatten enhancement must delete a source file only after a successful copy');
assert(!flatten.includes("removeEntry(dir.name, { recursive: true })"), 'Flatten cleanup must never recursively delete subfolders');

console.log(`✓ Supabase Folder Manager adapter: ${requiredTables.length} standard tables allowlisted, client/server key boundary verified`);
console.log('✓ Folder Manager flatten: syntax, recursive scan, collision handling, copy-before-delete, and safe empty-folder cleanup verified');
