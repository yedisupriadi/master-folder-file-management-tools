// TGM Administration Document Register integration v1.
// Injected inside Folder Manager core IIFE after folder-manager-naming.js.
const REG_ADMIN_PROFILE_ID = 'system:tgm-administration-document-v1';
const REG_SESSION_KEY = 'fm-tgm-register-session-v1';
const REG_SB_URL = 'https://slqplzovrotfiohcijap.supabase.co';
const REG_SB_KEY = 'sb_publishable_T0UcbTPfA7prgfDSv9pH4g_Ficd15vO';
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

function regEnsureProfile(){
  const ps=fncProfiles();
  const p={
    id:REG_ADMIN_PROFILE_ID,name:'TGM Administration Document',delimiter:'-',
    fields:[{name:'REGISTER_IDENTITY',source:'supabase',sourceRef:'tgm_administration_document_register.letter_id',contentType:'any',exactLength:'',uniqueInFolder:false}],
    profileType:'register',systemManaged:true,registerKey:'tgm_administration_document_register',identifierField:'document_number',filenameField:'letter_id',version:1
  };
  const i=ps.findIndex(x=>x.id===p.id);if(i<0)ps.push(p);else ps[i]={...ps[i],...p};fncSaveProfiles(ps);
}

function regBuild(){
  if($('regPanel')||!$('fncSection'))return;
  const s=document.createElement('style');s.id='regStyles';s.textContent=`
  .reg-panel{display:none;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--input-bg);gap:10px;flex-direction:column}.reg-panel.show{display:flex}
  .reg-grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:9px}.reg-row{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.reg-row .fnc-field{flex:1;min-width:180px}
  .reg-note{font-size:11px;color:var(--muted);line-height:1.45}.reg-box{border:1px solid var(--line);border-radius:8px;padding:9px;background:var(--card)}.reg-box code{white-space:normal;overflow-wrap:anywhere}
  .reg-form,.reg-result{display:none;gap:9px;flex-direction:column;border-top:1px solid var(--line);padding-top:10px}.reg-form.show,.reg-result.show{display:flex}
  .reg-panel textarea{min-height:70px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;background:var(--card);color:var(--ink);resize:vertical}@media(max-width:800px){.reg-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
  const p=document.createElement('div');p.id='regPanel';p.className='reg-panel';p.innerHTML=`
  <div class="reg-row"><div style="flex:1"><b>${regEsc(fncTxt('Administration Document Register','Administration Document Register'))}</b><div class="reg-note">${regEsc(fncTxt('Register-first creation with Supabase-controlled Document Number and folder compliance scan.','Pembuatan register-first dengan Document Number terkontrol Supabase dan scan compliance folder.'))}</div></div><button id="regNew" class="fnc-btn-green">${regEsc(fncTxt('New Registered File','File Terdaftar Baru'))}</button></div>
  <div class="reg-grid"><div class="reg-box"><span class="fnc-label">Register</span><br><b>tgm_administration_document_register</b></div><div class="reg-box"><span class="fnc-label">Filename source</span><br><b>letter_id → filesystem-safe</b></div></div>
  <div class="reg-row" id="regLoginRow"><div class="fnc-field"><label class="fnc-label">TGM Email</label><input id="regLoginEmail" type="email" autocomplete="username"></div><div class="fnc-field"><label class="fnc-label">Password</label><input id="regLoginPassword" type="password" autocomplete="current-password"></div><button id="regLogin" class="fnc-btn-primary">${regEsc(fncTxt('Sign In','Masuk'))}</button></div>
  <div class="reg-row"><span id="regAuthBadge" class="fnc-badge warn"></span><button id="regLogout" class="fnc-btn-slate" style="display:none">${regEsc(fncTxt('Sign Out','Keluar'))}</button></div>
  <div id="regForm" class="reg-form"><div class="reg-note">${regEsc(fncTxt('Sequence is allocated atomically by Department + Document Type + Year. Global Document Number uniqueness is enforced in Supabase.','Sequence dialokasikan atomik berdasarkan Department + Document Type + Year. Unique Document Number global dijamin di Supabase.'))}</div><div class="reg-grid"><div class="fnc-field"><label class="fnc-label">TGM HO Department</label><select id="regDept"></select></div><div class="fnc-field"><label class="fnc-label">Administration Document Type</label><select id="regType"></select></div><div class="fnc-field"><label class="fnc-label">Year Release</label><input id="regYear" maxlength="4" inputmode="numeric"></div><div class="fnc-field"><label class="fnc-label">Sequence</label><input value="Allocated by Supabase" disabled></div></div><div class="fnc-field"><label class="fnc-label">Document Title</label><textarea id="regTitleText" maxlength="500"></textarea></div><div class="reg-row" style="justify-content:flex-end"><button id="regCancel" class="fnc-btn-slate">${regEsc(fncTxt('Cancel','Batal'))}</button><button id="regCreate" class="fnc-btn-green">${regEsc(fncTxt('Create Register Entry','Buat Record Register'))}</button></div></div>
  <div id="regResult" class="reg-result"><div class="reg-grid"><div class="reg-box"><span class="fnc-label">Document Number</span><br><code id="regDocNo"></code></div><div class="reg-box"><span class="fnc-label">Suggested filename base</span><br><code id="regFilename"></code></div></div><div class="reg-note">${regEsc(fncTxt('The register record is created. File-link storage is intentionally deferred; for now you can rename an existing file in the open folder.','Record register sudah dibuat. Penyimpanan relasi file sengaja ditunda; untuk saat ini file existing di folder aktif dapat di-rename.'))}</div><div class="reg-row"><div class="fnc-field"><label class="fnc-label">Existing file</label><select id="regFile"></select></div><button id="regRename" class="fnc-btn-amber">${regEsc(fncTxt('Rename to Suggested Name','Rename ke Nama Disarankan'))}</button></div></div>`;
  const c=$('fncSection').querySelector('.fnc-context');c?c.insertAdjacentElement('afterend',p):$('fncSection').appendChild(p);
  $('regYear').value=String(new Date().getFullYear());
  $('regNew').onclick=regOpen;$('regCancel').onclick=()=> $('regForm').classList.remove('show');$('regCreate').onclick=regCreate;$('regLogin').onclick=regLogin;$('regLogout').onclick=regLogout;$('regRename').onclick=regRename;
  $('regLoginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')regLogin()});
  $('fncScan').addEventListener('click',e=>{if(!regActive())return;e.preventDefault();e.stopImmediatePropagation();regScan()},true);
  $('fncProfileSelect').addEventListener('change',()=>setTimeout(regRefresh,0));
  regRefresh();
}

function regRefresh(){
  if(!$('regPanel'))return;
  $('regPanel').classList.toggle('show',regActive());
  const signed=regIsTgm();$('regAuthBadge').textContent=signed?fncTxt('Signed in: ','Login: ')+regEmail():fncTxt('TGM sign-in required','Perlu login TGM');$('regAuthBadge').className='fnc-badge '+(signed?'ok':'warn');
  $('regLoginRow').style.display=signed?'none':'flex';$('regLogout').style.display=signed?'':'none';$('regNew').disabled=regBusy||!regActive()||!fncCurrentKey()||!signed;
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
  regBusy=true;regRefresh();try{const r=await regFetch('/rest/v1/rpc/register_create_tgm_administration_document',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_department_id:d,p_document_type_id:t,p_year_release:y,p_document_title:title})});if(!r.ok)throw new Error(await regErr(r));const j=await r.json(),row=Array.isArray(j)?j[0]:j;if(!row||!row.document_number)throw new Error('No Document Number returned.');row.filename=regSafeBase(row.letter_id||row.document_number);regCreated=row;$('regDocNo').textContent=row.document_number;$('regFilename').textContent=row.filename;$('regForm').classList.remove('show');$('regResult').classList.add('show');$('regTitleText').value='';regFiles()}catch(e){alert(fncTxt('Register creation failed: ','Pembuatan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
}

function regFiles(){if(!$('regFile'))return;const curv=$('regFile').value,fs=state.entries.filter(e=>e.kind==='file');$('regFile').innerHTML='<option value="">(select existing file)</option>'+fs.map(x=>`<option value="${regEsc(x.name)}">${regEsc(x.name)}</option>`).join('');if(fs.some(x=>x.name===curv))$('regFile').value=curv;$('regRename').disabled=regBusy||!regCreated||!fs.length}
async function regRename(){
  if(!regCreated)return;const n=$('regFile').value,e=state.entries.find(x=>x.kind==='file'&&x.name===n),p=cur();if(!e||!p)return alert(fncTxt('Select a valid file.','Pilih file yang valid.'));const nn=regCreated.filename+regExt(e.name);if(state.entries.some(x=>x.name!==e.name&&x.name.toLowerCase()===nn.toLowerCase()))return alert(fncTxt('Target filename already exists.','Nama file target sudah ada.'));if(!confirm(`Rename "${e.name}" → "${nn}"?`))return;regBusy=true;regRefresh();try{let moved=false;if(e.handle&&typeof e.handle.move==='function')try{await e.handle.move(nn);moved=true}catch{}if(!moved){const f=await e.handle.getFile(),dh=await p.getFileHandle(nn,{create:true}),w=await dh.createWritable();await w.write(f);await w.close();await p.removeEntry(e.name)}await loadCurrent();alert(fncTxt('File renamed.','File berhasil di-rename.'))}catch(x){alert(fncTxt('Rename failed: ','Rename gagal: ')+x.message)}finally{regBusy=false;regRefresh()}
}

async function regScan(){
  regBusy=true;regRefresh();try{const r=await regFetch('/rest/v1/tgm_administration_document_register?select=document_number,letter_id,is_active&is_active=eq.true&order=document_number.asc');if(!r.ok)throw new Error(await regErr(r));const rows=await r.json(),exact=new Map(),nums=new Map();rows.forEach(x=>{const expected=regSafeBase(x.letter_id||x.document_number);exact.set(expected.toLowerCase(),{...x,expected});nums.set(String(x.document_number).toLowerCase(),{...x,expected})});const keys=[...nums.keys()].sort((a,b)=>b.length-a.length);fncLastScan=state.entries.filter(e=>e.kind==='file').map(f=>{const b=regBase(f.name),l=b.toLowerCase(),issues=[];if(!exact.has(l)){const k=keys.find(n=>l===n||l.startsWith(n+'_')||l.startsWith(n+'-'));if(k){const x=nums.get(k);issues.push(fncTxt(`Register found, but expected filename is "${x.expected}".`,`Register ditemukan, tetapi filename seharusnya "${x.expected}".`))}else issues.push(fncTxt('Document Number not found in Administration Document Register.','Document Number tidak ditemukan di Administration Document Register.'))}return{file:f.name,values:[b],issues,warnings:[]}});$('fncResults').classList.add('show');fncRenderResults(regEffectiveProfile())}catch(e){alert(fncTxt('Register scan failed: ','Scan register gagal: ')+e.message)}finally{regBusy=false;regRefresh()}
}

function regHooks(){
  if(typeof fncRefreshContext==='function'){const o=fncRefreshContext;fncRefreshContext=function(){const r=o.apply(this,arguments);regRefresh();return r}}
  if(typeof setLang==='function'){const o=setLang;setLang=function(){const r=o.apply(this,arguments);regRefresh();return r}}
}

regEnsureProfile();regBuild();regHooks();fncRefreshProfiles(fncSelectedProfileId()||REG_ADMIN_PROFILE_ID);regRefresh();
setTimeout(async()=>{if(regSession)try{await regEnsureSession()}catch{regSaveSession(null)}regRefresh()},0);
