(() => {
  'use strict';

  const FUNCTION_URL = 'https://slqplzovrotfiohcijap.supabase.co/functions/v1/folder-standards';
  const PUBLISHABLE_KEY = 'sb_publishable_T0UcbTPfA7prgfDSv9pH4g_Ficd15vO';
  const TABLES = [
    { id: 'standard_folder_personal_l1', label: 'Personal Folder — Level 1' },
    { id: 'standard_folder_personal_l2', label: 'Personal Folder — Level 2' },
    { id: 'standard_folder_project_l1', label: 'Project Folder — Level 1' },
    { id: 'standard_folder_project_l2', label: 'Project Folder — Level 2' },
    { id: 'standard_folder_project_l3', label: 'Project Folder — Level 3' },
  ];
  const VALID_IDS = new Set(TABLES.map((table) => table.id));

  // The transformed Folder Manager keeps its mature two-panel grid implementation.
  // These localStorage keys are now Supabase-specific because folder-manager.html
  // rewrites the legacy semantic names before the page is executed.
  localStorage.setItem('fm-supabase-url', FUNCTION_URL);
  localStorage.setItem('fm-supabase-key', PUBLISHABLE_KEY);
  localStorage.setItem('fm-supabase-dbs', JSON.stringify(TABLES));

  const lastA = localStorage.getItem('fm-supabase-last-a');
  const lastB = localStorage.getItem('fm-supabase-last-b');
  if (!VALID_IDS.has(lastA || '')) localStorage.setItem('fm-supabase-last-a', 'standard_folder_project_l1');
  if (!VALID_IDS.has(lastB || '')) localStorage.setItem('fm-supabase-last-b', 'standard_folder_project_l2');

  let savedViews = {};
  try { savedViews = JSON.parse(localStorage.getItem('fm-supabase-cfg') || '{}') || {}; } catch {}
  const defaults = {
    standard_folder_personal_l1: { nameCol: 'folder_id', groupCol: '', hidden: [], colW: {}, sort: null },
    standard_folder_personal_l2: { nameCol: 'folder_id', groupCol: 'parent_folder_l1', hidden: [], colW: {}, sort: null },
    standard_folder_project_l1: { nameCol: 'folder_id', groupCol: '', hidden: [], colW: {}, sort: null },
    standard_folder_project_l2: { nameCol: 'folder_id', groupCol: 'parent_folder', hidden: [], colW: {}, sort: null },
    standard_folder_project_l3: { nameCol: 'folder_id', groupCol: 'parent_folder_l2', hidden: [], colW: {}, sort: null },
  };
  let changed = false;
  for (const [id, cfg] of Object.entries(defaults)) {
    if (!savedViews[id]) {
      savedViews[id] = { ...cfg, savedAt: 'default' };
      changed = true;
    }
  }
  if (changed) localStorage.setItem('fm-supabase-cfg', JSON.stringify(savedViews));

  const style = document.createElement('style');
  style.textContent = [
    '.supabase-conn { display: none !important; }',
    '.nt-add, .nt-del { display: none !important; }',
  ].join('\n');
  document.head.appendChild(style);

  function asGridProperty(value, isTitle) {
    const text = value == null ? '' : String(value);
    if (isTitle) return { type: 'title', title: text ? [{ plain_text: text }] : [] };
    return { type: 'rich_text', rich_text: text ? [{ plain_text: text }] : [] };
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : (input && input.url) || '';
    if (requestUrl !== FUNCTION_URL) return nativeFetch(input, init);

    let incoming = {};
    try { incoming = JSON.parse(init.body || '{}'); } catch {}
    const table = incoming.table || incoming.databaseId || '';

    const headers = new Headers(init.headers || {});
    headers.delete('x-app-key');
    headers.set('content-type', 'application/json');
    headers.set('apikey', PUBLISHABLE_KEY);

    const response = await nativeFetch(FUNCTION_URL, {
      ...init,
      method: 'POST',
      headers,
      body: JSON.stringify({ table }),
    });
    if (!response.ok) return response;

    const payload = await response.json();
    if (Array.isArray(payload.results)) {
      return new Response(JSON.stringify(payload), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const columns = Array.isArray(payload.columns) ? payload.columns : [];
    const nameColumn = payload.default_name_column || 'folder_id';
    const results = (Array.isArray(payload.rows) ? payload.rows : []).map((row, index) => ({
      id: `${table}-${index + 1}`,
      properties: Object.fromEntries(columns.map((column) => [
        column,
        asGridProperty(row ? row[column] : '', column === nameColumn),
      ])),
    }));

    const adapted = { ...payload, results, truncated: false };
    return new Response(JSON.stringify(adapted), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
})();
