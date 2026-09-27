(() => {
  'use strict';

  const api = {};

  api.normalizeWindowsPath = function normalizeWindowsPath(value) {
    let text = String(value ?? '').trim();
    if (!text) return '';
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1).trim();
    }
    if (/^file:\/\/\//i.test(text)) {
      try {
        const u = new URL(text);
        text = decodeURIComponent(u.pathname).replace(/^\/(?:([A-Za-z]:))/,'$1');
      } catch {
        text = text.replace(/^file:\/\/\//i, '');
      }
    }
    text = text.replaceAll('/', '\\').replace(/\\{2,}/g, '\\');
    return text;
  };

  api.extractPathFromRow = function extractPathFromRow(row) {
    const raw = String(row ?? '').trim();
    if (!raw) return '';
    const cells = raw.split('\t').map(v => v.trim()).filter(Boolean);
    const win = cells.find(v => /^[A-Za-z]:[\\/]/.test(v.replace(/^["']|["']$/g, '')));
    return api.normalizeWindowsPath(win || cells[0] || raw);
  };

  api.parseRows = function parseRows(text) {
    const seen = new Set();
    const rows = [];
    for (const raw of String(text ?? '').split(/\r?\n/)) {
      const path = api.extractPathFromRow(raw);
      if (!path) continue;
      const key = path.toLowerCase();
      if (seen.has(key)) {
        rows.push({ path, duplicate: true });
        continue;
      }
      seen.add(key);
      rows.push({ path, duplicate: false });
    }
    return rows;
  };

  api.pathParts = function pathParts(path) {
    const normalized = api.normalizeWindowsPath(path);
    const driveMatch = normalized.match(/^([A-Za-z]:)\\/);
    const drive = driveMatch ? driveMatch[1] : '';
    const tail = driveMatch ? normalized.slice(driveMatch[0].length) : normalized.replace(/^\\+/, '');
    const parts = tail.split('\\').filter(Boolean);
    return { normalized, drive, parts };
  };

  api.fileNameFromPath = function fileNameFromPath(path) {
    const { parts } = api.pathParts(path);
    return parts.at(-1) || '';
  };

  api.relativePartsForRoot = function relativePartsForRoot(path, rootName) {
    const { parts } = api.pathParts(path);
    const needle = String(rootName ?? '').trim().toLowerCase();
    if (!needle) throw new Error('Source root folder is not selected.');
    let idx = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase() === needle) idx = i;
    }
    if (idx < 0) throw new Error(`Selected source root "${rootName}" is not present in the pasted path.`);
    const relative = parts.slice(idx + 1);
    if (!relative.length) throw new Error('The pasted path points to the selected root folder, not to a file.');
    return relative;
  };

  api.safeCsv = function safeCsv(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  };

  api.collisionName = function collisionName(name, index) {
    const dot = name.lastIndexOf('.');
    const hasExt = dot > 0;
    const stem = hasExt ? name.slice(0, dot) : name;
    const ext = hasExt ? name.slice(dot) : '';
    return `${stem} (${index})${ext}`;
  };

  async function getExistingFile(dir, name) {
    try {
      return await dir.getFileHandle(name);
    } catch (error) {
      if (error && error.name === 'NotFoundError') return null;
      throw error;
    }
  }

  api.pickDestinationName = async function pickDestinationName(dir, desiredName, policy) {
    const existing = await getExistingFile(dir, desiredName);
    if (!existing) return { action: 'write', name: desiredName, exists: false };
    if (policy === 'skip') return { action: 'skip', name: desiredName, exists: true };
    if (policy === 'overwrite') return { action: 'write', name: desiredName, exists: true };
    for (let i = 2; i < 10000; i++) {
      const candidate = api.collisionName(desiredName, i);
      if (!(await getExistingFile(dir, candidate))) return { action: 'write', name: candidate, exists: false };
    }
    throw new Error('Could not allocate a unique destination file name.');
  };

  api.resolveSourceFile = async function resolveSourceFile(sourceRoot, absolutePath) {
    const relative = api.relativePartsForRoot(absolutePath, sourceRoot.name);
    const fileName = relative.at(-1);
    let parent = sourceRoot;
    for (const segment of relative.slice(0, -1)) {
      parent = await parent.getDirectoryHandle(segment);
    }
    const handle = await parent.getFileHandle(fileName);
    return { parent, handle, fileName, relative };
  };

  api.copyFile = async function copyFile(sourceFileHandle, targetDir, targetName) {
    const sourceFile = await sourceFileHandle.getFile();
    const targetHandle = await targetDir.getFileHandle(targetName, { create: true });
    const writable = await targetHandle.createWritable();
    try {
      await writable.write(sourceFile);
      await writable.close();
    } catch (error) {
      try { await writable.abort(); } catch {}
      throw error;
    }
    const targetFile = await targetHandle.getFile();
    if (targetFile.size !== sourceFile.size) {
      throw new Error(`Copy verification failed: source is ${sourceFile.size} bytes but destination is ${targetFile.size} bytes.`);
    }
    return { sourceSize: sourceFile.size, targetSize: targetFile.size, targetHandle };
  };

  api.transferOne = async function transferOne({
    sourceRoot,
    targetDir,
    absolutePath,
    operation = 'copy',
    collision = 'skip'
  }) {
    const source = await api.resolveSourceFile(sourceRoot, absolutePath);
    const plan = await api.pickDestinationName(targetDir, source.fileName, collision);

    if (plan.action === 'skip') {
      return {
        status: 'skipped',
        sourcePath: absolutePath,
        sourceName: source.fileName,
        targetName: plan.name,
        message: 'Destination already exists.'
      };
    }

    if (typeof targetDir.isSameEntry === 'function' && await targetDir.isSameEntry(source.parent) && plan.name === source.fileName) {
      throw new Error('Source and destination are the same file.');
    }

    const copied = await api.copyFile(source.handle, targetDir, plan.name);

    if (operation === 'move') {
      await source.parent.removeEntry(source.fileName);
    }

    return {
      status: operation === 'move' ? 'moved' : 'copied',
      sourcePath: absolutePath,
      sourceName: source.fileName,
      targetName: plan.name,
      bytes: copied.sourceSize,
      message: operation === 'move' ? 'Moved successfully.' : 'Copied successfully.'
    };
  };

  window.BatchFileTransferCore = api;
})();