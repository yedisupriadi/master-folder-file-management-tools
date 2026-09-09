// TGM Administration Document Register integration v3.
// Injected inside Folder Manager core IIFE after folder-manager-naming.js.
const REG_ADMIN_PROFILE_ID = 'system:tgm-administration-document-v1';
const REG_SESSION_KEY = 'fm-tgm-register-session-v1';
const REG_SB_URL = 'https://slqplzovrotfiohcijap.supabase.co';
const REG_SB_KEY = 'sb_publishable_T0UcbTPfA7prgfDSv9pH4g_Ficd15vO';
const REG_FILENAME_FIELDS = [
  { key: 'document_number', label: 'Document Number', sample: 'TGM-EXT-QUO-020-2026' },
  { key: 'letter_id', label: 'Document ID / Letter ID', sample: 'TGM-EXT-QUO-020-2026_Quotation Leok' },
];
let regSession = regReadSession();
let regMasters = null;
let regCreated = null;
let regBusy = false;

function regReadSession(){try{return JSON.parse(localStorage.getItem(REG_SESSION_KEY)||'null')}catch{return null}}
function regSaveSession(v){regSession=v&&v.access_token?v:null;regSession?localStorage.setItem(REG_SESSION_KEY,JSON.stringify(regSession)):localStorage.removeItem(REG_SESSION_KEY)}
function regEmail(){return regSession&&regSession.user?regSession.user.email||'':''}
function regIsTgm(){return regEmail().toLowerCase().endsWith('@trigammametri.co.id')}
function regExp(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return Number(JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).exp)||0}catch{return 0}}
function regSafeBase(v){return String(v||'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim()}
function regExt(n){const i=String(n||'').lastIndexOf('.');return i>0?String(n).slice(i):''}
function regBase(n){const e=regExt(n);return e?String(n).slice(0,-e.length):String(n||'')}
function regEffectiveProfile(){const k=fncCurrentKey(),b=fncBindings();return (k?fncProfiles().find(p=>p.id===b[k]):null)||fncSelectedProfile()}
function regActive(){const p=regEffectiveProfile();return !!p&&p.id===REG_ADMIN_PROFILE_ID}
function regEsc(v){return fncEsc(v==null?'':v)}
function regFieldMeta(key){return REG_FILENAME_FIELDS.find(x=>x.key===key)||null}
function regFilenameSource(){const p=regEffectiveProfile()||fncProfiles().find(x=>x.id===REG_ADMIN_PROFILE_ID);const key=p&&p.filenameSourceField;return regFieldMeta(key)?key:''}
function regBuildFilename(row,field=regFilenameSource()){return field&&row&&row[field]!=null?regSafeBase(row[field]):''}

function regEnsureProfile(){
  const ps=fncProfiles();
  const i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);
  const existing=i>=0?ps[i]:null;
  let source=existing&&regFieldMeta(existing.filenameSourceField)?existing.filenameSourceField:'';
  if(!source&&existing&&existing.filenameRule&&Array.isArray(existing.filenameRule.fields)&&existing.filenameRule.fields.length===1&&regFieldMeta(existing.filenameRule.fields[0]))source=existing.filenameRule.fields[0];
  const p={
    id:REG_ADMIN_PROFILE_ID,
    name:'TGM Administration Document',
    delimiter:'-',
    fields:[{name:'REGISTER_IDENTITY',source:'supabase',sourceRef:'tgm_administration_document_register.document_number',contentType:'any',exactLength:'',uniqueInFolder:false}],
    profileType:'register',systemManaged:true,registerKey:'tgm_administration_document_register',identifierField:'document_number',
    filenameSourceField:source,filenameRule:null,filenameField:null,version:3
  };
  if(i<0)ps.push(p);else ps[i]={...ps[i],...p};
  fncSaveProfiles(ps);
}

function regBuild(){
  if($('regPanel')||!$('fncSection'))return;
  const s=document.createElement('style');s.id='regStyles';s.textContent=`
  .fnc-section{margin-top:18px}
  .reg-panel{display:none;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--input-bg);gap:10px;flex-direction:column}.reg-panel.show{display:flex}
  .reg-grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:9px}.reg-row{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.reg-row .fnc-field{flex:1;min-width:180px}
  .reg-note{font-size:11px;color:var(--muted);line-height:1.45}.reg-box{border:1px solid var(--line);border-radius:8px;padding:9px;background:var(--card)}.reg-box code{white-space:normal;overflow-wrap:anywhere}
  .reg-guide{border:1px dashed var(--line);border-radius:8px;padding:9px 10px;background:var(--card);font-size:11.5px;line-height:1.5;color:var(--muted)}
  .reg-form,.reg-result{display:none;gap:9px;flex-direction:column;border-top:1px solid var(--line);padding-top:10px}.reg-form.show,.reg-result.show{display:flex}
  .reg-panel textarea{min-height:70px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;background:var(--card);color:var(--ink);resize:vertical}
  @media(max-width:800px){.reg-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
  const p=document.createElement('div');p.id='regPanel';p.className='reg-panel';p.innerHTML=`
  <div class="reg-row"><div style="flex:1"><b>Administration Document Register</b><div class="reg-note">${regEsc(fncTxt('Register controls the Document Number. The profile chooses which register field becomes the physical filename.','Register mengontrol Document Number. Profile memilih field register mana yang menjadi nama file fisik.'))}</div></div><button id="regNew" class="fnc-btn-green">${regEsc(fncTxt('New Registered File','File Terdaftar Baru'))}</button></div>
  <div class="reg-guide">${regEsc(fncTxt('Recommended flow: 1) bind this profile to the folder, 2) select the filename reference field, 3) create/register a document or scan existing files.','Alur yang disarankan: 1) binding profile ini ke folder, 2) pilih field acuan filename, 3) buat/register dokumen atau scan file existing.'))}</div>
  <div class="reg-grid"><div class="reg-box"><span class="fnc-label">Register</span><br><b>tgm_administration_document_register</b></div><div class="reg-box"><span class="fnc-label">Authoritative identifier</span><br><b>document_number</b></div></div>
  <div class="reg-box"><div class="reg-row"><div style="flex:1"><span class="fnc-label">Filename reference field</span><br><b id="regSourceStatus"></b></div><button id="regSourceEdit" class="fnc-btn-slate">${regEsc(fncTxt('Choose Filename Field','Pilih Field Filename'))}</button></div><div class="reg-note" style="margin-top:6px"><span id="regSourceExample"></span></div></div>
  <div id="regSourceForm" class="reg-form"><div class="reg-note">${regEsc(fncTxt('Choose one governed register field as the complete filename base. The file extension is preserved separately.','Pilih satu field register yang governed sebagai keseluruhan base filename. Extension file dipertahankan terpisah.'))}</div><div class="reg-row"><div class="fnc-field"><label class="fnc-label">Register field used as filename</label><select id="regSourceSelect"></select></div></div><div class="reg-box"><span class="fnc-label">Preview</span><br><code id="regSourcePreview"></code></div><div class="reg-row" style="justify-content:flex-end"><button id="regSourceCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regSourceSave" class="fnc-btn-green">${regEsc(fncTxt('Save Filename Field','Simpan Field Filename'))}</button></div></div>
  <div class="reg-row" id="regLoginRow"><div class="fnc-field"><label class="fnc-label">TGM Email</label><input id="regLoginEmail" type="email" autocomplete="username"></div><div class="fnc-field"><label class="fnc-label">Password</label><input id="regLoginPassword" type="password" autocomplete="current-password"></div><button id="regLogin" class="fnc-btn-primary">${regEsc(fncTxt('Sign In','Masuk'))}</button></div>
  <div class="reg-row"><span id="regAuthBadge" class="fnc-badge warn"></span><button id="regLogout" class="fnc-btn-slate" style="display:none">${regEsc(fncTxt('Sign Out','Keluar'))}</button></div>
  <div id="regForm" class="reg-form"><div class="reg-note">${regEsc(fncTxt('Sequence is allocated atomically by Department + Document Type + Year. Global Document Number uniqueness is enforced in Supabase.','Sequence dialokasikan atomik berdasarkan Department + Document Type + Year. Unique Document Number global dijamin di Supabase.'))}</div><div class="reg-grid"><div class="fnc-field"><label class="fnc-label">TGM HO Department</label><select id="regDept"></select></div><div class="fnc-field"><label class="fnc-label">Administration Document Type</label><select id="regType"></select></div><div class="fnc-field"><label class="fnc-label">Year Release</label><input id="regYear" maxlength="4" inputmode="numeric"></div><div class="fnc-field"><label class="fnc-label">Sequence</label><input value="Allocated by Supabase" disabled></div></div><div class="fnc-field"><label class="fnc-label">Document Title</label><textarea id="regTitleText" maxlength="500"></textarea></div><div class="reg-row" style="justify-content:flex-end"><button id="regCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regCreate" class="fnc-btn-green">${regEsc(fncTxt('Create Register Entry','Buat Record Register'))}</button></div></div>
  <div id="regResult" class="reg-result"><div class="reg-grid"><div class="reg-box"><span class="fnc-label">Document Number</span><br><code id="regDocNo"></code></div><div class="reg-box"><span class="fnc-label">Expected filename base</span><br><code id="regFilename"></code></div></div><div class="reg-note" id="regResultNote"></div><div class="reg-row"><div class="fnc-field"><label class="fnc-label">Existing file</label><select id="regFile"></select></div><button id="regRename" class="fnc-btn-amber">${regEsc(fncTxt('Rename to Expected Name','Rename ke Nama Sesuai Rule'))}</button></div></div>`;
  const c=$('fncSection').querySelector('.fnc-context');c?c.insertAdjacentElement('afterend',p):$('fncSection').appendChild(p);
  $('regYear').value=String(new Date().getFullYear());
  $('regNew').onclick=regOpen;$('regCancel').onclick=()=> $('regForm').classList.remove('show');$('regCreate').onclick=regCreate;$('regLogin').onclick=regLogin;$('regLogout').onclick=regLogout;$('regRename').onclick=regRename;
  $('regSourceEdit').onclick=regSourceOpen;$('regSourceCancel').onclick=()=> $('regSourceForm').classList.remove('show');$('regSourceSave').onclick=regSourceSave;$('regSourceSelect').addEventListener('change',regSourcePreview);
  $('regLoginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')regLogin()});
  $('fncScan').addEventListener('click',e=>{if(!regActive())return;e.preventDefault();e.stopImmediatePropagation();regScan()},true);
  $('fncProfileSelect').addEventListener('change',()=>setTimeout(regRefresh,0));
  regRefresh();
}

function regSourceOptions(selected){return '<option value="">(select)</option>'+REG_FILENAME_FIELDS.map(x=>`<option value="${regEsc(x.key)}" ${x.key===selected?'selected':''}>${regEsc(x.label)} — ${regEsc(x.key)}</option>`).join('')}
function regSourceOpen(){const current=regFilenameSource();$('regSourceSelect').innerHTML=regSourceOptions(current);$('regSourceSelect').value=current;regSourcePreview();$('regSourceForm').classList.add('show')}
function regSourcePreview(){const m=regFieldMeta($('regSourceSelect').value);$('regSourcePreview').textContent=m?m.sample:fncTxt('Select a register field.','Pilih field register.')}
function regSourceSave(){const field=$('regSourceSelect').value;if(!regFieldMeta(field))return alert(fncTxt('Choose a filename field first.','Pilih field filename terlebih dahulu.'));const ps=fncProfiles(),i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);if(i<0)return;ps[i]={...ps[i],filenameSourceField:field,filenameRule:null,filenameField:null,updatedAt:new Date().toISOString(),version:3};fncSaveProfiles(ps);$('regSourceForm').classList.remove('show');fncRefreshProfiles(REG_ADMIN_PROFILE_ID);regRefresh()}

function regRefresh(){
  if(!$('regPanel'))return;
  $('regPanel').classList.toggle('show',regActive());
  const field=regFilenameSource(),meta=regFieldMeta(field),configured=!!meta;
  $('regSourceStatus').textContent=configured?meta.label:fncTxt('Not configured','Belum dikonfigurasi');$('regSourceStatus').style.color=configured?'var(--green)':'var(--amber)';
  $('regSourceExample').textContent=configured?fncTxt('Example filename base: ','Contoh base filename: ')+meta.sample:fncTxt('Choose Document Number or Document ID / Letter ID as the filename source.','Pilih Document Number atau Document ID / Letter ID sebagai sumber filename.');
  const signed=regIsTgm();$('regAuthBadge').textContent=signed?fncTxt('Signed in: ','Login: ')+regEmail():fncTxt('TGM sign-in required','Perlu login TGM');$('regAuthBadge').className='fnc-badge '+(signed?'ok':'warn');
  $('regLoginRow').style.display=signed?'none':'flex';$('regLogout').style.display=signed?'':'none';$('regNew').disabled=regBusy||!regActive()||!fncCurrentKey()||!signed;
  if(regActive()&&$('fncScan'))$('fncScan').disabled=regBusy||!fncCurrentKey()||!configured||!signed;
  if(regIsSystemSelected()){$('fncEdit').disabled=true;$('fncDelete').disabled=true}regFiles();
}
function regIsSystemSelected(){const p=fncSelectedProfile();return p&&p.id===REG_ADMIN_PROFILE_ID}

async function regRefreshToken(){if(!regSession||!regSession.refresh_token){regSaveSession(null);return null}const r=await fetch(REG_SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:REG_SB_KEY,'content-type':'application/json'},body:JSON.stringify({refresh_token:regSession.refresh_token})});if(!r.ok){regSaveSession(null);return null}regSaveSession(await r.json());return regSession}
async function regEnsureSession(){if(!regSession||!regSession.access_token)return null;const e=regExp(regSession.access_token);if(e&&e<=Math.floor(Date.now()/1000)+60)return regRefreshToken();return regSession}
async function regFetch(path,init={},retry=true){const s=await regEnsureSession();if(!s)throw new Error(fncTxt('TGM sign-in required.','Login TGM diperlukan.'));const h=new Headers(init.headers||{});h.set('apikey',REG_SB_KEY);h.set('Authorization','Bearer '+s.access_token);if(init.body&&!h.has('content-type'))h.set('content-type','application/json');const r=await fetch(REG_SB_URL+path,{...init,headers:h});if(r.status===401&&retry&&s.refresh_token){if(await regRefreshToken())return regFetch(path,init,false)}return r}
async function regErr(r){try{const j=await r.json();return j.message||j.error_description||j.error||r.statusText}catch{return r.statusText||'Request failed'}}

async function regLogin(){const email=$('regLoginEmail').value.trim().toLowerCase(),password=$('regLoginPassword').value;if(!email.endsWith('@trigammametri.co.id'))return alert('Use a @trigammametri.co.id account.');if(!password)return alert(fncTxt('Password is required.','Password wajib diisi.'));regBusy=true;regRefresh();try{const r=await fetch(REG_SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:REG_SB_KEY,'content-type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)throw new Error(await regErr(r));regSaveSession(await r.json());$('regLoginPassword').value='';regMasters=null;await regLoadMasters()}catch(e){regSaveSession(null);alert(fncTxt('Sign-in failed: ','Login gagal: ')+e.message)}finally{regBusy=false;regRefresh()}}
async function regLogout(){try{if(regSession)await fetch(REG_SB_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:REG_SB_KEY,Authorization:'Bearer '+regSession.access_token}})}catch{}regSaveSession(null);regMasters=null;regCreated=null;$('regForm').classList.remove('show');$('regResult').classList.remove('show');regRefresh()}

async function regLoadMasters(){if(regMasters){regOptions();return}const [a,b]=await Promise.all([regFetch('/rest/v1/department_ho_master?select=id,department_code,department_name&is_active=eq.true&order=department_code.asc'),regFetch('/rest/v1/tgm_administration_document_code_master?select=id,doc_code,doc_name&is_active=eq.true&order=doc_code.asc')]);if(!a.ok)throw new Error(await regErr(a));if(!b.ok)throw new Error(await regErr(b));regMasters={departments:await a.json(),types:await b.json()};regOptions()}
function regOptions(){const d=regMasters?regMasters.departments:[],t=regMasters?regMasters.types:[];$('regDept').innerHTML='<option value="">(select)</option>'+d.map(x=>`<option value="${regEsc(x.id)}">${regEsc(x.department_code)} — ${regEsc(x.department_name||'')}</option>`).join('');$('regType').innerHTML='<option value="">(select)</option>'+t.map(x=>`<option value="${regEsc(x.id)}">${regEsc(x.doc_code)} — ${regEsc(x.doc_name||'')}</option>`).join('')}
async function regOpen(){if(!fncCurrentKey())return alert(fncTxt('Pick a folder first.','Pilih folder terlebih dahulu.'));if(!regIsTgm())return alert(fncTxt('Sign in first.','Login terlebih dahulu.'));regBusy=true;regRefresh();try{await regLoadMasters();$('regForm').classList.add('show');$('regResult').classList.remove('show')}catch(e){alert(fncTxt('Could not load register data: ','Gagal memuat data register: ')+e.message)}finally{regBusy=false;regRefresh()}}

async function regCreate(){const d=$('regDept').value,t=$('regType').value,y=$('regYear').value.trim(),title=$('regTitleText').value.trim();if(!d||!t)return alert(fncTxt('Department and Document Type are required.','Department dan Document Type wajib dipilih.'));if(!/^\d{4}$/.test(y))return alert('Year Release must be 4 digits.');if(!title)return alert(fncTxt('Document Title is required.','Document Title wajib diisi.'));regBusy=true;regRefresh();try{const r=await regFetch('/rest/v1/rpc/register_create_tgm_administration_document',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_department_id:d,p_document_type_id:t,p_year_release:y,p_document_title:title})});if(!r.ok)throw new Error(await regErr(r));const j=await r.json(),row=Array.isArray(j)?j[0]:j;if(!row||!row.document_number)throw new Error('No Document Number returned.');row.filename=regBuildFilename(row);regCreated=row;$('regDocNo').textContent=row.document_number;$('regFilename').textContent=row.filename||fncTxt('Filename field not configured','Field filename belum dikonfigurasi');$('regResultNote').textContent=row.filename?fncTxt('The register record is created. You can now rename an existing file to the value from the selected register field.','Record register sudah dibuat. File existing sekarang dapat di-rename ke value dari field register yang dipilih.'):fncTxt('The register record is created, but no filename can be suggested until a filename reference field is selected.','Record register sudah dibuat, tetapi filename belum dapat disarankan sampai field acuan filename dipilih.');$('regForm').classList.remove('show');$('regResult').classList.add('show');$('regTitleText').value='';regFiles()}catch(e){alert(fncTxt('Register creation failed: ','Pembuatan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}}

function regFiles(){if(!$('regFile'))return;const curv=$('regFile').value,fs=state.entries.filter(e=>e.kind==='file');$('regFile').innerHTML='<option value="">(select existing file)</option>'+fs.map(x=>`<option value="${regEsc(x.name)}">${regEsc(x.name)}</option>`).join('');if(fs.some(x=>x.name===curv))$('regFile').value=curv;$('regRename').disabled=regBusy||!regCreated||!regCreated.filename||!fs.length}
async function regRename(){if(!regCreated||!regCreated.filename)return alert(fncTxt('Choose a filename reference field first.','Pilih field acuan filename terlebih dahulu.'));const n=$('regFile').value,e=state.entries.find(x=>x.kind==='file'&&x.name===n),p=cur();if(!e||!p)return alert(fncTxt('Select a valid file.','Pilih file yang valid.'));const nn=regCreated.filename+regExt(e.name);if(state.entries.some(x=>x.name!==e.name&&x.name.toLowerCase()===nn.toLowerCase()))return alert(fncTxt('Target filename already exists.','Nama file target sudah ada.'));if(!confirm(`Rename "${e.name}" → "${nn}"?`))return;regBusy=true;regRefresh();try{let moved=false;if(e.handle&&typeof e.handle.move==='function')try{await e.handle.move(nn);moved=true}catch{}if(!moved){const f=await e.handle.getFile(),dh=await p.getFileHandle(nn,{create:true}),w=await dh.createWritable();await w.write(f);await w.close();await p.removeEntry(e.name)}await loadCurrent();alert(fncTxt('File renamed.','File berhasil di-rename.'))}catch(x){alert(fncTxt('Rename failed: ','Rename gagal: ')+x.message)}finally{regBusy=false;regRefresh()}}

async function regScan(){const field=regFilenameSource();if(!regFieldMeta(field))return alert(fncTxt('Choose a filename reference field first.','Pilih field acuan filename terlebih dahulu.'));regBusy=true;regRefresh();try{const select=[...new Set(['document_number','letter_id','is_active',field])].join(',');const r=await regFetch('/rest/v1/tgm_administration_document_register?select='+encodeURIComponent(select)+'&is_active=eq.true&order=document_number.asc');if(!r.ok)throw new Error(await regErr(r));const rows=await r.json(),exact=new Map(),nums=new Map();rows.forEach(x=>{const expected=regBuildFilename(x,field);if(expected)exact.set(expected.toLowerCase(),{...x,expected});if(x.document_number)nums.set(String(x.document_number).toLowerCase(),{...x,expected})});const keys=[...nums.keys()].sort((a,b)=>b.length-a.length);fncLastScan=state.entries.filter(e=>e.kind==='file').map(f=>{const b=regBase(f.name),l=b.toLowerCase(),issues=[];if(!exact.has(l)){const k=keys.find(n=>l===n||l.startsWith(n+'_')||l.startsWith(n+'-')||l.startsWith(n+' '));if(k){const x=nums.get(k);issues.push(fncTxt(`Register found, but expected filename from ${field} is "${x.expected}".`,`Register ditemukan, tetapi filename berdasarkan ${field} seharusnya "${x.expected}".`))}else issues.push(fncTxt(`Filename does not match any active ${field} value in Administration Document Register.`,`Filename tidak cocok dengan value ${field} aktif mana pun pada Administration Document Register.`))}return{file:f.name,values:[b],issues,warnings:[]}});$('fncResults').classList.add('show');fncRenderResults(regEffectiveProfile())}catch(e){alert(fncTxt('Register scan failed: ','Scan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}}

function regHooks(){if(typeof fncRefreshContext==='function'){const o=fncRefreshContext;fncRefreshContext=function(){const r=o.apply(this,arguments);regRefresh();return r}}if(typeof setLang==='function'){const o=setLang;setLang=function(){const r=o.apply(this,arguments);regRefresh();return r}}}

regEnsureProfile();regBuild();regHooks();fncRefreshProfiles(fncSelectedProfileId()||REG_ADMIN_PROFILE_ID);regRefresh();
setTimeout(async()=>{if(regSession)try{await regEnsureSession()}catch{regSaveSession(null)}regRefresh()},0);
