import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(file,'utf8');
const field=read('folder-manager-register-fieldcheck.js');
const register=read('folder-manager-register.js');
const naming=read('folder-manager-naming.js');
const functions=field.slice(0,field.indexOf('function regFieldPersistProfile'));
const cfg={fields:['document_number','document_title'],delimiter:' - '};
const row={document_number:'TGM-EXT-QUO-020-2026',document_title:'Penawaran Jasa Layanan BIM',letter_id:'TGM-EXT-QUO-020-2026_Penawaran Jasa Layanan BIM'};
const folder={name:'Test'};
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},innerHTML:'',textContent:''});return elements.get(id);};
let records=[row],result,resolveRead;
const context=vm.createContext({
  console,Headers,Response,fetch,URL,atob,JSON,
  fncTxt:en=>en,regSafeBase:s=>String(s).replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').replace(/\s+/g,' ').trim(),
  regEffectiveProfile:()=>({filenameFieldProfile:cfg}),regBase:n=>n.slice(0,n.lastIndexOf('.')),
  regReadAll:async()=>records,regFieldRender:r=>{result=r;},regActive:()=>true,cur:()=>folder,fncCurrentKey:()=>folder.name,
  regSession:{user:{id:'fixture'}},regBusy:false,regRefresh(){},$ : el,
  regActionIsIgnored:n=>n==='ignored.txt',fncLastScan:[],state:{entries:[]},alert:m=>{throw new Error(m);},
});
vm.runInContext(functions,context);
vm.runInContext(field.slice(field.indexOf('regScan=async function()'),field.indexOf('// Enhance the matched-record')),context);
const call=(name,...args)=>context[name](...args);
let candidate=call('regFieldCandidateFromBase','TGM-EXT-QUO-020A-2026 - Quotation Leok');
assert.equal(candidate.deptCode,'EXT');assert.equal(candidate.typeCode,'QUO');
assert.equal(call('regFieldStrongCandidate',candidate,[row]).row,row);
assert.equal(call('regFieldStrongCandidate',candidate,[row,{...row,document_number:'TGM-EXT-QUO-020B-2026'}]),null);
const checks=call('regFieldChecks','TGM-EXT-QUO-020A-2026 - Quotation Leok',row,candidate,cfg);
assert.equal(checks[0].sub.find(x=>x.label==='Sequence').ok,false);
assert.equal(checks[0].sub.filter(x=>x.ok).length,4);assert.equal(checks[1].ok,false);
context.state.entries=[
  {kind:'file',name:row.document_number+' - '+row.document_title+'.docx'},
  {kind:'file',name:'TGM-EXT-QUO-020A-2026 - Quotation Leok.docx'},
  {kind:'file',name:'TGM-EXT-QUO-021-2026 - Other.docx'},
  {kind:'file',name:'Supporting.pdf'}, {kind:'file',name:'ignored.txt'},
  {kind:'file',name:row.document_number+'_'+row.document_title+'.docx'},
];
await context.regScan();
assert.deepEqual(Array.from(result,r=>r.regStatus),['pass','partial','unregistered','not_governed','ignored','partial']);
assert.equal(result[1].expected,row.document_number+' - '+row.document_title);
assert.equal(result[1].folder,folder);
console.log('✓ Register classifications, sequence/title diagnostics, conservative matching, canonical formatting, remediation context');
const originalFields=cfg.fields;
cfg.fields=['letter_id'];cfg.delimiter='';records=[{...row,letter_id:'Correspondence Reference 42'}];
context.state.entries=[{kind:'file',name:'Correspondence Reference 42.pdf'}];await context.regScan();assert.equal(result[0].regStatus,'pass');
cfg.fields=originalFields;cfg.delimiter=' - ';records=[row];
console.log('✓ Letter ID remains a separate authoritative filename source, even without a Document Number prefix');
context.regReadAll=()=>new Promise(r=>{resolveRead=r;});
const previous=result,pending=context.regScan();folder.name='Changed folder';resolveRead(records);await pending;
assert.equal(result,previous);folder.name='Test';
console.log('✓ A navigation change discards an outstanding register scan');

const pagination=register.slice(register.indexOf('async function regReadAll'),register.indexOf('async function regEnsureSession'));
let offsets=[];
const pages=vm.createContext({Number,Array,Error,regErr:async()=>'',regFetch:async url=>{
  const offset=Number(new URL('https://test'+url).searchParams.get('offset'));offsets.push(offset);
  return new Response(JSON.stringify(offset===0?[{id:1},{id:2}]:[{id:3}]),{headers:{'content-range':offset===0?'0-1/3':'2-2/3'}});
}});
vm.runInContext(pagination,pages);assert.equal((await pages.regReadAll('/rest/v1/register?select=*')).length,3);
assert.deepEqual(offsets,[0,2]);
console.log('✓ Register pagination follows actual server page sizes instead of assuming a 1,000-row cap');

const refresh=register.slice(register.indexOf('async function regRefreshToken'),register.indexOf('// Follow server-provided'));
let refreshCount=0,resolveRefresh;
const auth=vm.createContext({regRefreshPromise:null,regSession:{refresh_token:'old'},REG_SB_URL:'https://test',REG_SB_KEY:'public-fixture',fncTxt:en=>en,
  fetch:()=>{refreshCount++;return new Promise(r=>{resolveRefresh=r;});},regSaveSession:s=>{auth.regSession=s;},Error,JSON});
vm.runInContext(refresh,auth);
const a=auth.regRefreshToken(),b=auth.regRefreshToken();assert.equal(refreshCount,1);
resolveRefresh(new Response(JSON.stringify({access_token:'new',refresh_token:'new'})));await Promise.all([a,b]);
assert.equal(auth.regSession.access_token,'new');
const c=auth.regRefreshToken();auth.regSession=null;resolveRefresh(new Response(JSON.stringify({access_token:'late'})));await c;assert.equal(auth.regSession,null);
console.log('✓ Concurrent requests share refresh; late responses cannot resurrect a signed-out session');

// Compile the actual loader composition, including all lexical declarations and wrappers.
let html=read('folder-manager-core.html').replaceAll('NOTION','SUPABASE').replaceAll('Notion','Supabase').replaceAll('notion','supabase');
const close=html.lastIndexOf('})();');
html=html.slice(0,close)+['flatten','naming','register','register-actions','register-fieldcheck'].map(n=>read('folder-manager-'+n+'.js')).join('\n')+html.slice(close);
for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
assert.ok(naming.includes("if($('regPanel')&&typeof regFieldEnsureResultHeader"));
console.log('✓ Assembled Folder Manager loader and injected modules compile in their real shared scope');
