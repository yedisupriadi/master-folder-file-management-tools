# Master Folder & File Management Tools

A collection of browser-based utilities for document controllers and project teams. The tools run as standalone HTML pages, keep selected document contents in the browser, and require no application build step.

[![Validate](https://github.com/yedisupriadi/master-folder-file-management-tools/actions/workflows/validate.yml/badge.svg)](https://github.com/yedisupriadi/master-folder-file-management-tools/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Included tools

| Tool | Purpose |
| --- | --- |
| Folder Management Tool | Browse, copy, move, rename, and delete files or folders; find empty folders; build folder structures from a spreadsheet-like grid or Notion. |
| File Naming Convention Management | Scan folders, audit naming structure, cross-check an Excel register, detect duplicate content, rename files, flatten folders, and move selected files. |
| Child Document Number Generator | Expand parent document number ranges into child document numbers and export results as CSV. |
| Aconex Multi Document Number Search | Turn document-number lists into chunked `docno:(... OR ...)` queries for Aconex Document Register Search. |

The interface supports Indonesian and English, plus light and dark themes.

## Requirements

- A current desktop version of Microsoft Edge or Google Chrome is recommended.
- Folder read/write features use the File System Access API and therefore require a supported browser and a secure context (`https://` or localhost).
- Google Fonts, PDF.js, and SheetJS are loaded from external CDNs. PDF and Excel-related features need internet access on first load unless those assets are already cached.
- Node.js 20 or newer is optional and only used to run repository validation.
- Python 3 is optional and can be used as a simple local web server.

Firefox and Safari can open the pages, but operations that require directory handles may be unavailable. The File Naming tool includes a folder-upload fallback for scanning where supported.

## Quick start

Clone the repository and serve its root directory:

```bash
git clone https://github.com/yedisupriadi/master-folder-file-management-tools.git
cd master-folder-file-management-tools
python -m http.server 8000
```

Open <http://localhost:8000/>. You can also open some pages directly from disk, but localhost is recommended because browser security rules restrict several file-system, clipboard, and cryptographic APIs on `file://` pages.

No `npm install` step is needed.

## Usage notes

Always test rename, flatten, move, and delete operations on disposable sample data before using them on project documents. Browser permission prompts control which folders a page can access.

The tools store only interface preferences and optional Notion connection settings in browser `localStorage`. Clearing site data removes those settings. The Notion app key is visible to users of the same browser profile and must not be treated as a private user credential.

## Optional Notion integration

Folder Management can read folder names and grouping data from a Notion database through the included read-only Cloudflare Worker:

```text
Browser page -> Cloudflare Worker -> Notion API
```

The Notion integration secret stays in the Worker. The browser sends a shared `APP_KEY`; the Worker permits only metadata and query actions. See [the Worker setup guide](notion-proxy/README.md) for deployment, secrets, database sharing, and limitations.

Important safeguards:

- Store `NOTION_TOKEN` and `APP_KEY` as Cloudflare Worker secrets, never in Git.
- Set `ALLOWED_DB` to the smallest practical database allowlist.
- Treat `APP_KEY` as a lightweight access gate because browser users can inspect it.
- Add Cloudflare Access or equivalent authentication when database contents are sensitive.

## Validation

Run the dependency-free repository checks:

```bash
npm run check
```

The validator checks:

- JavaScript syntax in every inline script and in the Notion Worker;
- duplicate HTML IDs and references to missing IDs;
- required metadata and local links;
- presence of core repository documentation.

The same command runs in GitHub Actions for every push and pull request. Because File System Access depends on browser permissions and real local handles, destructive or file-moving workflows still require a manual smoke test with disposable data.

## Deployment

### GitHub Pages

The static pages can be hosted directly from the repository:

1. Open the repository's **Settings -> Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the default branch and the repository root (`/`).
4. Save and wait for the Pages URL to become available.

GitHub Pages hosts only the static HTML tools. Deploy `notion-proxy/` separately to Cloudflare Workers if Notion integration is required.

### Offline or internal distribution

You may copy the root HTML files to an internal web server. For fully offline use, vendor the Google Font, PDF.js, and SheetJS assets locally and update the corresponding URLs. Review your organization's document-handling and third-party CDN policies first.

## Project structure

```text
.github/                       GitHub Actions and contribution templates
notion-proxy/                  Optional read-only Notion Cloudflare Worker
scripts/validate.mjs           Dependency-free repository validator
index.html                     Tool launcher
folder-manager.html            Folder and file operations
file-naming-convention.html    Naming audit and register cross-check
child-number-generator.html    Child number generation
aconex-search-generator.html   Aconex search query generation
```

## Privacy and security

Selected local files are processed in the browser. The static application does not include analytics or an application backend. External CDN providers can still receive ordinary web-request metadata when their assets are loaded.

Do not include real project documents, customer data, tokens, or app keys in issues or pull requests. See [SECURITY.md](SECURITY.md) for private reporting and credential guidance.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), run `npm run check`, and submit a focused pull request. Bug and feature request templates are available when opening an issue.

## Third-party names

Oracle and Aconex are trademarks or registered trademarks of their respective owners. This independent project is not affiliated with or endorsed by Oracle. The Aconex name is used only to describe compatibility with [Oracle Aconex](https://www.oracle.com/construction-engineering/aconex/).

## License

Released under the [MIT License](LICENSE).
