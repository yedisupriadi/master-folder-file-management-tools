// Actionable remediation workflow for the TGM Administration Document register scan.
// Injected after folder-manager-register.js inside the Folder Manager core IIFE.
const REG_ACTION_IGNORE_KEY = 'fm-fnc-register-ignore-v1';
let regActionPendingExistingFile = '';

function regActionIgnoreScope(){const k=fncCurrentKey();return k?`${REG_ADMIN_PROFILE_ID}::${k}`:''}
function regActionReadIgnores(){try{return JSON.parse(localStorage.getItem(REG_ACTION_IGNORE_KEY)||'{}')||{}}catch{return {}}}
function regActionIsIgnored(file){const s=regActionIgnoreScope();if(!s)return false;const all=regActionReadIgnores(),arr=Array.isArray(all[s])?all[s]:[];return arr.includes(String(file||'').toLowerCase())}
function regActionSetIgnored(file,ignored){const s=regActionIgnoreScope();if(!s)return;const all=regActionReadIgnores(),set=new Set(Array.isArray(all[s])?all[s]:[]),k=String(file||'').toLowerCase();ignored?set.add(k):set.delete(k);all[s]=[...set];localStorage.setItem(REG_ACTION_IGNORE_KEY,JSON.stringify(all))}
function regActionCandidate(base){const m=String(base||'').match(/^TGM-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-(\d{4})(?=$|[\s_-])/i);if(!m)return null;return{documentNumber:m[0],deptCode:m[1].toUpperCase(),typeCode:m[2].toUpperCase(),sequence:m[3],year:m[4]}}
function regActionGuessTitle(base,c){if(!c)return'';return String(base||'').slice(c.documentNumber.length).replace(/^[\s_-]+/,'').replace(/_/g,' ').trim()}

function regActionEnsureHeader(){
  const body=$('fncResultsBody');if(!body)return;const tr=body.closest('table')?.querySelector('thead tr');if(!tr)return;
  let th=$('regActionHead');if(!th){th=document.createElement('th');th.id='regActionHead';tr.appendChild(th)}
  th.textContent=fncTxt('Action','Aksi');th.style.display=regActive()?'':'none';
}
function regActionEnsureUi(){
  if(!$('regActionStyles')){const s=document.createElement('style');s.id='regActionStyles';s.textContent=`.reg-action-buttons{display:flex;gap:5px;flex-wrap:wrap}.reg-action-buttons button{padding:5px 8px;font-size:11px;white-space:nowrap}.fnc-badge.reg-neutral{opacity:.8}.fnc-badge.reg-info{background:var(--card);border:1px solid var(--line)}`;document.head.appendChild(s)}
  if($('regForm')&&!$('regExistingNote')){const d=document.createElement('div');d.id='regExistingNote';d.className='reg-guide';d.style.display='none';$('regForm').insertBefore(d,$('regForm').firstChild)}
  regActionEnsureHeader();
}

async function regActionRenameFile(fileName,expectedBase){
  const e=state.entries.find(x=>x.kind==='file'&&x.name===fileName),p=cur();if(!e||!p)return alert(fncTxt('Select a valid file.','Pilih file yang valid.'));
  const nn=expectedBase+regExt(e.name);if(state.entries.some(x=>x.name!==e.name&&x.name.toLowerCase()===nn.toLowerCase()))return alert(fncTxt('Target filename already exists.','Nama file target sudah ada.'));
  if(!confirm(`Rename "${e.name}" → "${nn}"?`))return false;regBusy=true;regRefresh();try{let moved=false;if(e.handle&&typeof e.handle.move==='function')try{await e.handle.move(nn);moved=true}catch{}if(!moved){const f=await e.handle.getFile(),dh=await p.getFileHandle(nn,{create:true}),w=await dh.createWritable();await w.write(f);await w.close();await p.removeEntry(e.name)}await loadCurrent();return true}catch(x){alert(fncTxt('Rename failed: ','Rename gagal: ')+x.message);return false}finally{regBusy=false;regRefresh()}
}
function regActionViewRecord(row){if(!row||!row.record)return;const x=row.record;alert(`Document Number: ${x.document_number||'-'}\nDocument ID / Letter ID: ${x.letter_id||'-'}\n${fncTxt('Expected filename','Filename seharusnya')}: ${row.expected||'-'}`)}

async function regActionRegisterExisting(row){
  if(!row||!row.candidate)return;regBusy=true;regRefresh();try{await regLoadMasters();const c=row.candidate;const dept=regMasters.departments.find(x=>String(x.department_code).toUpperCase()===c.deptCode);const type=regMasters.types.find(x=>String(x.doc_code).toUpperCase()===c.typeCode);$('regDept').value=dept?dept.id:'';$('regType').value=type?type.id:'';$('regYear').value=c.year||String(new Date().getFullYear());$('regTitleText').value=row.guessTitle||'';regActionPendingExistingFile=row.file;const note=$('regExistingNote');note.textContent=fncTxt(`Existing file candidate ${c.documentNumber} is not registered. Supabase will allocate a new authoritative Document Number; the filename candidate is not adopted automatically.`,`File existing memiliki kandidat ${c.documentNumber} tetapi belum terdaftar. Supabase akan mengalokasikan Document Number authoritative baru; kandidat dari filename tidak diadopsi otomatis.`);note.style.display='block';$('regForm').classList.add('show');$('regResult').classList.remove('show');$('regPanel').scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){alert(fncTxt('Could not prepare register form: ','Gagal menyiapkan form register: ')+e.message)}finally{regBusy=false;regRefresh()}
}

function regActionStatusMeta(status){
  if(status==='pass')return{label:'PASS',cls:'ok'};
  if(status==='rename')return{label:fncTxt('RENAME REQUIRED','PERLU RENAME'),cls:'warn'};
  if(status==='unregistered')return{label:'UNREGISTERED',cls:'bad'};
  if(status==='ignored')return{label:'IGNORED',cls:'reg-neutral'};
  return{label:fncTxt('NOT GOVERNED','TIDAK TERGOVERN'),cls:'reg-info'};
}
function regActionRender(rows){
  regActionEnsureHeader();const body=$('fncResultsBody');if(!body)return;body.innerHTML='';
  const counts={pass:0,rename:0,unregistered:0,not_governed:0,ignored:0};rows.forEach(r=>{counts[r.regStatus]=(counts[r.regStatus]||0)+1});
  $('fncResultsSummary').textContent=`${counts.pass} pass • ${counts.rename} rename • ${counts.unregistered} unregistered • ${counts.not_governed} not governed • ${counts.ignored} ignored`;
  rows.forEach(r=>{const tr=document.createElement('tr'),sm=regActionStatusMeta(r.regStatus);let note='';
    if(r.regStatus==='pass')note=fncTxt(`Matched register record ${r.record.document_number}.`,`Cocok dengan record register ${r.record.document_number}.`);
    else if(r.regStatus==='rename')note=fncTxt(`Register found. Expected filename: "${r.expected+regExt(r.file)}".`,`Register ditemukan. Filename seharusnya: "${r.expected+regExt(r.file)}".`);
    else if(r.regStatus==='unregistered')note=fncTxt(`Candidate Document Number ${r.candidate.documentNumber} is not registered. Creating a record will allocate a new authoritative number.`,`Kandidat Document Number ${r.candidate.documentNumber} belum terdaftar. Pembuatan record akan mengalokasikan nomor authoritative baru.`);
    else if(r.regStatus==='ignored')note=fncTxt('Ignored for this profile in the current folder.','Diabaikan untuk profile ini pada folder aktif.');
    else note=fncTxt('No Administration Document Number pattern was recognized. Treat as supporting/other-profile unless you decide otherwise.','Tidak terdeteksi pola Administration Document Number. Perlakukan sebagai supporting/other-profile kecuali Anda menentukan lain.');
    tr.innerHTML=`<td>${regEsc(r.file)}</td><td><span class="fnc-badge ${sm.cls}">${regEsc(sm.label)}</span></td><td class="fnc-issue">${regEsc(note)}</td><td><div class="reg-action-buttons"></div></td>`;const a=tr.querySelector('.reg-action-buttons');
    const add=(label,cls,fn)=>{const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=fn;a.appendChild(b)};
    if(r.regStatus==='rename'){add(fncTxt('Rename','Rename'),'fnc-btn-amber',async()=>{if(await regActionRenameFile(r.file,r.expected))await regScan()});add(fncTxt('View Record','Lihat Record'),'fnc-btn-slate',()=>regActionViewRecord(r))}
    else if(r.regStatus==='pass'){add(fncTxt('View Record','Lihat Record'),'fnc-btn-slate',()=>regActionViewRecord(r))}
    else if(r.regStatus==='unregistered'){add(fncTxt('Register Existing File','Register File Existing'),'fnc-btn-green',()=>regActionRegisterExisting(r));add(fncTxt('Ignore','Abaikan'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,true);regScan()})}
    else if(r.regStatus==='not_governed'){add(fncTxt('Ignore','Abaikan'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,true);regScan()})}
    else if(r.regStatus==='ignored'){add(fncTxt('Restore','Aktifkan Lagi'),'fnc-btn-slate',()=>{regActionSetIgnored(r.file,false);regScan()})}
    body.appendChild(tr)
  })
}

// Replace the register scan classification with actionable statuses.
regScan = async function(){
  const field=regFilenameSource();if(!regFieldMeta(field))return alert(fncTxt('Choose a filename reference field first.','Pilih field acuan filename terlebih dahulu.'));
  regBusy=true;regRefresh();try{const select=[...new Set(['document_number','letter_id','is_active',field])].join(',');const r=await regFetch('/rest/v1/tgm_administration_document_register?select='+encodeURIComponent(select)+'&is_active=eq.true&order=document_number.asc');if(!r.ok)throw new Error(await regErr(r));const rows=await r.json(),exact=new Map(),nums=new Map();rows.forEach(x=>{const expected=regBuildFilename(x,field);if(expected)exact.set(expected.toLowerCase(),{...x,expected});if(x.document_number)nums.set(String(x.document_number).toLowerCase(),{...x,expected})});const result=state.entries.filter(e=>e.kind==='file').map(f=>{const b=regBase(f.name),l=b.toLowerCase();if(regActionIsIgnored(f.name))return{file:f.name,regStatus:'ignored'};const ex=exact.get(l);if(ex)return{file:f.name,regStatus:'pass',record:ex,expected:ex.expected};const c=regActionCandidate(b);if(c){const x=nums.get(c.documentNumber.toLowerCase());if(x)return{file:f.name,regStatus:'rename',record:x,expected:x.expected,candidate:c,guessTitle:regActionGuessTitle(b,c)};return{file:f.name,regStatus:'unregistered',candidate:c,guessTitle:regActionGuessTitle(b,c)}}return{file:f.name,regStatus:'not_governed'}});fncLastScan=result;$('fncResults').classList.add('show');regActionRender(result)}catch(e){alert(fncTxt('Register scan failed: ','Scan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
};

// Add context for the "Register Existing File" remediation without changing the governed RPC.
const regActionOriginalOpen=regOpen;
const regActionOriginalCreate=regCreate;
$('regNew').onclick=async()=>{regActionPendingExistingFile='';if($('regExistingNote'))$('regExistingNote').style.display='none';return regActionOriginalOpen()};
$('regCreate').onclick=async()=>{const before=regCreated,pending=regActionPendingExistingFile;await regActionOriginalCreate();if(regCreated&&regCreated!==before&&pending){regFiles();if(Array.from($('regFile').options).some(o=>o.value===pending))$('regFile').value=pending;regActionPendingExistingFile='';if($('regExistingNote'))$('regExistingNote').style.display='none'}};
const regActionOriginalRefresh=regRefresh;
regRefresh=function(){const r=regActionOriginalRefresh.apply(this,arguments);regActionEnsureHeader();return r};
regActionEnsureUi();regRefresh();
