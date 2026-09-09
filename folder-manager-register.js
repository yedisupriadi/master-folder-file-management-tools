// TGM Administration Document Register integration v2.
// Injected inside Folder Manager core IIFE after folder-manager-naming.js.
const REG_ADMIN_PROFILE_ID = 'system:tgm-administration-document-v1';
const REG_SESSION_KEY = 'fm-tgm-register-session-v1';
const REG_SB_URL = 'https://slqplzovrotfiohcijap.supabase.co';
const REG_SB_KEY = 'sb_publishable_T0UcbTPfA7prgfDSv9pH4g_Ficd15vO';
const REG_FILENAME_FIELDS = [
  { key: 'document_number', label: 'Document Number', sample: 'TGM-EXT-QUO-020-2026' },
  { key: 'document_title', label: 'Document Title', sample: 'Quotation Leok' },
  { key: 'letter_id', label: 'Document ID / Letter ID', sample: 'TGM-EXT-QUO-020-2026_Quotation Leok' },
  { key: 'sequence_number', label: 'Sequence Number', sample: '020' },
  { key: 'year_release', label: 'Year Release', sample: '2026' },
  { key: 'project', label: 'Project', sample: 'SUTT 150kV Leok-Tolinggula' },
  { key: 'tgm_services', label: 'TGM Services', sample: 'BIM' },
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

function regFilenameRule(){
  const p=regEffectiveProfile()||fncProfiles().find(x=>x.id===REG_ADMIN_PROFILE_ID);
  const r=p&&p.filenameRule;
  if(!r||!Array.isArray(r.fields)||!r.fields.length)return null;
  const fields=r.fields.filter(k=>!!regFieldMeta(k));
  if(!fields.length)return null;
  return { delimiter: typeof r.delimiter==='string'?r.delimiter:'_', fields };
}
function regRuleConfigured(){const r=regFilenameRule();return !!r&&r.fields.includes('document_number')}
function regRulePattern(rule=regFilenameRule()){
  if(!rule)return fncTxt('Not configured','Belum dikonfigurasi');
  return rule.fields.map(k=>`{${k}}`).join(rule.delimiter);
}
function regRuleExample(rule=regFilenameRule()){
  if(!rule)return fncTxt('Set a filename rule in the profile. The register itself does not define the physical filename.','Atur naming rule pada profile. Register sendiri tidak menentukan nama file fisik.');
  const sample={};REG_FILENAME_FIELDS.forEach(x=>{sample[x.key]=x.sample});
  return regBuildFilename(sample,rule);
}
function regBuildFilename(row,rule=regFilenameRule()){
  if(!rule)return '';
  const values=rule.fields.map(k=>row&&row[k]!=null?String(row[k]):'');
  return regSafeBase(values.join(rule.delimiter));
}

function regEnsureProfile(){
  const ps=fncProfiles();
  const i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);
  const existing=i>=0?ps[i]:null;
  const p={
    id:REG_ADMIN_PROFILE_ID,
    name:'TGM Administration Document',
    delimiter:'-',
    fields:[{name:'REGISTER_IDENTITY',source:'supabase',sourceRef:'tgm_administration_document_register.document_number',contentType:'any',exactLength:'',uniqueInFolder:false}],
    profileType:'register',
    systemManaged:true,
    registerKey:'tgm_administration_document_register',
    identifierField:'document_number',
    filenameField:null,
    filenameRule:existing&&existing.filenameRule?existing.filenameRule:null,
    version:2
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
  .reg-rule-fields{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px}.reg-rule-field{display:flex;flex-direction:column;gap:5px}
  .reg-panel textarea{min-height:70px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;background:var(--card);color:var(--ink);resize:vertical}
  @media(max-width:800px){.reg-grid,.reg-rule-fields{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
  const p=document.createElement('div');p.id='regPanel';p.className='reg-panel';p.innerHTML=`
  <div class="reg-row"><div style="flex:1"><b>${regEsc(fncTxt('Administration Document Register','Administration Document Register'))}</b><div class="reg-note">${regEsc(fncTxt('Register controls the authoritative Document Number. The naming profile separately controls the physical filename.','Register mengontrol Document Number yang authoritative. Naming profile secara terpisah mengontrol nama file fisik.'))}</div></div><button id="regNew" class="fnc-btn-green">${regEsc(fncTxt('New Registered File','File Terdaftar Baru'))}</button></div>
  <div class="reg-guide">${regEsc(fncTxt('Recommended flow: 1) bind this profile to the folder, 2) configure the filename rule, 3) create/register a new document or scan existing files.','Alur yang disarankan: 1) binding profile ini ke folder, 2) atur naming rule filename, 3) buat/register dokumen baru atau scan file existing.'))}</div>
  <div class="reg-grid"><div class="reg-box"><span class="fnc-label">Register</span><br><b>tgm_administration_document_register</b></div><div class="reg-box"><span class="fnc-label">Authoritative identifier</span><br><b>document_number</b></div></div>
  <div class="reg-box"><div class="reg-row"><div style="flex:1"><span class="fnc-label">Filename naming rule</span><br><b id="regRuleStatus"></b></div><button id="regRuleEdit" class="fnc-btn-slate">${regEsc(fncTxt('Configure Filename Rule','Atur Naming Rule'))}</button></div><div class="reg-note" style="margin-top:6px"><code id="regRulePattern"></code></div><div class="reg-note" style="margin-top:4px"><span id="regRuleExample"></span></div></div>
  <div id="regRuleForm" class="reg-form"><div class="reg-note">${regEsc(fncTxt('This configuration belongs to the Naming Profile, not to the register. Document Number is required so files can be reconciled reliably back to the register.','Konfigurasi ini milik Naming Profile, bukan register. Document Number wajib agar file dapat direkonsiliasi secara andal kembali ke register.'))}</div><div class="reg-row"><div class="fnc-field"><label class="fnc-label">Delimiter</label><input id="regRuleDelimiter" maxlength="5" value="_"></div><div class="fnc-field"><label class="fnc-label">Field count</label><input id="regRuleCount" type="number" min="1" max="8" value="2"></div><button id="regRuleApply" class="fnc-btn-slate">${regEsc(fncTxt('Set Fields','Set Field'))}</button></div><div id="regRuleFields" class="reg-rule-fields"></div><div class="reg-box"><span class="fnc-label">Preview pattern</span><br><code id="regRulePreviewPattern"></code><div class="reg-note" id="regRulePreviewExample"></div></div><div class="reg-row" style="justify-content:flex-end"><button id="regRuleCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regRuleSave" class="fnc-btn-green">${regEsc(fncTxt('Save Filename Rule','Simpan Naming Rule'))}</button></div></div>
  <div class="reg-row" id="regLoginRow"><div class="fnc-field"><label class="fnc-label">TGM Email</label><input id="regLoginEmail" type="email" autocomplete="username"></div><div class="fnc-field"><label class="fnc-label">Password</label><input id="regLoginPassword" type="password" autocomplete="current-password"></div><button id="regLogin" class="fnc-btn-primary">${regEsc(fncTxt('Sign In','Masuk'))}</button></div>
  <div class="reg-row"><span id="regAuthBadge" class="fnc-badge warn"></span><button id="regLogout" class="fnc-btn-slate" style="display:none">${regEsc(fncTxt('Sign Out','Keluar'))}</button></div>
  <div id="regForm" class="reg-form"><div class="reg-note">${regEsc(fncTxt('Sequence is allocated atomically by Department + Document Type + Year. Global Document Number uniqueness is enforced in Supabase.','Sequence dialokasikan atomik berdasarkan Department + Document Type + Year. Unique Document Number global dijamin di Supabase.'))}</div><div class="reg-grid"><div class="fnc-field"><label class="fnc-label">TGM HO Department</label><select id="regDept"></select></div><div class="fnc-field"><label class="fnc-label">Administration Document Type</label><select id="regType"></select></div><div class="fnc-field"><label class="fnc-label">Year Release</label><input id="regYear" maxlength="4" inputmode="numeric"></div><div class="fnc-field"><label class="fnc-label">Sequence</label><input value="Allocated by Supabase" disabled></div></div><div class="fnc-field"><label class="fnc-label">Document Title</label><textarea id="regTitleText" maxlength="500"></textarea></div><div class="reg-row" style="justify-content:flex-end"><button id="regCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regCreate" class="fnc-btn-green">${regEsc(fncTxt('Create Register Entry','Buat Record Register'))}</button></div></div>
  <div id="regResult" class="reg-result"><div class="reg-grid"><div class="reg-box"><span class="fnc-label">Document Number</span><br><code id="regDocNo"></code></div><div class="reg-box"><span class="fnc-label">Expected filename base</span><br><code id="regFilename"></code></div></div><div class="reg-note" id="regResultNote"></div><div class="reg-row"><div class="fnc-field"><label class="fnc-label">Existing file</label><select id="regFile"></select></div><button id="regRename" class="fnc-btn-amber">${regEsc(fncTxt('Rename to Expected Name','Rename ke Nama Sesuai Rule'))}</button></div></div>`;
  const c=$('fncSection').querySelector('.fnc-context');c?c.insertAdjacentElement('afterend',p):$('fncSection').appendChild(p);
  $('regYear').value=String(new Date().getFullYear());
  $('regNew').onclick=regOpen;$('regCancel').onclick=()=> $('regForm').classList.remove('show');$('regCreate').onclick=regCreate;$('regLogin').onclick=regLogin;$('regLogout').onclick=regLogout;$('regRename').onclick=regRename;
  $('regRuleEdit').onclick=regRuleOpen;$('regRuleCancel').onclick=()=> $('regRuleForm').classList.remove('show');$('regRuleApply').onclick=()=>regRuleApplyCount(true);$('regRuleSave').onclick=regRuleSave;
  $('regRuleDelimiter').addEventListener('input',regRulePreview);$('regRuleCount').addEventListener('change',()=>regRuleApplyCount(true));
  $('regLoginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')regLogin()});
  $('fncScan').addEventListener('click',e=>{if(!regActive())return;e.preventDefault();e.stopImmediatePropagation();regScan()},true);
  $('fncProfileSelect').addEventListener('change',()=>setTimeout(regRefresh,0));
  regRefresh();
}

function regRuleOptions(selected){return REG_FILENAME_FIELDS.map(x=>`<option value="${regEsc(x.key)}" ${x.key===selected?'selected':''}>${regEsc(x.label)} — ${regEsc(x.key)}</option>`).join('')}
function regRuleRenderFields(fields){
  const el=$('regRuleFields');if(!el)return;el.innerHTML='';fields.forEach((key,i)=>{const d=document.createElement('div');d.className='reg-rule-field';d.innerHTML=`<label class="fnc-label">Field ${i+1}</label><select class="reg-rule-select">${regRuleOptions(key)}</select>`;el.appendChild(d);d.querySelector('select').addEventListener('change',regRulePreview)});regRulePreview()
}
function regRuleReadFields(){return $('regRuleFields')?Array.from($('regRuleFields').querySelectorAll('.reg-rule-select')).map(x=>x.value):[]}
function regRuleApplyCount(preserve){const n=Math.max(1,Math.min(8,Number($('regRuleCount').value)||1));$('regRuleCount').value=n;const old=preserve?regRuleReadFields():[];const defaults=['document_number','document_title'];const fields=Array.from({length:n},(_,i)=>old[i]||defaults[i]||'document_title');regRuleRenderFields(fields)}
function regRulePreview(){
  if(!$('regRulePreviewPattern'))return;const fields=regRuleReadFields();const rule={delimiter:$('regRuleDelimiter').value,fields};$('regRulePreviewPattern').textContent=fields.map(k=>`{${k}}`).join(rule.delimiter);$('regRulePreviewExample').textContent=fncTxt('Example preview: ','Contoh preview: ')+regRuleExample(rule)
}
function regRuleOpen(){
  const r=regFilenameRule();$('regRuleDelimiter').value=r?r.delimiter:'_';const fields=r?r.fields:['document_number','document_title'];$('regRuleCount').value=fields.length;regRuleRenderFields(fields);$('regRuleForm').classList.add('show')
}
function regRuleSave(){
  const delimiter=$('regRuleDelimiter').value,fields=regRuleReadFields();if(!fields.length)return alert(fncTxt('At least one field is required.','Minimal satu field wajib dipilih.'));if(fields.length>1&&!delimiter)return alert(fncTxt('Delimiter is required when using more than one field.','Delimiter wajib diisi jika menggunakan lebih dari satu field.'));if(!fields.includes('document_number'))return alert(fncTxt('Document Number is required in this profile so files remain traceable to the register.','Document Number wajib ada pada profile ini agar file tetap dapat ditelusuri ke register.'));
  const ps=fncProfiles(),i=ps.findIndex(x=>x.id===REG_ADMIN_PROFILE_ID);if(i<0)return;ps[i]={...ps[i],filenameRule:{delimiter,fields},updatedAt:new Date().toISOString(),version:2};fncSaveProfiles(ps);$('regRuleForm').classList.remove('show');fncRefreshProfiles(REG_ADMIN_PROFILE_ID);regRefresh()
}

function regRefresh(){
  if(!$('regPanel'))return;
  $('regPanel').classList.toggle('show',regActive());
  const rule=regFilenameRule(),configured=regRuleConfigured();$('regRuleStatus').textContent=configured?fncTxt('Configured','Terkonfigurasi'):fncTxt('Not configured','Belum dikonfigurasi');$('regRuleStatus').style.color=configured?'var(--green)':'var(--amber)';$('regRulePattern').textContent=configured?regRulePattern(rule):fncTxt('No physical filename rule is active yet.','Belum ada rule nama file fisik yang aktif.');$('regRuleExample').textContent=configured?fncTxt('Example: ','Contoh: ')+regRuleExample(rule):fncTxt('Example proposal available via “Configure Filename Rule”; saving it makes the rule active.','Contoh usulan tersedia melalui “Atur Naming Rule”; rule baru aktif setelah disimpan.');
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

async function regLogin(){
  const email=$('regLoginEmail').value.trim().toLowerCase(),password=$('regLoginPassword').value;if(!email.endsWith('@trigammametri.co.id'))return alert('Use a @trigammametri.co.id account.');if(!password)return alert(fncTxt('Password is required.','Password wajib diisi.'));
  regBusy=true;regRefresh();try{const r=await fetch(REG_SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:REG_SB_KEY,'content-type':'application/json'},body:JSON.stringify({email,password})});if(!r.ok)throw new Error(await regErr(r));regSaveSession(await r.json());$('regLoginPassword').value='';regMasters=null;await regLoadMasters()}catch(e){regSaveSession(null);alert(fncTxt('Sign-in failed: ','Login gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
}
async function regLogout(){try{if(regSession)await fetch(REG_SB_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:REG_SB_KEY,Authorization:'Bearer '+regSession.access_token}})}catch{}regSaveSession(null);regMasters=null;regCreated=null;$('regForm').classList.remove('show');$('regResult').classList.remove('show');regRefresh()}

async function regLoadMasters(){
  if(regMasters){regOptions();return}const [a,b]=await Promise.all([regFetch('/rest/v1/department_ho_master?select=id,department_code,department_name&is_active=eq.true&order=department_code.asc'),regFetch('/rest/v1/tgm_administration_document_code_master?select=id,doc_code,doc_name&is_active=eq.true&order=doc_code.asc')]);if(!a.ok)throw new Error(await regErr(a));if(!b.ok)throw new Error(await regErr(b));regMasters={departments:await a.json(),types:await b.json()};regOptions()
}
function regOptions(){const d=regMasters?regMasters.departments:[],t=regMasters?regMasters.types:[];$('regDept').innerHTML='<option value="">(select)</option>'+d.map(x=>`<option value="${regEsc(x.id)}">${regEsc(x.department_code)} — ${regEsc(x.department_name||'')}</option>`).join('');$('regType').innerHTML='<option value="">(select)</option>'+t.map(x=>`<option value="${regEsc(x.id)}">${regEsc(x.doc_code)} — ${regEsc(x.doc_name||'')}</option>`).join('')}
async function regOpen(){if(!fncCurrentKey())return alert(fncTxt('Pick a folder first.','Pilih folder terlebih dahulu.'));if(!regIsTgm())return alert(fncTxt('Sign in first.','Login terlebih dahulu.'));regBusy=true;regRefresh();try{await regLoadMasters();$('regForm').classList.add('show');$('regResult').classList.remove('show')}catch(e){alert(fncTxt('Could not load register data: ','Gagal memuat data register: ')+e.message)}finally{regBusy=false;regRefresh()}}

async function regCreate(){
  const d=$('regDept').value,t=$('regType').value,y=$('regYear').value.trim(),title=$('regTitleText').value.trim();if(!d||!t)return alert(fncTxt('Department and Document Type are required.','Department dan Document Type wajib dipilih.'));if(!/^\d{4}$/.test(y))return alert('Year Release must be 4 digits.');if(!title)return alert(fncTxt('Document Title is required.','Document Title wajib diisi.'));
  regBusy=true;regRefresh();try{const r=await regFetch('/rest/v1/rpc/register_create_tgm_administration_document',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_department_id:d,p_document_type_id:t,p_year_release:y,p_document_title:title})});if(!r.ok)throw new Error(await regErr(r));const j=await r.json(),row=Array.isArray(j)?j[0]:j;if(!row||!row.document_number)throw new Error('No Document Number returned.');row.filename=regBuildFilename(row);regCreated=row;$('regDocNo').textContent=row.document_number;$('regFilename').textContent=row.filename||fncTxt('Naming rule not configured','Naming rule belum dikonfigurasi');$('regResultNote').textContent=row.filename?fncTxt('The register record is created. You can now rename an existing file in the open folder to the expected filename.','Record register sudah dibuat. File existing di folder aktif sekarang dapat di-rename ke filename yang sesuai rule.'):fncTxt('The register record is created, but no physical filename is suggested until the Naming Profile rule is configured.','Record register sudah dibuat, tetapi nama file fisik belum dapat disarankan sampai Naming Profile dikonfigurasi.');$('regForm').classList.remove('show');$('regResult').classList.add('show');$('regTitleText').value='';regFiles()}catch(e){alert(fncTxt('Register creation failed: ','Pembuatan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
}

function regFiles(){if(!$('regFile'))return;const curv=$('regFile').value,fs=state.entries.filter(e=>e.kind==='file');$('regFile').innerHTML='<option value="">(select existing file)</option>'+fs.map(x=>`<option value="${regEsc(x.name)}">${regEsc(x.name)}</option>`).join('');if(fs.some(x=>x.name===curv))$('regFile').value=curv;$('regRename').disabled=regBusy||!regCreated||!regCreated.filename||!fs.length}
async function regRename(){
  if(!regCreated||!regCreated.filename)return alert(fncTxt('Configure a filename rule first.','Atur naming rule filename terlebih dahulu.'));const n=$('regFile').value,e=state.entries.find(x=>x.kind==='file'&&x.name===n),p=cur();if(!e||!p)return alert(fncTxt('Select a valid file.','Pilih file yang valid.'));const nn=regCreated.filename+regExt(e.name);if(state.entries.some(x=>x.name!==e.name&&x.name.toLowerCase()===nn.toLowerCase()))return alert(fncTxt('Target filename already exists.','Nama file target sudah ada.'));if(!confirm(`Rename "${e.name}" → "${nn}"?`))return;regBusy=true;regRefresh();try{let moved=false;if(e.handle&&typeof e.handle.move==='function')try{await e.handle.move(nn);moved=true}catch{}if(!moved){const f=await e.handle.getFile(),dh=await p.getFileHandle(nn,{create:true}),w=await dh.createWritable();await w.write(f);await w.close();await p.removeEntry(e.name)}await loadCurrent();alert(fncTxt('File renamed.','File berhasil di-rename.'))}catch(x){alert(fncTxt('Rename failed: ','Rename gagal: ')+x.message)}finally{regBusy=false;regRefresh()}
}

async function regScan(){
  const rule=regFilenameRule();if(!rule||!rule.fields.includes('document_number'))return alert(fncTxt('Configure the filename rule first.','Atur naming rule filename terlebih dahulu.'));
  regBusy=true;regRefresh();try{const select=[...new Set(['document_number','is_active',...rule.fields])].join(',');const r=await regFetch('/rest/v1/tgm_administration_document_register?select='+encodeURIComponent(select)+'&is_active=eq.true&order=document_number.asc');if(!r.ok)throw new Error(await regErr(r));const rows=await r.json(),exact=new Map(),nums=new Map();rows.forEach(x=>{const expected=regBuildFilename(x,rule);if(expected)exact.set(expected.toLowerCase(),{...x,expected});nums.set(String(x.document_number).toLowerCase(),{...x,expected})});const keys=[...nums.keys()].sort((a,b)=>b.length-a.length);fncLastScan=state.entries.filter(e=>e.kind==='file').map(f=>{const b=regBase(f.name),l=b.toLowerCase(),issues=[];if(!exact.has(l)){const k=keys.find(n=>l===n||l.startsWith(n+'_')||l.startsWith(n+'-')||l.startsWith(n+' '));if(k){const x=nums.get(k);issues.push(fncTxt(`Register found, but expected filename is "${x.expected}".`,`Register ditemukan, tetapi filename seharusnya "${x.expected}".`))}else issues.push(fncTxt('Filename does not match any active Administration Document Register record.','Filename tidak cocok dengan record aktif mana pun pada Administration Document Register.'))}return{file:f.name,values:[b],issues,warnings:[]}});$('fncResults').classList.add('show');fncRenderResults(regEffectiveProfile())}catch(e){alert(fncTxt('Register scan failed: ','Scan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
}

function regHooks(){
  if(typeof fncRefreshContext==='function'){const o=fncRefreshContext;fncRefreshContext=function(){const r=o.apply(this,arguments);regRefresh();return r}}
  if(typeof setLang==='function'){const o=setLang;setLang=function(){const r=o.apply(this,arguments);regRefresh();return r}}
}

regEnsureProfile();regBuild();regHooks();fncRefreshProfiles(fncSelectedProfileId()||REG_ADMIN_PROFILE_ID);regRefresh();
setTimeout(async()=>{if(regSession)try{await regEnsureSession()}catch{regSaveSession(null)}regRefresh()},0);
