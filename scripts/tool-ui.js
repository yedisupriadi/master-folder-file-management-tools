/* Small browser helpers shared by all standalone pages. No network dependency. */
(() => {
  'use strict';
  const memory = new Map();
  let storageFailed = false;
  window.ToolStorage = {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try { return localStorage.getItem(key); } catch { storageFailed = true; return null; }
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try { localStorage.setItem(key, value); } catch { storageFailed = true; }
    },
    removeItem(key) {
      memory.set(key, null);
      try { localStorage.removeItem(key); } catch { storageFailed = true; }
    },
  };
  window.addEventListener('storage',event=>{
    if(event.key)memory.delete(event.key);else memory.clear();
    if(event.key==='audit-lang'||event.key==='audit-theme'){
      const control=document.getElementById(event.key==='audit-lang'?'langToggle':'themeToggle');
      if(control){control.checked=event.newValue===(event.key==='audit-lang'?'en':'dark');control.dispatchEvent(new Event('change',{bubbles:true}));}
    }
  });
  for (const [key, choices] of [['audit-lang',['id','en']],['audit-theme',['light','dark']]]) {
    if (!choices.includes(ToolStorage.getItem(key))) ToolStorage.setItem(key,choices[0]);
  }
  document.documentElement.dataset.theme = ToolStorage.getItem('audit-theme');
  document.documentElement.lang = ToolStorage.getItem('audit-lang');
  const paths = {
    close:'M6 6l12 12M18 6 6 18',
    right:'m9 6 6 6-6 6', down:'m6 9 6 6 6-6', up:'m6 15 6-6 6 6',
    check:'m5 12 4 4L19 6', warning:'m12 3 10 18H2L12 3Zm0 6v4m0 4h.01',
    folder:'M3 7V5h6l2 2h10v13H3V7Z', file:'M14 2H4v20h16V8l-6-6Zm0 0v6h6',
  };
  window.ToolIcons = {
    svg(name) {
      const p = paths[name] || paths.file;
      return `<svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${p}"/></svg>`;
    },
  };
  let nextId=0;
  let modalFocus=null;
  function enhance() {
    const en = ToolStorage.getItem('audit-lang') === 'en';
    document.documentElement.lang = en ? 'en' : 'id';
    for(const el of document.querySelectorAll('[data-tool-icon]')) {
      if(!el.querySelector('svg'))el.innerHTML=ToolIcons.svg(el.dataset.toolIcon);
    }
    for (const el of document.querySelectorAll('.search-clear,.caret,.gcaret,.arrow,.tree-toggle,.sortarr')) {
      const text=el.textContent.trim();
      const icon={'✕':'close','×':'close','▶':'right','▼':'down','▲':'up','▾':'down','▸':'right','↑':'up','↓':'down'}[text];
      if(icon)el.innerHTML=ToolIcons.svg(icon);
      if(el.matches('.search-clear')) {
        el.setAttribute('role','button');el.tabIndex=0;
        el.setAttribute('aria-label',el.title||(en?'Clear search':'Bersihkan pencarian'));
      }
    }
    for(const el of document.querySelectorAll('.tree-row,.tree-toggle')) {
      el.tabIndex=0;el.setAttribute('role','button');
      const name=el.closest('.tree-row')?.querySelector('.tree-name')?.textContent||'';
      if(el.matches('.tree-toggle'))el.setAttribute('aria-label',(en?'Expand or collapse ':'Buka atau tutup ')+name);
    }
    for(const svg of document.querySelectorAll('.ico svg')) {
      svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    }
    for(const label of document.querySelectorAll('label:not([for])')) {
      if(label.querySelector('input,select,textarea'))continue;
      const control=label.nextElementSibling;
      if(control?.matches('input,select,textarea')) {
        if(!control.id)control.id='tool-field-'+(++nextId);
        label.htmlFor=control.id;
      }
    }
    for(const control of document.querySelectorAll('input,select,textarea')) {
      if(control.labels?.length||control.hasAttribute('aria-label')||control.hasAttribute('aria-labelledby'))continue;
      const cell=control.closest('td');
      const heading=cell?.closest('table')?.querySelector('thead tr')?.children[cell.cellIndex];
      const label=control.title||heading?.textContent.trim()||control.placeholder;
      if(label)control.setAttribute('aria-label',label);
    }
    const imageInput=document.getElementById('imageInput');
    if(imageInput)imageInput.setAttribute('aria-label',en?'Choose images for text recognition':'Pilih gambar untuk pengenalan teks');
    for(const th of document.querySelectorAll('thead th:not([scope])'))th.scope='col';
    const modal=document.getElementById('mkModal');
    if(modal){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',en?'Preview folder creation':'Preview pembuatan folder');
      if(modal.classList.contains('show')&&!modal.contains(document.activeElement)){modalFocus=document.activeElement;modal.querySelector('button')?.focus();}
      else if(!modal.classList.contains('show')&&modalFocus){modalFocus.focus();modalFocus=null;}
    }
    for(const button of document.querySelectorAll('button:not([type])'))button.type='button';
    for(const id of ['toast','fmLoadText','fncResultsSummary','ocrStatus']) {
      const el=document.getElementById(id);if(el){el.setAttribute('role','status');el.setAttribute('aria-live','polite');}
    }
    if(storageFailed&&!document.querySelector('.tool-storage-note')) {
      const note=document.createElement('div');note.className='tool-storage-note';note.setAttribute('role','status');
      note.textContent=en?'Browser storage is unavailable. Changes to preferences and profiles last only for this page session.':'Penyimpanan browser tidak tersedia. Perubahan preferensi dan profile hanya berlaku selama sesi halaman ini.';
      document.body.prepend(note);
    }
  }
  document.addEventListener('keydown',event=>{
    const modal=document.querySelector('#mkModal.show');
    if(modal&&event.key==='Escape'){document.getElementById('mkCancel').click();event.preventDefault();}
    if(modal&&event.key==='Tab'){
      const buttons=[...modal.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
      if(buttons.length){event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
    }
    if(event.target.matches('.search-clear,.tree-row,.tree-toggle')&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();event.target.click();}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    let pending=false;
    new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;enhance();});}})
      .observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('change',()=>queueMicrotask(enhance));
    const modal=document.getElementById('mkModal');
    if(modal)new MutationObserver(enhance).observe(modal,{attributes:true,attributeFilter:['class']});
    queueMicrotask(enhance);
  },{once:true});
})();
