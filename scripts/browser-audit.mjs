// Dependency-free Chromium smoke runner. Uses disposable browser data and mock files only.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
const output=process.env.AUDIT_OUTPUT||path.join(os.tmpdir(),'fm-browser-audit');
fs.mkdirSync(output,{recursive:true});
const root=process.cwd();
const profileDir=fs.mkdtempSync(path.join(output,'profile-'));
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let name=decodeURIComponent(url.pathname).replace(/^\/master-folder-file-management-tools\//,'/');
  if(name==='/')name='/index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');
  res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(8734,'127.0.0.1',r));
const browser=spawn(process.env.AUDIT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--disable-gpu','--disable-extensions','--disable-component-extensions-with-background-pages','--no-first-run','--no-default-browser-check','--remote-debugging-port=9334',
  '--user-data-dir='+profileDir,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try{
  let targets;
  for(let i=0;i<60;i++){try{targets=await(await fetch('http://127.0.0.1:9334/json')).json();break;}catch{await sleep(250);}}
  if(!targets)throw new Error('Browser debugging endpoint unavailable');
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map();let errors=[];
  ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);else if(msg.method==='Log.entryAdded'&&msg.params.entry.level==='error')errors.push(msg.params.entry.text+" "+msg.params.entry.url);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Log.enable');
  const reports=[];
  for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){
    errors=[];
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:8734/master-folder-file-management-tools/'+file});
    await sleep(file==='folder-manager.html'?1800:500);
    for(const theme of ['light','dark']){
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      await sleep(120);
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(output,file+'-'+theme+'.png'),Buffer.from(shot.data,'base64'));
    }
    for(const width of [1280,1920,768]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await sleep(60);
      const overflow=await evaluate('document.documentElement.scrollWidth>innerWidth+2');
      if(overflow)errors.push('Page overflow at width '+width);
    }
    for(const en of [true,false])await evaluate(`(()=>{const el=document.getElementById('langToggle');if(el){el.checked=${en};el.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
    if(file==='folder-manager.html'){
      for(const [type,level] of [['personal',1],['personal',2],['project',1],['project',2],['project',3]]){
        await evaluate(`(()=>{const panel=document.querySelector('.nt-panel');const type=panel.querySelector('.nt-native-type');type.value='${type}';type.dispatchEvent(new Event('change'));const level=panel.querySelector('.nt-native-level');level.value='${level}';level.dispatchEvent(new Event('change'));})()`);
        await sleep(800);
        const populated=await evaluate("document.querySelector('.nt-panel .nt-table tbody').querySelectorAll('tr').length>0&&!document.querySelector('.nt-panel .nt-empty')");
        if(!populated)errors.push(`Standard Folder ${type} L${level} did not load`);
        else console.log(`✓ Live governed Folder Standard: ${type} L${level}`);
      }
    }
    await sleep(100);
    const info=await evaluate(`({title:document.title,lang:document.documentElement.lang,font:getComputedStyle(document.body).fontFamily,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),buttons:document.querySelectorAll('button').length,unlabelled:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.getClientRects().length&&!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.id||e.outerHTML.slice(0,100))})`);
    const duplicates=info.ids.filter((id,index,ids)=>ids.indexOf(id)!==index);delete info.ids;
    reports.push({file,...info,duplicates,errors:[...new Set(errors)]});
    console.log(JSON.stringify(reports.at(-1)));
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));
  if(reports.some(r=>r.errors.length||r.duplicates.length||r.unlabelled.length))process.exitCode=1;
  errors=[];
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:fs.readFileSync('scripts/browser-fixtures.js','utf8')});
  await send('Page.navigate',{url:'http://127.0.0.1:8734/master-folder-file-management-tools/folder-manager.html'});
  await sleep(1800);
  const expect=async(expression,message)=>{if(!await evaluate(expression))throw new Error(message);console.log('✓ '+message);};
  const click=async id=>{await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);await sleep(200);};
  await evaluate('fixtureReady');await click('btnPick');await sleep(500);
  await expect("document.getElementById('addressBar').value==='Audit Fixture'",'Choose directory through real disposable browser filesystem handles');
  await click('fncBind');await click('fncScan');await sleep(300);
  await expect("document.querySelectorAll('#fncResultsBody tr').length===4",'Scan all current files against paginated fixture register');
  await expect("document.querySelector('#fncResultsBody').textContent.includes('PARTIAL MATCH')&&document.querySelector('#fncResultsBody').textContent.includes('020A')",'Partial match shows component-level sequence mismatch');
  await expect("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('020A')).querySelectorAll('button').length===2",'Matched register offers Rename and View Record only');
  await evaluate("document.getElementById('fncSection').scrollIntoView()");
  await sleep(100);
  for(const theme of ['light','dark']){await evaluate(`document.documentElement.dataset.theme='${theme}'`);await sleep(300);const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'register-'+theme+'.png'),Buffer.from(shot.data,'base64'));}
  await evaluate("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('020A')).querySelector('button').click()");await sleep(400);
  await expect("(async()=>{const file=await auditFixture.root.getFileHandle('TGM-EXT-QUO-020-2026 - Penawaran Jasa Layanan BIM.docx');return (await (await file.getFile()).text()).includes('020A');})()",'Rename applies authoritative suggestion and preserves physical file content');
  await evaluate("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('Supporting.pdf')).querySelector('button').click()");await sleep(250);
  await expect("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('Supporting.pdf')).textContent.includes('IGNORED')",'Ignore status is scoped to the current folder');
  await evaluate("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('Supporting.pdf')).querySelector('button').click()");await sleep(250);
  await expect("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('Supporting.pdf')).textContent.includes('NOT GOVERNED')",'Restore returns supporting file to NOT GOVERNED');
  await evaluate("[...document.querySelectorAll('#fncResultsBody tr')].find(r=>r.textContent.includes('099')).querySelector('button').click()");await sleep(250);
  await expect("document.getElementById('regDept').value==='d1'&&document.getElementById('regType').value==='t1'",'Register Existing File preselects authoritative department and type masters');
  await evaluate("document.getElementById('regCreate').click();document.getElementById('regCreate').click()");await sleep(250);
  await expect("auditFixture.writes.length===1&&!('p_document_number' in auditFixture.writes[0])&&document.getElementById('regDocNo').textContent==='TGM-EXT-QUO-100-2026'",'Repeated create click makes one RPC; returned Document Number remains backend-governed');
  await click('regRename');
  await expect("(async()=>{return !!await auditFixture.root.getFileHandle('TGM-EXT-QUO-100-2026 - New Title.docx');})()",'Newly registered existing file can be renamed to RPC-derived filename');
  await click('btnNewFolder');
  await expect("(async()=>{return !!await auditFixture.root.getDirectoryHandle('Created Folder');})()",'Create folder works with browser filesystem API');
  const selectFile=async name=>{await evaluate(`(()=>{const cell=[...document.querySelectorAll('.fname')].find(e=>e.textContent.trim()===${JSON.stringify(name)});cell.closest('tr').querySelector('input').click();})()`);};
  await selectFile('Supporting.pdf');await click('btnCopySel');await click('btnPaste');
  await expect("(async()=>{return !!await auditFixture.root.getFileHandle('Supporting (2).pdf');})()",'Copy/paste preserves file extensions when allocating collision names');
  await selectFile('Supporting (2).pdf');await click('btnCutSel');
  await evaluate("[...document.querySelectorAll('.fname')].find(e=>e.textContent.trim()==='Created Folder').closest('tr').click()");await sleep(400);await click('btnPaste');
  await expect("(async()=>{const dir=await auditFixture.root.getDirectoryHandle('Created Folder');return !!await dir.getFileHandle('Supporting (2).pdf');})()",'Navigate into a folder and paste a cut file');
  await selectFile('Supporting (2).pdf');await click('btnDeleteSel');
  await expect("(async()=>{const dir=await auditFixture.root.getDirectoryHandle('Created Folder');return (await Array.fromAsync(dir.entries())).length===0;})()",'Delete selected disposable file');
  await click('btnUp');
  await click('btnAddCol');
  await evaluate("(()=>{const cells=document.querySelector('#sheetBody tr').cells;cells[1].textContent='Batch Parent';cells[2].textContent='Batch Child';document.getElementById('mkMode').value='hier';})()");
  await click('btnPreviewMake');await click('mkConfirm');
  await expect("(async()=>{const parent=await auditFixture.root.getDirectoryHandle('Batch Parent');return !!await parent.getDirectoryHandle('Batch Child');})()",'Spreadsheet hierarchy preview creates the expected parent and child folders');
  await evaluate('auditFixture.alerts=[]'); // Batch creation intentionally displays a completion summary.
  await click('fncScan');await click('langToggle');
  await expect("document.querySelector('#fncResultsBody tr td').textContent.length>0&&document.getElementById('regNew').textContent==='New Registered File'",'Language switch preserves scan rows and translates register actions');
  await expect("auditFixture.alerts.length===0",'Fixture flows produce no unexpected alerts');
  await click('fncUnbind');await click('fncNew');
  await evaluate("document.getElementById('fncName').value='Fixture Rule';document.getElementById('fncDelimiter').value='-'");await click('fncSave');await click('fncScan');
  await expect("document.querySelector('#fncResultsBody').closest('table').querySelectorAll('thead th').length===3",'Ordinary naming profiles restore their own three-column scan header');
  await click('fncBind');
  await expect("document.getElementById('fncBindingBadge').textContent==='Fixture Rule'",'New profile can be bound after unbinding the governed profile');
  fs.writeFileSync(path.join(output,'fixture-errors.json'),JSON.stringify(errors,null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  await send('Browser.close');
}finally{ws?.close();browser.kill();server.close();}
