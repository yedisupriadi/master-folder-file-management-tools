// Folder Manager Flatten enhancement.
// This source is injected by folder-manager.html inside folder-manager-core.html's
// existing IIFE so it can reuse the proven File System Access helpers and state.

I18N.id.flatten = 'Flatten Folder';
I18N.id.flattenTip = 'Pindahkan semua file dari seluruh subfolder ke folder yang sedang dibuka, lalu hapus subfolder yang sudah kosong';
I18N.en.flatten = 'Flatten Folder';
I18N.en.flattenTip = 'Move all files from all subfolders into the currently open folder, then remove subfolders that become empty';

const flattenStyle = document.createElement('style');
flattenStyle.textContent = [
  '#btnFlatten { background: var(--amber); box-shadow: 0 4px 12px rgba(245,158,11,.3); }',
  '#btnFlatten:hover:not(:disabled) { background: var(--amber-dark); }',
].join('\n');
document.head.appendChild(flattenStyle);

const flattenButton = document.createElement('button');
flattenButton.id = 'btnFlatten';
flattenButton.type = 'button';
flattenButton.disabled = true;
flattenButton.setAttribute('data-i18n-title', 'flattenTip');
flattenButton.title = I18N.id.flattenTip;
flattenButton.setAttribute('aria-label', 'Flatten Folder');
flattenButton.innerHTML = '<span class="ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/><path d="M5 22h14"/></svg></span><span data-i18n="flatten">Flatten Folder</span>';
$('btnRefresh').insertAdjacentElement('afterend', flattenButton);

let flattenBusy = false;

function flattenSplitFileName(name) {
  const value = String(name || '');
  const dot = value.lastIndexOf('.');
  if (dot > 0 && dot < value.length - 1) {
    return { base: value.slice(0, dot), ext: value.slice(dot) };
  }
  return { base: value, ext: '' };
}

async function flattenItemExists(dest, name) {
  try { await dest.getFileHandle(name); return true; } catch(error) { if(!['NotFoundError','TypeMismatchError'].includes(error.name))throw error; }
  try { await dest.getDirectoryHandle(name); return true; } catch(error) { if(!['NotFoundError','TypeMismatchError'].includes(error.name))throw error; }
  return false;
}

async function flattenUniqueFileName(dest, name) {
  if (!(await flattenItemExists(dest, name))) return name;
  const parts = flattenSplitFileName(name);
  let i = 2;
  for (;;) {
    const candidate = parts.base + ' (' + i + ')' + parts.ext;
    if (!(await flattenItemExists(dest, candidate))) return candidate;
    i++;
  }
}

async function flattenDirectoryIsEmpty(handle) {
  for await (const _entry of handle.entries()) return false;
  return true;
}

async function flattenCollectNested(handle, relParts, files, dirs) {
  for await (const [name, child] of handle.entries()) {
    if (child.kind === 'directory') {
      const childParts = [...relParts, name];
      dirs.push({
        name,
        handle: child,
        parent: handle,
        depth: childParts.length,
        relPath: childParts.join(' / '),
      });
      await flattenCollectNested(child, childParts, files, dirs);
    } else if (relParts.length) {
      files.push({
        name,
        handle: child,
        parent: handle,
        relPath: [...relParts, name].join(' / '),
      });
    }
  }
}

async function flattenCurrentFolder() {
  if (flattenBusy || !state.root || state.view !== 'browse') return;
  const dest = cur();
  if (!dest) return;

  flattenBusy = true;
  syncButtons();
  loading(true, TL('Scanning subfolders...', 'Memindai subfolder...'));

  const files = [];
  const dirs = [];
  try {
    await flattenCollectNested(dest, [], files, dirs);
  } catch (error) {
    loading(false);
    flattenBusy = false;
    syncButtons();
    alert(TL('Failed to scan subfolders: ', 'Gagal memindai subfolder: ') + error.message);
    return;
  }
  loading(false);

  if (!files.length) {
    flattenBusy = false;
    syncButtons();
    alert(TL(
      'No files were found inside subfolders. Nothing to flatten.',
      'Tidak ada file di dalam subfolder. Tidak ada yang perlu di-flatten.'
    ));
    return;
  }

  const confirmMessage = TL(
    'Move ' + files.length + ' file(s) from ALL subfolders into the currently open folder "' + dest.name + '"?\n\nIf duplicate file names exist, the moved file will be renamed automatically (for example: Report (2).pdf). Subfolders will be removed only after they are completely empty. The original folder hierarchy cannot be restored automatically.',
    'Pindahkan ' + files.length + ' file dari SELURUH subfolder ke folder yang sedang dibuka "' + dest.name + '"?\n\nJika ada nama file yang sama, file yang dipindahkan akan diberi nama baru otomatis (contoh: Report (2).pdf). Subfolder hanya akan dihapus setelah benar-benar kosong. Struktur folder awal tidak dapat dipulihkan otomatis.'
  );
  if (!confirm(confirmMessage)) {
    flattenBusy = false;
    syncButtons();
    return;
  }

  let moved = 0;
  let renamed = 0;
  let removedDirs = 0;
  const errors = [];

  loading(true, TL('Flattening folder...', 'Melakukan flatten folder...'));
  try {
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      let destName = item.name;
      let copiedToDest = false;
      try {
        destName = await flattenUniqueFileName(dest, item.name);
        await copyFile(item.handle, dest, destName);
        copiedToDest = true;

        try {
          await item.parent.removeEntry(item.name);
        } catch (removeError) {
          // Roll back the copied file when the source cannot be removed. This
          // keeps a failed "move" from silently becoming a duplicate copy.
          try { await dest.removeEntry(destName); } catch {}
          throw removeError;
        }

        moved++;
        if (destName !== item.name) renamed++;
      } catch (error) {
        errors.push(item.relPath + ': ' + error.message + (copiedToDest ? TL(' (source retained)', ' (sumber dipertahankan)') : ''));
      }

      $('fmLoadText').textContent = TL(
        'Moving files: ' + (i + 1) + '/' + files.length,
        'Memindahkan file: ' + (i + 1) + '/' + files.length
      );
    }

    // Cleanup is deliberately non-recursive. A directory is removed only when
    // it is verified empty, deepest first. Any failed file move therefore keeps
    // its containing directory and cannot be deleted accidentally.
    dirs.sort((a, b) => b.depth - a.depth);
    for (const dir of dirs) {
      try {
        if (await flattenDirectoryIsEmpty(dir.handle)) {
          await dir.parent.removeEntry(dir.name);
          removedDirs++;
        }
      } catch (error) {
        if (error.name !== 'NotFoundError') errors.push(dir.relPath + ': ' + error.message);
      }
    }
  } finally {
    loading(false);
    flattenBusy = false;
  }

  await loadCurrent();

  let message = TL(
    'Flatten complete.\nMoved files: ' + moved + '\nRenamed because of duplicate names: ' + renamed + '\nEmpty subfolders removed: ' + removedDirs,
    'Flatten selesai.\nFile dipindahkan: ' + moved + '\nNama diubah karena duplikat: ' + renamed + '\nSubfolder kosong dihapus: ' + removedDirs
  );
  if (errors.length) {
    const shown = errors.slice(0, 20);
    message += '\n\n' + TL('Issues (' + errors.length + '):\n', 'Catatan (' + errors.length + '):\n') + shown.join('\n');
    if (errors.length > shown.length) message += '\n… +' + (errors.length - shown.length) + TL(' more', ' lainnya');
  }
  alert(message);
  syncButtons();
}

const syncButtonsBeforeFlatten = syncButtons;
syncButtons = function syncButtonsWithFlatten() {
  syncButtonsBeforeFlatten();
  const button = $('btnFlatten');
  if (!button) return;
  const hasSubfolder = state.view === 'browse' && state.entries.some((entry) => entry.kind === 'directory');
  button.disabled = flattenBusy || !state.root || state.view !== 'browse' || !hasSubfolder;
};

flattenButton.addEventListener('click', flattenCurrentFolder);
applyStaticI18n();
syncButtons();

window.__fm = Object.assign(window.__fm || {}, {
  flattenSplitFileName,
  flattenUniqueFileName,
  flattenDirectoryIsEmpty,
  flattenCollectNested,
  flattenCurrentFolder,
});
