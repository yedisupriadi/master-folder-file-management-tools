// Tool #8: pure, dependency-free helpers shared by the page and tests.
(() => {
  "use strict";

  function folderOf(file) {
    const path = String(file.folderPath || "");
    if (path.startsWith("/")) return path.endsWith("/") ? path : path + "/";
    const filePath = String(file.filePath || "");
    const index = filePath.lastIndexOf("/");
    return index < 0 ? "/" : filePath.slice(0, index + 1) || "/";
  }

  function mergeAccountFiles(files) {
    const seen = new Set();
    const result = [];
    for (const file of files) {
      if (!file || !file.url || !/^https:\/\//i.test(file.url) || !file.accountId) continue;
      const key = String(file.accountId) + ":" + String(file.fileId || file.filePath || file.url);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...file, folderPath: folderOf(file) });
    }
    return result;
  }

  function uniqueFolders(files) {
    return [...new Set(files.map(folderOf))].sort((a, b) => a.localeCompare(b));
  }

  function filterFiles(files, folder, search) {
    const normalized = String(search || "").trim().toLocaleLowerCase();
    return files.filter((file) =>
      (!folder || folder === "*" || folderOf(file) === folder) &&
      (!normalized || [
        file.accountName, file.accountId, file.name, file.filePath, file.folderPath, file.url,
      ].some((field) => String(field || "").toLocaleLowerCase().includes(normalized)))
    );
  }

  function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    // Excel formula injection defense for untrusted filenames, paths and URLs.
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function toCSV(files) {
    const columns = [
      ["AccountID", "accountId"], ["AccountName", "accountName"],
      ["FolderPath", "folderPath"], ["FileName", "name"], ["ImageURL", "url"],
      ["FileID", "fileId"], ["FilePath", "filePath"], ["CreatedAt", "createdAt"],
      ["Width", "width"], ["Height", "height"], ["SizeBytes", "size"],
      ["Private", "isPrivateFile"],
    ];
    return "\uFEFF" + columns.map(([title]) => title).join(",") + "\r\n" +
      files.map((file) => columns.map(([title, key]) => csvCell(title === "FolderPath" ? folderOf(file) : file[key])).join(",")).join("\r\n");
  }

  const helper = { folderOf, mergeAccountFiles, uniqueFolders, filterFiles, toCSV };
  if (typeof module !== "undefined" && module.exports) module.exports = helper;
  else if (typeof window !== "undefined") window.ImageKitURLCore = helper;
})();
