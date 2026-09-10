// Loaded only by browser-audit.mjs in a disposable profile. Never shipped to application pages.
(() => {
  const profile={id:'system:tgm-administration-document-v1',name:'TGM Administration Document',fields:[],filenameFieldProfile:{fields:['document_number','document_title'],delimiter:' - '},version:4};
  localStorage.setItem('fm-fnc-profiles-v1',JSON.stringify([profile]));
  localStorage.setItem('fm-fnc-bindings-v1','{}');
  localStorage.setItem('fm-tgm-register-session-v1',JSON.stringify({access_token:'fixture.'+btoa(JSON.stringify({exp:4102444800}))+'.signature',refresh_token:'fixture-only',user:{id:'fixture',email:'audit@trigammametri.co.id'}}));
  const records=[
    {document_number:'TGM-EXT-QUO-020-2026',document_title:'Penawaran Jasa Layanan BIM',letter_id:'TGM-EXT-QUO-020-2026_Penawaran Jasa Layanan BIM'},
    {document_number:'TGM-EXT-QUO-021-2026',document_title:'Approved Title',letter_id:'TGM-EXT-QUO-021-2026_Approved Title'},
  ];
  window.auditFixture={records,writes:[],alerts:[],prompt:'Created Folder'};
  window.alert=message=>auditFixture.alerts.push(String(message));
  window.confirm=()=>true;
  window.prompt=()=>auditFixture.prompt;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);
    if(url.pathname.includes('/functions/v1/folder-standards'))return nativeFetch(input,init); // Read-only governed standards.
    if(url.pathname.includes('/auth/'))return new Response('{}',{status:200});
    if(url.pathname.includes('/rpc/')){
      auditFixture.writes.push(JSON.parse(init.body));
      const row={document_number:'TGM-EXT-QUO-100-2026',document_title:JSON.parse(init.body).p_document_title,letter_id:'fixture'};
      records.push(row);return Response.json(row);
    }
    if(url.pathname.endsWith('/department_ho_master'))return Response.json([{id:'d1',department_code:'EXT',department_name:'External'}]);
    if(url.pathname.endsWith('/tgm_administration_document_code_master'))return Response.json([{id:'t1',doc_code:'QUO',doc_name:'Quotation'}]);
    if(url.pathname.endsWith('/tgm_administration_document_register')){
      const offset=Number(url.searchParams.get('offset')||0),batch=records.slice(offset,offset+1);
      return Response.json(batch,{headers:{'content-range':`${offset}-${offset+batch.length-1}/${records.length}`}});
    }
    throw new Error('Unmocked Supabase operation: '+url.pathname);
  };
  // Exercise real browser file handles without touching any user-selected directory.
  window.fixtureReady=(async()=>{
    const storage=await navigator.storage.getDirectory();
    const root=await storage.getDirectoryHandle('Audit Fixture',{create:true});
    for await(const [name] of root.entries())await root.removeEntry(name,{recursive:true});
    for(const name of ['TGM-EXT-QUO-021-2026 - Approved Title.docx','TGM-EXT-QUO-020A-2026 - Quotation Leok.docx','TGM-EXT-QUO-099-2026 - New Title.docx','Supporting.pdf']){
      const h=await root.getFileHandle(name,{create:true}),w=await h.createWritable();await w.write('Fixture content: '+name);await w.close();
    }
    await root.getDirectoryHandle('Subfolder',{create:true});
    auditFixture.root=root;return root;
  })();
  window.showDirectoryPicker=()=>fixtureReady;
})();
