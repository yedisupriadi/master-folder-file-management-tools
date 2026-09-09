// File Naming Convention Implementation v1
// Injected inside the Folder Manager core IIFE so it can reuse the current
// File System Access state (state/cur/curPathStr) without duplicating the
// mature folder-management engine.

const FNC_PROFILE_KEY = 'fm-fnc-profiles-v1';
const FNC_BINDING_KEY = 'fm-fnc-bindings-v1';
const FNC_SECTION_KEY = 'fm-collapsible-sections-v1';
let fncEditingId = null;
let fncLastScan = [];

const fncTxt = (en, id) => (lang === 'en' ? en : id);
const fncUid = () => 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
const fncEsc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

function fncReadJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function fncWriteJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function fncProfiles() {
  const raw = fncReadJson(FNC_PROFILE_KEY, []);
  return Array.isArray(raw) ? raw : [];
}
function fncSaveProfiles(items) { fncWriteJson(FNC_PROFILE_KEY, items); }
function fncBindings() {
  const raw = fncReadJson(FNC_BINDING_KEY, {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
function fncCurrentKey() {
  if (!state.root || !state.path.length) return '';
  // Browser-local binding key. This intentionally avoids storing a file-system
  // handle in localStorage, while remaining predictable across normal reopen.
  return curPathStr();
}
function fncSelectedProfileId() { return $('fncProfileSelect') ? $('fncProfileSelect').value : ''; }
function fncSelectedProfile() {
  const id = fncSelectedProfileId();
  return fncProfiles().find(p => p.id === id) || null;
}

function fncInjectStyles() {
  if ($('fncStyles')) return;
  const style = document.createElement('style');
  style.id = 'fncStyles';
  style.textContent = `
    .fm-collapsible { position: relative; }
    .fm-collapse-head { display:flex; align-items:flex-start; gap:10px; }
    .fm-collapse-head > div:first-child { flex:1; min-width:0; }
    .fm-collapse-btn {
      width:34px; height:32px; padding:0; justify-content:center; flex:0 0 auto;
      background:var(--slate); color:#fff; border-radius:8px;
    }
    .fm-collapse-btn:hover:not(:disabled){ background:var(--slate-dark); }
    .fm-collapse-btn svg { transition: transform .16s ease; }
    .fm-collapsible.is-collapsed .fm-collapse-btn svg { transform: rotate(-90deg); }
    .fm-collapse-body { display:flex; flex-direction:column; gap:12px; }
    .fm-collapsible.is-collapsed .fm-collapse-body { display:none; }

    .fnc-section {
      background:var(--card); border-radius:var(--radius); padding:14px;
      box-shadow:0 1px 2px rgba(15,23,42,.06),0 8px 24px -12px rgba(15,23,42,.12);
      display:flex; flex-direction:column; gap:12px;
    }
    .fnc-subtitle { color:var(--muted); font-size:12.5px; line-height:1.45; margin-top:3px; }
    .fnc-toolbar { display:flex; align-items:end; gap:8px; flex-wrap:wrap; }
    .fnc-field { display:flex; flex-direction:column; gap:5px; min-width:150px; }
    .fnc-field.grow { flex:1; min-width:220px; }
    .fnc-label { font-size:11.5px; font-weight:700; color:var(--muted); }
    .fnc-section input,.fnc-section select {
      height:36px; border:1px solid var(--line); border-radius:8px; background:var(--input-bg);
      color:var(--ink); padding:7px 10px; font:inherit; font-size:13px;
    }
    .fnc-section input:focus,.fnc-section select:focus { outline:2px solid rgba(99,102,241,.18); border-color:var(--accent); }
    .fnc-btn-primary { background:var(--accent); }
    .fnc-btn-green { background:var(--green); }
    .fnc-btn-slate { background:var(--slate); }
    .fnc-btn-red { background:var(--red); }
    .fnc-btn-amber { background:var(--amber); }
    .fnc-context {
      border:1px solid var(--line); border-radius:10px; padding:10px 12px; background:var(--input-bg);
      display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap;
      font-size:12px;
    }
    .fnc-context b { color:var(--ink); }
    .fnc-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700; background:var(--chip-bg); }
    .fnc-badge.ok { color:var(--green-dark); }
    .fnc-badge.warn { color:var(--amber-dark); }
    .fnc-badge.bad { color:var(--red-dark); }
    .fnc-editor { border:1px solid var(--line); border-radius:10px; padding:12px; display:none; flex-direction:column; gap:12px; }
    .fnc-editor.show { display:flex; }
    .fnc-editor-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .fnc-editor-head h3 { font-size:14px; }
    .fnc-fields-table { width:100%; border-collapse:collapse; font-size:12px; }
    .fnc-fields-table th { text-align:left; background:var(--thead-bg); color:var(--thead-ink); padding:8px; }
    .fnc-fields-table td { border-bottom:1px solid var(--td-line); padding:6px; vertical-align:middle; }
    .fnc-fields-table input,.fnc-fields-table select { width:100%; min-width:90px; }
    .fnc-fields-table .fnc-check { width:auto; height:auto; }
    .fnc-source-detail { min-width:170px; }
    .fnc-source-hint { color:var(--muted); font-size:10.5px; line-height:1.35; margin-top:3px; }
    .fnc-results { display:none; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
    .fnc-results.show { display:block; }
    .fnc-results-head { padding:10px 12px; background:var(--input-bg); display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
    .fnc-results-scroll { overflow:auto; max-height:340px; }
    .fnc-results table { width:100%; border-collapse:collapse; font-size:12px; }
    .fnc-results th { position:sticky; top:0; z-index:1; text-align:left; background:var(--thead-bg); color:var(--thead-ink); padding:8px; }
    .fnc-results td { border-bottom:1px solid var(--td-line); padding:8px; vertical-align:top; }
    .fnc-issue { color:var(--muted); line-height:1.4; }
    .fnc-note { font-size:11px; color:var(--muted); line-height:1.45; }
    @media (max-width:800px){
      .fnc-fields-table { min-width:920px; }
      .fnc-toolbar { align-items:stretch; }
      .fnc-field,.fnc-field.grow { min-width:100%; }
    }
  `;
  document.head.appendChild(style);
}

function fncMakeCollapsible(section, key, defaultCollapsed = false) {
  if (!section || section.dataset.fmCollapsible === '1') return;
  section.dataset.fmCollapsible = '1';
  section.classList.add('fm-collapsible');
  const children = Array.from(section.children);
  if (!children.length) return;
  const titleBlock = children[0];
  const head = document.createElement('div');
  head.className = 'fm-collapse-head';
  section.insertBefore(head, titleBlock);
  head.appendChild(titleBlock);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'fm-collapse-btn';
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  head.appendChild(btn);
  const body = document.createElement('div');
  body.className = 'fm-collapse-body';
  children.slice(1).forEach(el => body.appendChild(el));
  section.appendChild(body);

  const prefs = fncReadJson(FNC_SECTION_KEY, {});
  const collapsed = Object.prototype.hasOwnProperty.call(prefs, key) ? !!prefs[key] : defaultCollapsed;
  section.classList.toggle('is-collapsed', collapsed);
  const refreshTip = () => {
    btn.title = section.classList.contains('is-collapsed')
      ? fncTxt('Expand section', 'Buka section')
      : fncTxt('Collapse section', 'Tutup section');
  };
  refreshTip();
  btn.addEventListener('click', () => {
    const now = section.classList.toggle('is-collapsed');
    const p = fncReadJson(FNC_SECTION_KEY, {}); p[key] = now; fncWriteJson(FNC_SECTION_KEY, p); refreshTip();
  });
  section._fncRefreshCollapseTip = refreshTip;
}

function fncBuildSection() {
  if ($('fncSection')) return;
  const sheet = document.querySelector('.sheet-section');
  if (!sheet) return;
  const section = document.createElement('div');
  section.id = 'fncSection';
  section.className = 'fnc-section';
  section.innerHTML = `
    <div>
      <div class="ms-title"><span class="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/></svg></span><span id="fncTitle"></span></div>
      <div class="fnc-subtitle" id="fncSubtitle"></div>
    </div>
    <div class="fnc-toolbar">
      <div class="fnc-field grow"><label class="fnc-label" id="fncProfileLabel"></label><select id="fncProfileSelect"></select></div>
      <button type="button" id="fncNew" class="fnc-btn-green"></button>
      <button type="button" id="fncEdit" class="fnc-btn-slate"></button>
      <button type="button" id="fncDelete" class="fnc-btn-red"></button>
    </div>
    <div class="fnc-context">
      <div><span id="fncFolderLabel"></span> <b id="fncFolderPath">—</b></div>
      <div><span id="fncBindingLabel"></span> <span class="fnc-badge" id="fncBindingBadge">—</span></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button type="button" id="fncBind" class="fnc-btn-amber"></button>
        <button type="button" id="fncUnbind" class="fnc-btn-slate"></button>
        <button type="button" id="fncScan" class="fnc-btn-primary"></button>
      </div>
    </div>
    <div class="fnc-editor" id="fncEditor">
      <div class="fnc-editor-head"><h3 id="fncEditorTitle"></h3><span class="fnc-note" id="fncStorageNote"></span></div>
      <div class="fnc-toolbar">
        <div class="fnc-field grow"><label class="fnc-label" id="fncNameLabel"></label><input id="fncName" maxlength="80"></div>
        <div class="fnc-field"><label class="fnc-label" id="fncDelimiterLabel"></label><input id="fncDelimiter" maxlength="5" value="-"></div>
        <div class="fnc-field"><label class="fnc-label" id="fncCountLabel"></label><input id="fncFieldCount" type="number" min="1" max="20" value="3"></div>
        <button type="button" id="fncApplyStructure" class="fnc-btn-slate"></button>
      </div>
      <div style="overflow:auto"><table class="fnc-fields-table"><thead><tr>
        <th>#</th><th id="fncThName"></th><th id="fncThSource"></th><th id="fncThSourceDetail"></th><th id="fncThType"></th><th id="fncThLength"></th><th id="fncThUnique"></th>
      </tr></thead><tbody id="fncFieldsBody"></tbody></table></div>
      <div class="fnc-note" id="fncSupabaseNote"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">
        <button type="button" id="fncCancel" class="fnc-btn-slate"></button>
        <button type="button" id="fncSave" class="fnc-btn-green"></button>
      </div>
    </div>
    <div class="fnc-results" id="fncResults">
      <div class="fnc-results-head"><b id="fncResultsTitle"></b><span id="fncResultsSummary"></span></div>
      <div class="fnc-results-scroll"><table><thead><tr><th id="fncRhFile"></th><th id="fncRhStatus"></th><th id="fncRhIssues"></th></tr></thead><tbody id="fncResultsBody"></tbody></table></div>
    </div>
  `;
  sheet.insertAdjacentElement('afterend', section);
  fncMakeCollapsible(document.querySelector('.supabase-section, .notion-section'), 'standard-library', false);
  fncMakeCollapsible(sheet, 'batch-folder', false);
  fncMakeCollapsible(section, 'file-naming', false);
  fncWireEvents();
  fncRefreshText();
  fncRefreshProfiles();
  fncRefreshContext();
}

function fncRefreshText() {
  if (!$('fncSection')) return;
  $('fncTitle').textContent = fncTxt('File Naming Convention Implementation', 'File Naming Convention Implementation');
  $('fncSubtitle').textContent = fncTxt(
    'Create reusable naming profiles, define field rules and Supabase-standard references, bind a profile to the open folder, then scan current files for compliance.',
    'Buat profile naming yang reusable, atur rule tiap field dan referensi standard Supabase, binding profile ke folder yang sedang dibuka, lalu scan file untuk mengecek compliance.'
  );
  $('fncProfileLabel').textContent = fncTxt('Naming profile', 'Profile naming convention');
  $('fncNew').textContent = fncTxt('New Profile', 'Profile Baru');
  $('fncEdit').textContent = fncTxt('Edit', 'Edit');
  $('fncDelete').textContent = fncTxt('Delete', 'Hapus');
  $('fncFolderLabel').textContent = fncTxt('Current folder:', 'Folder aktif:');
  $('fncBindingLabel').textContent = fncTxt('Binding:', 'Binding:');
  $('fncBind').textContent = fncTxt('Bind Profile', 'Binding Profile');
  $('fncUnbind').textContent = fncTxt('Unbind', 'Lepas Binding');
  $('fncScan').textContent = fncTxt('Scan Current Files', 'Scan File Aktif');
  $('fncEditorTitle').textContent = fncEditingId ? fncTxt('Edit Naming Profile', 'Edit Profile Naming') : fncTxt('New Naming Profile', 'Profile Naming Baru');
  $('fncStorageNote').textContent = fncTxt('Profile config is browser-local in v1.', 'Konfigurasi profile masih lokal browser pada v1.');
  $('fncNameLabel').textContent = fncTxt('Profile name', 'Nama profile');
  $('fncDelimiterLabel').textContent = fncTxt('Delimiter', 'Delimiter');
  $('fncCountLabel').textContent = fncTxt('Field count', 'Jumlah field');
  $('fncApplyStructure').textContent = fncTxt('Apply Structure', 'Set Struktur');
  $('fncThName').textContent = fncTxt('Field name', 'Nama field');
  $('fncThSource').textContent = fncTxt('Validation source', 'Sumber validasi');
  $('fncThSourceDetail').textContent = fncTxt('Source / rule detail', 'Detail sumber / rule');
  $('fncThType').textContent = fncTxt('Content type', 'Tipe isi');
  $('fncThLength').textContent = fncTxt('Exact length', 'Panjang tetap');
  $('fncThUnique').textContent = fncTxt('Unique in folder', 'Unique dalam folder');
  $('fncSupabaseNote').textContent = fncTxt(
    'Supabase Standard is represented as table + column metadata in this first build. It is intentionally not hard-wired to the current folder-standard tables; the dedicated file-naming registry can be connected next without mixing the two standards.',
    'Supabase Standard pada build pertama ini disimpan sebagai metadata table + column. Sengaja tidak dipaksa memakai table standard folder yang sekarang, supaya standard File Naming Convention tetap terpisah dan nanti dapat dihubungkan ke registry khusus.'
  );
  $('fncCancel').textContent = fncTxt('Cancel', 'Batal');
  $('fncSave').textContent = fncTxt('Save Profile', 'Simpan Profile');
  $('fncResultsTitle').textContent = fncTxt('Scan Results', 'Hasil Scan');
  $('fncRhFile').textContent = fncTxt('File', 'File');
  $('fncRhStatus').textContent = fncTxt('Status', 'Status');
  $('fncRhIssues').textContent = fncTxt('Issues', 'Temuan');
  document.querySelectorAll('.fm-collapsible').forEach(s => s._fncRefreshCollapseTip && s._fncRefreshCollapseTip());
  fncRefreshFieldsText();
  fncRenderResults();
}

function fncFieldDefault(index) {
  return { name: 'FIELD_' + (index + 1), source: 'rule', sourceRef: '', contentType: 'any', exactLength: '', uniqueInFolder: false };
}
function fncRenderFieldRows(fields) {
  const body = $('fncFieldsBody'); if (!body) return;
  body.innerHTML = '';
  fields.forEach((f, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><input class="fnc-f-name" value="${fncEsc(f.name || '')}" maxlength="50"></td>
      <td><select class="fnc-f-source"><option value="rule">${fncTxt('Manual Rule','Manual Rule')}</option><option value="supabase">${fncTxt('Supabase Standard','Supabase Standard')}</option></select></td>
      <td><input class="fnc-f-source-ref fnc-source-detail" value="${fncEsc(f.sourceRef || '')}" placeholder="${fncEsc(fncTxt('e.g. naming_document_type.code','mis. naming_document_type.code'))}"><div class="fnc-source-hint"></div></td>
      <td><select class="fnc-f-type"><option value="any">${fncTxt('Any','Bebas')}</option><option value="text">${fncTxt('Text only','Text saja')}</option><option value="number">${fncTxt('Numbers only','Angka saja')}</option><option value="alphanumeric">${fncTxt('Alphanumeric','Alphanumeric')}</option></select></td>
      <td><input class="fnc-f-length" type="number" min="1" max="200" value="${fncEsc(f.exactLength || '')}" placeholder="—"></td>
      <td style="text-align:center"><input class="fnc-f-unique fnc-check" type="checkbox" ${f.uniqueInFolder ? 'checked' : ''}></td>
    `;
    body.appendChild(tr);
    tr.querySelector('.fnc-f-source').value = f.source || 'rule';
    tr.querySelector('.fnc-f-type').value = f.contentType || 'any';
    const sync = () => {
      const isSb = tr.querySelector('.fnc-f-source').value === 'supabase';
      tr.querySelector('.fnc-f-source-ref').disabled = !isSb;
      tr.querySelector('.fnc-source-hint').textContent = isSb
        ? fncTxt('Stored as Supabase table.column reference.', 'Disimpan sebagai referensi Supabase table.column.')
        : fncTxt('Manual rules below are enforced during scan.', 'Rule manual di kanan akan divalidasi saat scan.');
    };
    tr.querySelector('.fnc-f-source').addEventListener('change', sync); sync();
  });
}
function fncRefreshFieldsText() {
  const fields = fncReadEditorFields();
  if ($('fncFieldsBody') && $('fncFieldsBody').children.length) fncRenderFieldRows(fields);
}
function fncReadEditorFields() {
  const rows = $('fncFieldsBody') ? Array.from($('fncFieldsBody').querySelectorAll('tr')) : [];
  return rows.map(tr => ({
    name: tr.querySelector('.fnc-f-name').value.trim(),
    source: tr.querySelector('.fnc-f-source').value,
    sourceRef: tr.querySelector('.fnc-f-source-ref').value.trim(),
    contentType: tr.querySelector('.fnc-f-type').value,
    exactLength: tr.querySelector('.fnc-f-length').value ? Number(tr.querySelector('.fnc-f-length').value) : '',
    uniqueInFolder: tr.querySelector('.fnc-f-unique').checked
  }));
}
function fncApplyFieldCount(preserve = true) {
  const n = Math.max(1, Math.min(20, Number($('fncFieldCount').value) || 1));
  $('fncFieldCount').value = n;
  const old = preserve ? fncReadEditorFields() : [];
  const fields = Array.from({ length: n }, (_, i) => old[i] || fncFieldDefault(i));
  fncRenderFieldRows(fields);
}

function fncRefreshProfiles(preferId) {
  if (!$('fncProfileSelect')) return;
  const profiles = fncProfiles();
  const sel = $('fncProfileSelect');
  const current = preferId || sel.value;
  sel.innerHTML = '<option value="">' + fncEsc(fncTxt('(select profile)', '(pilih profile)')) + '</option>'
    + profiles.map(p => '<option value="' + fncEsc(p.id) + '">' + fncEsc(p.name) + '</option>').join('');
  if (profiles.some(p => p.id === current)) sel.value = current;
  const has = !!fncSelectedProfile();
  $('fncEdit').disabled = !has;
  $('fncDelete').disabled = !has;
  fncRefreshContext();
}
function fncOpenEditor(profile) {
  fncEditingId = profile ? profile.id : null;
  $('fncEditor').classList.add('show');
  $('fncName').value = profile ? profile.name : '';
  $('fncDelimiter').value = profile ? profile.delimiter : '-';
  const fields = profile && Array.isArray(profile.fields) && profile.fields.length ? profile.fields : [fncFieldDefault(0), fncFieldDefault(1), fncFieldDefault(2)];
  $('fncFieldCount').value = fields.length;
  fncRenderFieldRows(fields);
  fncRefreshText();
  $('fncName').focus();
}
function fncCloseEditor() { fncEditingId = null; $('fncEditor').classList.remove('show'); fncRefreshText(); }
function fncSaveEditor() {
  const name = $('fncName').value.trim();
  const delimiter = $('fncDelimiter').value;
  const fields = fncReadEditorFields();
  if (!name) { alert(fncTxt('Profile name is required.', 'Nama profile wajib diisi.')); return; }
  if (!delimiter) { alert(fncTxt('Delimiter is required.', 'Delimiter wajib diisi.')); return; }
  if (!fields.length || fields.some(f => !f.name)) { alert(fncTxt('Every field needs a name.', 'Setiap field harus memiliki nama.')); return; }
  if (fields.some(f => f.source === 'supabase' && !f.sourceRef)) {
    alert(fncTxt('Each Supabase Standard field needs a table.column reference.', 'Setiap field Supabase Standard harus memiliki referensi table.column.')); return;
  }
  const profiles = fncProfiles();
  const id = fncEditingId || fncUid();
  const profile = { id, name, delimiter, fields, updatedAt: new Date().toISOString(), version: 1 };
  const idx = profiles.findIndex(p => p.id === id);
  if (idx >= 0) profiles[idx] = profile; else profiles.push(profile);
  fncSaveProfiles(profiles);
  fncCloseEditor();
  fncRefreshProfiles(id);
}
function fncDeleteProfile() {
  const p = fncSelectedProfile(); if (!p) return;
  if (!confirm(fncTxt('Delete profile "' + p.name + '"?', 'Hapus profile "' + p.name + '"?'))) return;
  fncSaveProfiles(fncProfiles().filter(x => x.id !== p.id));
  const bindings = fncBindings();
  Object.keys(bindings).forEach(k => { if (bindings[k] === p.id) delete bindings[k]; });
  fncWriteJson(FNC_BINDING_KEY, bindings);
  fncLastScan = [];
  fncRefreshProfiles(); fncRenderResults();
}

function fncBindCurrent() {
  const p = fncSelectedProfile();
  const key = fncCurrentKey();
  if (!key) { alert(fncTxt('Pick a folder first.', 'Pilih folder terlebih dahulu.')); return; }
  if (!p) { alert(fncTxt('Select a naming profile first.', 'Pilih profile naming terlebih dahulu.')); return; }
  const b = fncBindings(); b[key] = p.id; fncWriteJson(FNC_BINDING_KEY, b); fncRefreshContext();
}
function fncUnbindCurrent() {
  const key = fncCurrentKey(); if (!key) return;
  const b = fncBindings(); delete b[key]; fncWriteJson(FNC_BINDING_KEY, b); fncRefreshContext();
}
function fncRefreshContext() {
  if (!$('fncSection')) return;
  const key = fncCurrentKey();
  $('fncFolderPath').textContent = key || fncTxt('(no folder picked)', '(belum ada folder dipilih)');
  const bindings = fncBindings();
  const boundId = key ? bindings[key] : '';
  const profile = fncProfiles().find(p => p.id === boundId) || null;
  const badge = $('fncBindingBadge');
  badge.textContent = profile ? profile.name : fncTxt('Not bound', 'Belum ter-binding');
  badge.className = 'fnc-badge ' + (profile ? 'ok' : 'warn');
  const hasFolder = !!key;
  $('fncBind').disabled = !hasFolder || !fncSelectedProfile();
  $('fncUnbind').disabled = !hasFolder || !profile;
  $('fncScan').disabled = !hasFolder || !(profile || fncSelectedProfile());
  if (profile && $('fncProfileSelect').value !== profile.id) {
    $('fncProfileSelect').value = profile.id;
    $('fncEdit').disabled = false; $('fncDelete').disabled = false;
  }
}

function fncBaseName(fileName) {
  const idx = fileName.lastIndexOf('.');
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}
function fncValidateType(value, type) {
  if (type === 'number') return /^\d+$/.test(value);
  if (type === 'text') return /^[A-Za-z]+$/.test(value);
  if (type === 'alphanumeric') return /^[A-Za-z0-9]+$/.test(value);
  return true;
}
function fncScanCurrent() {
  const key = fncCurrentKey(); if (!key) return;
  const bindings = fncBindings();
  const bound = fncProfiles().find(p => p.id === bindings[key]);
  const profile = bound || fncSelectedProfile();
  if (!profile) { alert(fncTxt('Select or bind a naming profile first.', 'Pilih atau binding profile naming terlebih dahulu.')); return; }
  const files = state.entries.filter(e => e.kind === 'file');
  if (!files.length) {
    fncLastScan = [];
    $('fncResults').classList.add('show');
    fncRenderResults();
    return;
  }
  const parsed = files.map(file => {
    const base = fncBaseName(file.name);
    const values = base.split(profile.delimiter);
    const issues = [];
    const warnings = [];
    if (values.length !== profile.fields.length) {
      issues.push(fncTxt(
        `Field count ${values.length}; expected ${profile.fields.length}.`,
        `Jumlah field ${values.length}; seharusnya ${profile.fields.length}.`
      ));
    }
    profile.fields.forEach((field, i) => {
      const v = values[i];
      if (v == null) return;
      if (field.exactLength && v.length !== Number(field.exactLength)) {
        issues.push(`${field.name}: ` + fncTxt(`length ${v.length}, expected ${field.exactLength}.`, `panjang ${v.length}, seharusnya ${field.exactLength}.`));
      }
      if (!fncValidateType(v, field.contentType || 'any')) {
        issues.push(`${field.name}: ` + fncTxt(`invalid ${field.contentType} content.`, `isi tidak sesuai tipe ${field.contentType}.`));
      }
      if (field.source === 'supabase') {
        // v1 records the governed source reference but does not silently fake
        // a lookup against a naming registry that does not exist yet.
        warnings.push(`${field.name}: ` + fncTxt(`Supabase source ${field.sourceRef} is configured but its value lookup is not connected in v1.`, `sumber Supabase ${field.sourceRef} sudah dikonfigurasi tetapi lookup valuenya belum terhubung pada v1.`));
      }
    });
    return { file: file.name, values, issues, warnings };
  });

  profile.fields.forEach((field, fieldIndex) => {
    if (!field.uniqueInFolder) return;
    const map = new Map();
    parsed.forEach(r => {
      const v = r.values[fieldIndex]; if (v == null || v === '') return;
      const k = v.toLowerCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    map.forEach((rows, value) => {
      if (rows.length < 2) return;
      rows.forEach(r => r.issues.push(`${field.name}: ` + fncTxt(`duplicate value "${value}" in this folder.`, `value "${value}" duplikat dalam folder ini.`)));
    });
  });
  fncLastScan = parsed;
  $('fncResults').classList.add('show');
  fncRenderResults(profile);
}
function fncRenderResults(profile) {
  if (!$('fncResultsBody')) return;
  const body = $('fncResultsBody'); body.innerHTML = '';
  const rows = fncLastScan || [];
  if (!rows.length) {
    $('fncResultsSummary').textContent = fncTxt('No file results yet.', 'Belum ada hasil file.');
    return;
  }
  const pass = rows.filter(r => !r.issues.length && !(r.warnings || []).length).length;
  const review = rows.filter(r => !r.issues.length && (r.warnings || []).length).length;
  const fail = rows.length - pass - review;
  $('fncResultsSummary').textContent = `${pass} ${fncTxt('pass','pass')} • ${review} ${fncTxt('review','review')} • ${fail} ${fncTxt('fail','fail')}`;
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const warnings = r.warnings || [];
    const status = r.issues.length ? 'fail' : (warnings.length ? 'review' : 'pass');
    const badgeClass = status === 'pass' ? 'ok' : (status === 'review' ? 'warn' : 'bad');
    const statusLabel = status === 'pass' ? 'PASS' : (status === 'review' ? 'REVIEW' : 'FAIL');
    const notes = [...r.issues.map(x => fncTxt('Error: ','Error: ') + x), ...warnings.map(x => fncTxt('Warning: ','Warning: ') + x)];
    tr.innerHTML = `<td>${fncEsc(r.file)}</td><td><span class="fnc-badge ${badgeClass}">${statusLabel}</span></td><td class="fnc-issue">${notes.length ? notes.map(fncEsc).join('<br>') : fncTxt('No issues.','Tidak ada temuan.')}</td>`;
    body.appendChild(tr);
  });
}

function fncWireEvents() {
  $('fncProfileSelect').addEventListener('change', () => {
    $('fncEdit').disabled = !fncSelectedProfile(); $('fncDelete').disabled = !fncSelectedProfile();
    fncRefreshContext(); fncLastScan = []; fncRenderResults();
  });
  $('fncNew').addEventListener('click', () => fncOpenEditor(null));
  $('fncEdit').addEventListener('click', () => { const p = fncSelectedProfile(); if (p) fncOpenEditor(p); });
  $('fncDelete').addEventListener('click', fncDeleteProfile);
  $('fncApplyStructure').addEventListener('click', () => fncApplyFieldCount(true));
  $('fncSave').addEventListener('click', fncSaveEditor);
  $('fncCancel').addEventListener('click', fncCloseEditor);
  $('fncBind').addEventListener('click', fncBindCurrent);
  $('fncUnbind').addEventListener('click', fncUnbindCurrent);
  $('fncScan').addEventListener('click', fncScanCurrent);
}

fncInjectStyles();
fncBuildSection();

// Keep the naming context synchronized whenever Folder Manager rerenders after
// navigation, refresh, rename, delete, paste, or other file-system operations.
if (typeof renderAll === 'function') {
  const fncOriginalRenderAll = renderAll;
  renderAll = function () {
    const result = fncOriginalRenderAll.apply(this, arguments);
    fncRefreshContext();
    return result;
  };
}
if (typeof setLang === 'function') {
  const fncOriginalSetLang = setLang;
  setLang = function (nextLang) {
    const result = fncOriginalSetLang.apply(this, arguments);
    fncRefreshText(); fncRefreshProfiles(fncSelectedProfileId()); fncRefreshContext();
    return result;
  };
}
