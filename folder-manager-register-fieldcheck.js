// Per-field filename profile and register reconciliation for TGM Administration Documents.
// Injected after folder-manager-register-actions.js inside the Folder Manager core IIFE.
const REG_FIELD_PROFILE_VERSION = 4;
const REG_FIELD_OPTIONS = [
  { key: 'document_number', label: 'Document Number', sample: 'TGM-EXT-QUO-020-2026' },
  { key: 'document_title', label: 'Document Name / Title', sample: 'Penawaran Jasa Layanan BIM untuk Pekerjaan Pembangunan SUTT 150 kV Leok - Tolinggula' },
  { key: 'letter_id', label: 'Document ID / Letter ID', sample: 'TGM-EXT-QUO-020-2026_Penawaran Jasa Layanan BIM untuk Pekerjaan Pembangunan SUTT 150 kV Leok - Tolinggula' },
];

function regFieldOption(key){return REG_FIELD_OPTIONS.find(x=>x.key===key)||null}
function regFieldProfileRaw(){
  const p=regEffectiveProfile()||fncProfiles().find(x=>x.id===REG_ADMIN_PROFILE_ID);
  if(!p)return null;
  const cfg=p.filenameFieldProfile;
  if(cfg&&Array.isArray(cfg.fields)&&cfg.fields.length){
    const fields=cfg.fields.filter(k=>!!regFieldOption(k));
    if(fields.length)return{fields,delimiter:typeof cfg.delimiter==='string'?cfg.delimiter:''};
  }
  // Backward-compatible migration from the previous single filename-source setting.
  if(p.filenameSourceField==='letter_id')return{fields:['document_number','document_title'],delimiter:'_'};
  if(p.filenameSourceField==='document_number')return{fields:['document_number'],delimiter:''};
  return null;
}
function regFieldProfile(){
  const cfg=regFieldProfileRaw();
  if(!cfg)return null;
  if(cfg.fields.length===1&&cfg.fields[0]==='letter_id')return cfg;
  if(!cfg.fields.includes('document_number'))return null;
  if(cfg.fields.length>1&&!cfg.delimiter)return null;
  return cfg;
}
function regFieldPattern(cfg=regFieldProfile()){
  if(!cfg)return fncTxt('Not configured','Belum dikonfigurasi');
  return cfg.fields.map(k=>`{${k}}`).join(cfg.delimiter);
}
function regFieldSample(cfg=regFieldProfile()){
  if(!cfg)return'';
  const row={};REG_FIELD_OPTIONS.forEach(x=>row[x.key]=x.sample);
  return regFieldBuildExpected(row,cfg);
}
function regFieldBuildExpected(row,cfg=regFieldProfile()){
  if(!cfg||!row)return'';
  return regSafeBase(cfg.fields.map(k=>row[k]==null?'':String(row[k])).join(cfg.delimiter));
}
function regFieldNormText(v){return String(v==null?'':v).replace(/_/g,' ').replace(/\s+/g,' ').trim().toLowerCase()}
function regFieldParseDocNo(v){
  const m=String(v||'').match(/^(TGM)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-(\d{4})$/i);
  if(!m)return null;
  const sequence=String(m[4]).toUpperCase();
  const sm=sequence.match(/^(\d+)([A-Z]*)$/i);
  return{full:m[0],org:m[1].toUpperCase(),dept:m[2].toUpperCase(),type:m[3].toUpperCase(),sequence,sequenceCore:sm?sm[1].replace(/^0+(?=\d)/,''):sequence,year:m[5]};
}
function regFieldCandidateFromBase(base){
  const m=String(base||'').match(/^(TGM-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-\d{4})(?=$|[\s_-])/i);
  if(!m)return null;
  const parsed=regFieldParseDocNo(m[1]);
  if(!parsed)return null;
  parsed.documentNumber=m[1];
  return parsed;
}
function regFieldActualTitle(base,candidate,cfg){
  if(!candidate)return'';
  let tail=String(base||'').slice(candidate.documentNumber.length);
  if(cfg&&cfg.delimiter&&tail.startsWith(cfg.delimiter))tail=tail.slice(cfg.delimiter.length);
  else tail=tail.replace(/^[\s_-]+/,'');
  return tail.replace(/^[-_\s]+/,'').replace(/_/g,' ').trim();
}
function regFieldStrongCandidate(candidate,rows){
  if(!candidate)return null;
  const exact=rows.find(x=>String(x.document_number||'').toLowerCase()===candidate.documentNumber.toLowerCase());
  if(exact)return{row:exact,kind:'exact'};
  const strong=rows.filter(x=>{
    const p=regFieldParseDocNo(x.document_number);if(!p)return false;
    return p.org===candidate.org&&p.dept===candidate.dept&&p.type===candidate.type&&p.year===candidate.year&&p.sequenceCore===candidate.sequenceCore;
  });
  return strong.length===1?{row:strong[0],kind:'composite'}:null;
}
function regFieldDocNoChecks(actual,expected){
  const a=regFieldParseDocNo(actual),e=regFieldParseDocNo(expected);
  if(!a||!e)return[];
  return[
    {label:'Organization',actual:a.org,expected:e.org,ok:a.org===e.org},
    {label:'Department',actual:a.dept,expected:e.dept,ok:a.dept===e.dept},
    {label:'Document Type',actual:a.type,expected:e.type,ok:a.type===e.type},
    {label:'Sequence',actual:a.sequence,expected:e.sequence,ok:a.sequence===e.sequence},
    {label:'Year',actual:a.year,expected:e.year,ok:a.year===e.year},
  ];
}
function regFieldChecks(base,row,candidate,cfg){
  const checks=[];
  const actualTitle=regFieldActualTitle(base,candidate,cfg);
  cfg.fields.forEach((key,index)=>{
    if(key==='document_number'){
      const actual=candidate?candidate.documentNumber:'';
      const expected=String(row.document_number||'');
      checks.push({index,key,label:'Document Number',actual,expected,ok:actual.toLowerCase()===expected.toLowerCase(),sub:regFieldDocNoChecks(actual,expected)});
    }else if(key==='document_title'){
      const actual=actualTitle,expected=String(row.document_title||'');
      checks.push({index,key,label:'Document Name / Title',actual,expected,ok:regFieldNormText(actual)===regFieldNormText(expected),sub:[]});
    }else if(key==='letter_id'){
      const actual=base,expected=String(row.letter_id||'');
      checks.push({index,key,label:'Document ID / Letter ID',actual,expected,ok:regFieldNormText(actual)===regFieldNormText(expected),sub:[]});
    }
  });
  return checks;
}

function regFieldPersistProfile(cfg){
  const ps=fncProfiles(),i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);if(i<0)return false;
  ps[i]={...ps[i],filenameFieldProfile:{fields:[...cfg.fields],delimiter:cfg.delimiter},filenameSourceField:cfg.fields.length===1?cfg.fields[0]:null,filenameRule:null,filenameField:null,updatedAt:new Date().toISOString(),version:REG_FIELD_PROFILE_VERSION};
  fncSaveProfiles(ps);return true;
}
function regFieldMigrateStoredProfile(){
  const ps=fncProfiles(),i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);if(i<0||ps[i].filenameFieldProfile)return;
  const old=ps[i].filenameSourceField;
  if(old==='letter_id'){ps[i]={...ps[i],filenameFieldProfile:{fields:['document_number','document_title'],delimiter:'_'},version:REG_FIELD_PROFILE_VERSION};fncSaveProfiles(ps)}
  else if(old==='document_number'){ps[i]={...ps[i],filenameFieldProfile:{fields:['document_number'],delimiter:''},version:REG_FIELD_PROFILE_VERSION};fncSaveProfiles(ps)}
}

function regFieldEnsureEditor(){
  if(!$('regSourceForm'))return;
  $('regSourceForm').innerHTML=`
    <div class="reg-note">${regEsc(fncTxt('Define the physical filename as one or more register fields. Multi-field filenames are checked field-by-field against the authoritative register.','Definisikan nama file fisik dari satu atau beberapa field register. Filename multi-field diperiksa per field terhadap register authoritative.'))}</div>
    <div class="reg-grid">
      <div class="fnc-field"><label class="fnc-label">Field count</label><select id="regFieldCount"><option value="1">1</option><option value="2">2</option></select></div>
      <div class="fnc-field"><label class="fnc-label">Delimiter</label><input id="regFieldDelimiter" maxlength="5" placeholder=" - "></div>
    </div>
    <div id="regFieldRows" class="reg-grid"></div>
    <div class="reg-box"><span class="fnc-label">Pattern</span><br><code id="regFieldPattern"></code><div class="reg-note" id="regFieldExample" style="margin-top:5px"></div></div>
    <div class="reg-row" style="justify-content:flex-end"><button id="regFieldCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regFieldSave" class="fnc-btn-green">${regEsc(fncTxt('Save Filename Fields','Simpan Field Filename'))}</button></div>`;
  $('regFieldCount').addEventListener('change',()=>regFieldRenderRows());
  $('regFieldDelimiter').addEventListener('input',regFieldEditorPreview);
  $('regFieldCancel').onclick=()=> $('regSourceForm').classList.remove('show');
  $('regFieldSave').onclick=regFieldSaveEditor;
}
function regFieldOptionsFor(index,count,selected){
  let opts;
  if(count===1)opts=[REG_FIELD_OPTIONS[0],REG_FIELD_OPTIONS[2]];
  else opts=index===0?[REG_FIELD_OPTIONS[0]]:[REG_FIELD_OPTIONS[1]];
  return opts.map(x=>`<option value="${regEsc(x.key)}" ${x.key===selected?'selected':''}>${regEsc(x.label)} — ${regEsc(x.key)}</option>`).join('');
}
function regFieldRenderRows(existing){
  const n=Number($('regFieldCount').value)||1,rows=$('regFieldRows');rows.innerHTML='';
  const cfg=existing||regFieldProfile()||{fields:n===2?['document_number','document_title']:['document_number'],delimiter:n===2?' - ':''};
  for(let i=0;i<n;i++){
    const selected=cfg.fields[i]||(n===2?(i===0?'document_number':'document_title'):'document_number');
    const d=document.createElement('div');d.className='fnc-field';d.innerHTML=`<label class="fnc-label">Field ${i+1}</label><select class="reg-field-select">${regFieldOptionsFor(i,n,selected)}</select>`;rows.appendChild(d);d.querySelector('select').addEventListener('change',regFieldEditorPreview);
  }
  $('regFieldDelimiter').disabled=n===1;
  if(n===1&&!existing)$('regFieldDelimiter').value='';
  regFieldEditorPreview();
}
function regFieldEditorValues(){return Array.from(document.querySelectorAll('#regFieldRows .reg-field-select')).map(x=>x.value)}
function regFieldEditorPreview(){
  if(!$('regFieldPattern'))return;const fields=regFieldEditorValues(),delimiter=$('regFieldDelimiter').value,cfg={fields,delimiter};
  $('regFieldPattern').textContent=fields.map(k=>`{${k}}`).join(delimiter);
  $('regFieldExample').textContent=fncTxt('Example: ','Contoh: ')+regFieldSample(cfg);
}
function regFieldOpenEditor(){
  const cfg=regFieldProfile()||{fields:['document_number','document_title'],delimiter:' - '};
  $('regFieldCount').value=String(cfg.fields.length===1?1:2);$('regFieldDelimiter').value=cfg.delimiter||'';regFieldRenderRows(cfg);$('regSourceForm').classList.add('show')
}
function regFieldSaveEditor(){
  const fields=regFieldEditorValues(),delimiter=$('regFieldDelimiter').value;
  if(!fields.length)return alert(fncTxt('At least one filename field is required.','Minimal satu field filename wajib dipilih.'));
  if(fields.length>1&&!delimiter)return alert(fncTxt('Delimiter is required for a multi-field filename.','Delimiter wajib diisi untuk filename multi-field.'));
  if(fields.length>1&&(fields[0]!=='document_number'||fields[1]!=='document_title'))return alert(fncTxt('For this register, the supported two-field profile is Document Number followed by Document Title.','Untuk register ini, profile dua field yang didukung adalah Document Number diikuti Document Title.'));
  if(fields.length===1&&!['document_number','letter_id'].includes(fields[0]))return alert(fncTxt('Single-field mode supports Document Number or Document ID / Letter ID.','Mode satu field mendukung Document Number atau Document ID / Letter ID.'));
  if(!regFieldPersistProfile({fields,delimiter:fields.length===1?'':delimiter}))return;
  $('regSourceForm').classList.remove('show');fncRefreshProfiles(REG_ADMIN_PROFILE_ID);regRefresh();
}
function regFieldRefreshProfileUi(){
  const cfg=regFieldProfile();if(!$('regSourceStatus'))return;
  $('regSourceStatus').textContent=cfg?regFieldPattern(cfg):fncTxt('Not configured','Belum dikonfigurasi');
  $('regSourceStatus').style.color=cfg?'var(--green)':'var(--amber)';
  $('regSourceExample').textContent=cfg?fncTxt('Example filename base: ','Contoh base filename: ')+regFieldSample(cfg):fncTxt('Configure one field, or Document Number + Document Title for per-field validation.','Atur satu field, atau Document Number + Document Title untuk validasi per field.');
  $('regSourceEdit').textContent=fncTxt('Configure Filename Fields','Atur Field Filename');
  const label=$('regSourceStatus').closest('.reg-box')?.querySelector('.fnc-label');if(label)label.textContent=fncTxt('Filename fields / pattern','Field / pattern filename');
  const configured=!!cfg,signed=regIsTgm();if(regActive()&&$('fncScan'))$('fncScan').disabled=regBusy||!fncCurrentKey()||!configured||!signed;
}

// Make register creation use the configured multi-field filename profile.
regFilenameSource=function(){const cfg=regFieldProfile();return cfg&&cfg.fields.length?cfg.fields[0]:''};
regBuildFilename=function(row){return regFieldBuildExpected(row)};

function regFieldEnsureResultHeader(){
  const tr=$('fncResultsBody')?.closest('table')?.querySelector('thead tr');if(!tr)return;
  tr.innerHTML=`<th id="fncRhFile">${regEsc(fncTxt('File','File'))}</th><th>${regEsc(fncTxt('Register Match','Register Match'))}</th><th id="fncRhStatus">${regEsc(fncTxt('Status','Status'))}</th><th id="fncRhIssues">${regEsc(fncTxt('Field Check','Pengecekan Field'))}</th><th>${regEsc(fncTxt('Suggested Filename','Suggestion Filename'))}</th><th id="regActionHead">${regEsc(fncTxt('Action','Aksi'))}</th>`;
}
function regFieldStatusMeta(status){
  if(status==='pass')return{label:'PASS',cls:'ok'};
  if(status==='partial')return{label:fncTxt('PARTIAL MATCH','PARTIAL MATCH'),cls:'warn'};
  if(status==='unregistered')return{label:'UNREGISTERED',cls:'bad'};
  if(status==='ignored')return{label:'IGNORED',cls:'reg-neutral'};
  return{label:fncTxt('NOT GOVERNED','TIDAK TERGOVERN'),cls:'reg-info'};
}
function regFieldCheckHtml(checks){
  if(!checks||!checks.length)return regEsc(fncTxt('No field diagnostics.','Tidak ada diagnostic field.'));
  return checks.map(c=>{
    const head=`<div class="reg-field-check ${c.ok?'ok':'bad'}"><b>${c.ok?'✓':'✕'} Field ${c.index+1} — ${regEsc(c.label)}</b><div>${regEsc(fncTxt('File: ','File: ')+ (c.actual||'-'))}</div><div>${regEsc(fncTxt('Register: ','Register: ')+(c.expected||'-'))}</div>`;
    const sub=c.sub&&c.sub.length?`<div class="reg-subchecks">${c.sub.map(s=>`<span>${s.ok?'✓':'✕'} ${regEsc(s.label)}: ${regEsc(s.actual||'-')}${s.ok?'':` → ${regEsc(s.expected||'-')}`}</span>`).join('')}</div>`:'';
    return head+sub+'</div>';
  }).join('');
}
function regFieldRender(rows){
  regFieldEnsureResultHeader();const body=$('fncResultsBody');if(!body)return;body.innerHTML='';
  const counts={pass:0,partial:0,unregistered:0,not_governed:0,ignored:0};rows.forEach(r=>counts[r.regStatus]=(counts[r.regStatus]||0)+1);
  $('fncResultsSummary').textContent=`${counts.pass} pass • ${counts.partial} partial • ${counts.unregistered} unregistered • ${counts.not_governed} not governed • ${counts.ignored} ignored`;
  rows.forEach(r=>{
    const sm=regFieldStatusMeta(r.regStatus),tr=document.createElement('tr');
    const register=r.record?r.record.document_number:'—';
    const suggestion=r.expected?r.expected+regExt(r.file):'—';
    let detail='';
    if(r.regStatus==='unregistered')detail=`<div class="reg-field-check bad"><b>${regEsc(fncTxt('No authoritative register match','Tidak ada register match authoritative'))}</b><div>${regEsc(fncTxt('Candidate: ','Kandidat: ')+(r.candidate?r.candidate.documentNumber:'-'))}</div></div>`;
    else if(r.regStatus==='not_governed')detail=`<div class="reg-field-check"><b>${regEsc(fncTxt('Not governed by this profile','Tidak tergovern oleh profile ini'))}</b></div>`;
    else if(r.regStatus==='ignored')detail=`<div class="reg-field-check"><b>${regEsc(fncTxt('Ignored in current folder','Diabaikan pada folder aktif'))}</b></div>`;
    else detail=regFieldCheckHtml(r.checks);
    tr.innerHTML=`<td>${regEsc(r.file)}</td><td>${regEsc(register)}</td><td><span class="fnc-badge ${sm.cls}">${regEsc(sm.label)}</span></td><td class="fnc-issue">${detail}</td><td class="reg-suggestion"><code>${regEsc(suggestion)}</code></td><td><div class="reg-action-buttons"></div></td>`;
    const a=tr.querySelector('.reg-action-buttons');const add=(label,cls,fn)=>{const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=fn;a.appendChild(b)};
    if(r.regStatus==='partial'){add(fncTxt('Rename to Suggestion','Rename Sesuai Suggestion'),'fnc-btn-amber',async()=>{if(await regActionRenameFile(r.file,r.expected))await regScan()});add(fncTxt('View Record','Lihat Record'),'fnc-btn-slate',()=>regActionViewRecord(r))}
    else if(r.regStatus==='pass'){add(fncTxt('View Record','Lihat Record'),'fnc-btn-slate',()=>regActionViewRecord(r))}
    else if(r.regStatus==='unregistered'){add(fncTxt('Register Existing File','Register File Existing'),'fnc-btn-green',()=>regActionRegisterExisting(r));add(fncTxt('Ignore','Abaikan'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,true);regScan()})}
    else if(r.regStatus==='not_governed'){add(fncTxt('Ignore','Abaikan'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,true);regScan()})}
    else if(r.regStatus==='ignored'){add(fncTxt('Restore','Aktifkan Lagi'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,false);regScan()})}
    body.appendChild(tr);
  });
}

// Replace the previous exact/single-field scan with conservative per-field reconciliation.
regScan=async function(){
  const cfg=regFieldProfile();if(!cfg)return alert(fncTxt('Configure the filename fields first.','Atur field filename terlebih dahulu.'));
  regBusy=true;regRefresh();
  try{
    const r=await regFetch('/rest/v1/tgm_administration_document_register?select=document_number,document_title,letter_id,is_active&is_active=eq.true&order=document_number.asc');
    if(!r.ok)throw new Error(await regErr(r));
    const rows=await r.json();
    const result=state.entries.filter(e=>e.kind==='file').map(f=>{
      const base=regBase(f.name);
      if(regActionIsIgnored(f.name))return{file:f.name,regStatus:'ignored'};
      const candidate=regFieldCandidateFromBase(base);
      if(!candidate)return{file:f.name,regStatus:'not_governed'};
      const match=regFieldStrongCandidate(candidate,rows);
      if(!match)return{file:f.name,regStatus:'unregistered',candidate,guessTitle:regFieldActualTitle(base,candidate,cfg)};
      const record=match.row,checks=regFieldChecks(base,record,candidate,cfg),expected=regFieldBuildExpected(record,cfg);
      const allOk=checks.length>0&&checks.every(x=>x.ok);
      return{file:f.name,regStatus:allOk?'pass':'partial',record,expected,candidate,checks,matchKind:match.kind,guessTitle:regFieldActualTitle(base,candidate,cfg)};
    });
    fncLastScan=result;$('fncResults').classList.add('show');regFieldRender(result);
  }catch(e){alert(fncTxt('Register scan failed: ','Scan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
};

// Enhance the matched-record view with title and selected filename profile.
regActionViewRecord=function(row){
  if(!row||!row.record)return;const x=row.record,cfg=regFieldProfile();
  alert(`Document Number: ${x.document_number||'-'}\nDocument Title: ${x.document_title||'-'}\nDocument ID / Letter ID: ${x.letter_id||'-'}\n${fncTxt('Filename Pattern','Pattern Filename')}: ${cfg?regFieldPattern(cfg):'-'}\n${fncTxt('Suggested Filename','Suggestion Filename')}: ${row.expected||'-'}`)
};

regFieldMigrateStoredProfile();regFieldEnsureEditor();
$('regSourceEdit').onclick=regFieldOpenEditor;
const regFieldOriginalRefresh=regRefresh;
regRefresh=function(){const out=regFieldOriginalRefresh.apply(this,arguments);regFieldRefreshProfileUi();regFieldEnsureResultHeader();return out};
if(!$('regFieldStyles')){const s=document.createElement('style');s.id='regFieldStyles';s.textContent=`
  .reg-field-check{font-size:11px;line-height:1.4;margin-bottom:6px;padding-bottom:5px;border-bottom:1px dashed var(--line)}.reg-field-check:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0}
  .reg-field-check.ok>b{color:var(--green)}.reg-field-check.bad>b{color:var(--red)}.reg-subchecks{display:flex;gap:7px;flex-wrap:wrap;margin-top:4px;color:var(--muted)}.reg-subchecks span{white-space:nowrap}
  .reg-suggestion{min-width:260px}.reg-suggestion code{white-space:normal;overflow-wrap:anywhere;font-size:11px}
`;document.head.appendChild(s)}
regRefresh();
