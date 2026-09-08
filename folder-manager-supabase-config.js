(() => {
  'use strict';

  const FUNCTION_URL = 'https://slqplzovrotfiohcijap.supabase.co/functions/v1/folder-standards';
  const PUBLISHABLE_KEY = 'sb_publishable_T0UcbTPfA7prgfDSv9pH4g_Ficd15vO';
  const TABLES = [
    { id: 'standard_folder_personal_l1', label: 'Personal Folder — Level 1', type: 'personal', level: 1 },
    { id: 'standard_folder_personal_l2', label: 'Personal Folder — Level 2', type: 'personal', level: 2 },
    { id: 'standard_folder_project_l1', label: 'Project Folder — Level 1', type: 'project', level: 1 },
    { id: 'standard_folder_project_l2', label: 'Project Folder — Level 2', type: 'project', level: 2 },
    { id: 'standard_folder_project_l3', label: 'Project Folder — Level 3', type: 'project', level: 3 },
  ];
  const TABLE_BY_ID = new Map(TABLES.map((table) => [table.id, table]));
  const VALID_IDS = new Set(TABLES.map((table) => table.id));

  // The Folder Manager core still stores panel state using the transformed
  // Supabase localStorage names. The table list itself is fixed and controlled
  // here so end users never need to know database/table identifiers.
  localStorage.setItem('fm-supabase-url', FUNCTION_URL);
  localStorage.setItem('fm-supabase-key', PUBLISHABLE_KEY);
  localStorage.setItem('fm-supabase-dbs', JSON.stringify(TABLES.map(({ id, label }) => ({ id, label }))));

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
    '.nt-source-legacy { display: none !important; }',
    '.nt-native-source { display:flex; align-items:end; gap:12px; flex-wrap:wrap; padding:12px 12px 10px; border:1px solid var(--line); border-radius:10px; background:var(--input-bg); }',
    '.nt-native-field { display:flex; flex-direction:column; gap:5px; min-width:160px; }',
    '.nt-native-field.level { min-width:110px; }',
    '.nt-native-label { color:var(--muted); font-size:11.5px; font-weight:700; letter-spacing:.2px; }',
    '.nt-native-select { height:34px; border:1px solid var(--line); border-radius:8px; background:var(--card); color:var(--ink); padding:0 34px 0 10px; font:inherit; font-size:13px; }',
    '.nt-native-live { margin-left:auto; align-self:center; display:inline-flex; align-items:center; gap:7px; color:var(--muted); font-size:11.5px; white-space:nowrap; }',
    '.nt-native-live::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 0 3px rgba(16,185,129,.12); }',
    '@media (max-width: 760px) { .nt-native-field { min-width:140px; flex:1 1 140px; } .nt-native-live { width:100%; margin-left:0; } }',
  ].join('\n');
  document.head.appendChild(style);

  const COPY = {
    id: {
      type: 'Tipe Folder',
      level: 'Level',
      personal: 'Personal',
      project: 'Project',
      live: 'Standard aktif • Supabase',
      refresh: 'Segarkan standard dari Supabase',
      folderNameField: 'Kolom nama folder:',
      parentField: 'Kelompokkan berdasarkan induk:',
    },
    en: {
      type: 'Folder Type',
      level: 'Level',
      personal: 'Personal',
      project: 'Project',
      live: 'Live standard • Supabase',
      refresh: 'Refresh standard from Supabase',
      folderNameField: 'Folder name field:',
      parentField: 'Group by parent field:',
    },
  };

  function currentLang() {
    return localStorage.getItem('audit-lang') === 'en' ? 'en' : 'id';
  }

  function text() {
    return COPY[currentLang()];
  }

  function tableId(type, level) {
    return `standard_folder_${type}_l${level}`;
  }

  function levelsFor(type) {
    return type === 'personal' ? [1, 2] : [1, 2, 3];
  }

  function asGridProperty(value, isTitle) {
    const valueText = value == null ? '' : String(value);
    if (isTitle) return { type: 'title', title: valueText ? [{ plain_text: valueText }] : [] };
    return { type: 'rich_text', rich_text: valueText ? [{ plain_text: valueText }] : [] };
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

  function setLegacyTable(panel, type, level, loadNow) {
    const legacy = panel.querySelector('.nt-db');
    if (!legacy) return;
    const id = tableId(type, level);
    if (!VALID_IDS.has(id)) return;
    legacy.value = id;
    legacy.dispatchEvent(new Event('change', { bubbles: true }));
    if (loadNow) {
      const load = panel.querySelector('.nt-load');
      if (load && !load.disabled) load.click();
    }
  }

  function renderLevelOptions(block, type, preferredLevel) {
    const levelSelect = block.querySelector('.nt-native-level');
    const validLevels = levelsFor(type);
    const level = validLevels.includes(Number(preferredLevel)) ? Number(preferredLevel) : validLevels[0];
    levelSelect.innerHTML = validLevels.map((value) => `<option value="${value}">${value}</option>`).join('');
    levelSelect.value = String(level);
    return level;
  }

  function applyNativeLabels(root = document) {
    const copy = text();
    root.querySelectorAll('.nt-native-source').forEach((block) => {
      const typeLabel = block.querySelector('[data-native-role="type-label"]');
      const levelLabel = block.querySelector('[data-native-role="level-label"]');
      const live = block.querySelector('[data-native-role="live"]');
      const typeSelect = block.querySelector('.nt-native-type');
      if (typeLabel) typeLabel.textContent = copy.type;
      if (levelLabel) levelLabel.textContent = copy.level;
      if (live) live.textContent = copy.live;
      if (typeSelect) {
        const personal = typeSelect.querySelector('option[value="personal"]');
        const project = typeSelect.querySelector('option[value="project"]');
        if (personal) personal.textContent = copy.personal;
        if (project) project.textContent = copy.project;
      }
    });

    root.querySelectorAll('.nt-panel').forEach((panel) => {
      const load = panel.querySelector('.nt-load');
      if (load) load.title = copy.refresh;
      const toolbars = Array.from(panel.querySelectorAll('.supabase-toolbar, .notion-toolbar'));
      const fieldToolbar = toolbars.find((toolbar) => toolbar.querySelector('.nt-namecol'));
      if (!fieldToolbar) return;
      const nameLabel = fieldToolbar.querySelector('[data-i18n="ntNameColLabel"]');
      const parentLabel = fieldToolbar.querySelector('[data-i18n="ntGroupLabel"]');
      if (nameLabel) nameLabel.textContent = copy.folderNameField;
      if (parentLabel) parentLabel.textContent = copy.parentField;
    });
  }

  function enhancePanel(panel) {
    if (panel.dataset.standardUxReady === '1') return;
    const legacy = panel.querySelector('.nt-db');
    const firstToolbar = panel.querySelector('.supabase-toolbar, .notion-toolbar');
    if (!legacy || !firstToolbar) return;

    const legacyLabel = firstToolbar.querySelector('[data-i18n="ntDbLabel"]');
    legacy.classList.add('nt-source-legacy');
    if (legacyLabel) legacyLabel.classList.add('nt-source-legacy');

    const selected = TABLE_BY_ID.get(legacy.value) || TABLE_BY_ID.get('standard_folder_project_l1');
    const block = document.createElement('div');
    block.className = 'nt-native-source';
    block.innerHTML = [
      '<label class="nt-native-field">',
      '  <span class="nt-native-label" data-native-role="type-label"></span>',
      '  <select class="nt-native-select nt-native-type">',
      '    <option value="personal">Personal</option>',
      '    <option value="project">Project</option>',
      '  </select>',
      '</label>',
      '<label class="nt-native-field level">',
      '  <span class="nt-native-label" data-native-role="level-label"></span>',
      '  <select class="nt-native-select nt-native-level"></select>',
      '</label>',
      '<span class="nt-native-live" data-native-role="live"></span>',
    ].join('');

    firstToolbar.parentNode.insertBefore(block, firstToolbar);

    const typeSelect = block.querySelector('.nt-native-type');
    const levelSelect = block.querySelector('.nt-native-level');
    typeSelect.value = selected.type;
    renderLevelOptions(block, selected.type, selected.level);

    typeSelect.addEventListener('change', () => {
      const level = renderLevelOptions(block, typeSelect.value, levelSelect.value);
      setLegacyTable(panel, typeSelect.value, level, true);
    });
    levelSelect.addEventListener('change', () => {
      setLegacyTable(panel, typeSelect.value, Number(levelSelect.value), true);
    });

    legacy.addEventListener('change', () => {
      const meta = TABLE_BY_ID.get(legacy.value);
      if (!meta) return;
      typeSelect.value = meta.type;
      renderLevelOptions(block, meta.type, meta.level);
    });

    panel.dataset.standardUxReady = '1';
    applyNativeLabels(panel);

    // Load the default standards automatically so users see useful content as
    // soon as the page opens. The legacy refresh button remains available.
    setTimeout(() => {
      const load = panel.querySelector('.nt-load');
      if (load && !load.disabled) load.click();
    }, 60);
  }

  function enhanceStandardLibrary() {
    document.querySelectorAll('.nt-panel').forEach(enhancePanel);
    applyNativeLabels();

    const langToggle = document.getElementById('langToggle');
    if (langToggle && !langToggle.dataset.standardUxBound) {
      langToggle.dataset.standardUxBound = '1';
      langToggle.addEventListener('change', () => setTimeout(() => applyNativeLabels(), 0));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // The Folder Manager core creates its two standard panels in its own
    // DOMContentLoaded handler, so enhance them on the next task.
    setTimeout(enhanceStandardLibrary, 0);
  });
})();
