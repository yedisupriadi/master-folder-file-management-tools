// Actionable remediation workflow for the TGM Administration Document register scan.
// Injected after folder-manager-register.js inside the Folder Manager core IIFE.
const REG_ACTION_IGNORE_KEY = 'fm-fnc-register-ignore-v1';
let regActionPendingExistingFile = '';

function regActionIgnoreScope(){const k=fncCurrentKey();return k?`${REG_ADMIN_PROFILE_ID}::${k}`:''}
function regActionReadIgnores(){return fncReadJson(REG_ACTION_IGNORE_KEY,{})}
function regActionIsIgnored(file){const s=regActionIgnoreScope();if(!s)return false;const all=regActionReadIgnores(),arr=Array.isArray(all[s])?all[s]:[];return arr.includes(String(file||'').toLowerCase())}
function regActionSetIgnored(file,ignored){const s=regActionIgnoreScope();if(!s)return;const all=regActionReadIgnores(),set=new Set(Array.isArray(all[s])?all[s]:[]),k=String(file||'').toLowerCase();ignored?set.add(k):set.delete(k);all[s]=[...set];ToolStorage.setItem(REG_ACTION_IGNORE_KEY,JSON.stringify(all))}

function regActionEnsureHeader(){
  const body=$('fncResultsBody');if(!body)return;const tr=body.closest('table')?.querySelector('thead tr');if(!tr)return;
  let th=$('regActionHead');if(!th){th=document.createElement('th');th.id='regActionHead';tr.appendChild(th)}
  th.textContent=fncTxt('Action','Aksi');th.style.display=regActive()?'':'none';
}
function regActionEnsureUi(){

  if($('regForm')&&!$('regExistingNote')){const d=document.createElement('div');d.id='regExistingNote';d.className='reg-guide';d.style.display='none';$('regForm').insertBefore(d,$('regForm').firstChild)}
  regActionEnsureHeader();
}

async function regActionRenameFile(fileName,expectedBase,folder=cur()){
  if(regBusy||!folder||folder!==cur())return false;
  const entry=state.entries.find(x=>x.kind==='file'&&x.name===fileName);
  if(!entry||!expectedBase)return false;
  const name=expectedBase+regExt(entry.name);
  if(name===entry.name)return false;
  regBusy=true;regRefresh();
  try{
    if(state.entries.some(x=>x.name!==entry.name&&x.name.toLowerCase()===name.toLowerCase())||await flattenItemExists(folder,name)){
      alert(fncTxt('Target filename already exists. Refresh and retry.','Nama file target sudah ada. Segarkan dan coba lagi.'));return false;
    }
    if(!confirm(fncTxt('Rename','Rename')+' "'+entry.name+'" → "'+name+'"?'))return false;
    let moved=false;
    if(typeof entry.handle.move==='function'){
      try{await entry.handle.move(name);moved=true;}
      catch(error){if(!['NotSupportedError','TypeError','InvalidModificationError'].includes(error.name))throw error;}
    }
    if(!moved){await copyFile(entry.handle,folder,name);await folder.removeEntry(entry.name);}
    if(cur()===folder)await loadCurrent();
    return true;
  }catch(error){
    alert(fncTxt('Rename failed. Refresh the folder before retrying: ','Rename gagal. Segarkan folder sebelum mencoba lagi: ')+error.message);return false;
  }finally{regBusy=false;regRefresh();}
}
function regActionViewRecord(row){if(!row||!row.record)return;const x=row.record;alert(`Document Number: ${x.document_number||'-'}\nDocument ID / Letter ID: ${x.letter_id||'-'}\n${fncTxt('Expected filename','Filename seharusnya')}: ${row.expected||'-'}`)}

async function regActionRegisterExisting(row){
  if(regBusy||!row||!row.candidate||row.record||(row.folder&&row.folder!==cur()))return;regBusy=true;regRefresh();try{await regLoadMasters();const c=row.candidate;const dept=regMasters.departments.find(x=>String(x.department_code).toUpperCase()===c.deptCode);const type=regMasters.types.find(x=>String(x.doc_code).toUpperCase()===c.typeCode);$('regDept').value=dept?dept.id:'';$('regType').value=type?type.id:'';$('regYear').value=c.year||String(new Date().getFullYear());$('regTitleText').value=row.guessTitle||'';regActionPendingExistingFile=row.file;const note=$('regExistingNote');note.textContent=fncTxt(`Existing file candidate ${c.documentNumber} is not registered. Supabase will allocate a new authoritative Document Number; the filename candidate is not adopted automatically.`,`File existing memiliki kandidat ${c.documentNumber} tetapi belum terdaftar. Supabase akan mengalokasikan Document Number authoritative baru; kandidat dari filename tidak diadopsi otomatis.`);note.style.display='block';$('regForm').classList.add('show');$('regResult').classList.remove('show');$('regPanel').scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){alert(fncTxt('Could not prepare register form: ','Gagal menyiapkan form register: ')+e.message)}finally{regBusy=false;regRefresh()}
}

// Add context for the "Register Existing File" remediation without changing the governed RPC.
const regActionOriginalOpen=regOpen;
const regActionOriginalCreate=regCreate;
$('regNew').onclick=async()=>{regActionPendingExistingFile='';if($('regExistingNote'))$('regExistingNote').style.display='none';return regActionOriginalOpen()};
$('regCreate').onclick=async()=>{const before=regCreated,pending=regActionPendingExistingFile;await regActionOriginalCreate();if(regCreated&&regCreated!==before&&pending){regFiles();if(Array.from($('regFile').options).some(o=>o.value===pending))$('regFile').value=pending;regActionPendingExistingFile='';if($('regExistingNote'))$('regExistingNote').style.display='none'}};
const regActionOriginalRefresh=regRefresh;
regRefresh=function(){const r=regActionOriginalRefresh.apply(this,arguments);regActionEnsureHeader();return r};
regActionEnsureUi();regRefresh();
