# Master Folder & File Management Tools

A collection of browser-based utilities for document controllers and project teams. The tools run as standalone HTML pages, keep selected document contents in the browser, and require no application build step.

[![Validate](https://github.com/yedisupriadi/master-folder-file-management-tools/actions/workflows/validate.yml/badge.svg)](https://github.com/yedisupriadi/master-folder-file-management-tools/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Included tools

| Tool | Purpose |
| --- | --- |
| Folder Management Tool | Browse, copy, move, rename, and delete files or folders; find empty folders; build folder structures from a spreadsheet-like grid or the Supabase standard-folder library. |
| File Naming Convention Management | Scan folders, audit naming structure, cross-check an Excel register, detect duplicate content, rename files, flatten folders, and move selected files. |
| Child Document Number Generator | Expand parent document number ranges into child document numbers and export results as CSV. |
| Aconex Multi Document Number Search | Turn document-number lists into chunked `docno:(... OR ...)` queries for Aconex Document Register Search. |
| SharePoint Link Cleaner | Convert SharePoint sharing links in bulk into clean file URLs and their parent folder URLs. |
| URL Builder | Build SharePoint file URLs from a folder and file-name list, with CSV/TSV output and optional screenshot OCR. |

The interface supports Indonesian and English, plus light and dark themes.

## Requirements

- A current desktop version of Microsoft Edge or Google Chrome is recommended.
- Folder read/write features use the File System Access API and therefore require a supported browser and a secure context (`https://` or localhost).
- The Folder Management standard-folder panel requires internet access to the configured Supabase Edge Function.
- Google Fonts, PDF.js, SheetJS, and the optional Tesseract.js OCR library are loaded from external CDNs. PDF, Excel, and OCR features need internet access on first load unless those assets are already cached.
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

Open <http://localhost:8000/>. Localhost is recommended because browser security rules restrict several file-system, clipboard, and cryptographic APIs on `file://` pages.

No `npm install` step is needed.

## Usage notes

Always test rename, flatten, move, and delete operations on disposable sample data before using them on project documents. Browser permission prompts control which folders a page can access.

The tools store interface preferences and Folder Management view settings in browser `localStorage`. The Supabase publishable key used by the static Folder Manager is intentionally a client-side key; it is not a database secret and must remain limited by the Edge Function authorization logic. Supabase secret/service-role credentials stay server-side in the Edge Function environment and are never committed to this repository.

## Supabase standard-folder integration

Folder Management now uses Supabase as the authoritative source for standard folder structures:

```text
Browser page -> Supabase Edge Function (folder-standards) -> Supabase Postgres
```

The current standard-folder sources are:

- `standard_folder_personal_l1`
- `standard_folder_personal_l2`
- `standard_folder_project_l1`
- `standard_folder_project_l2`
- `standard_folder_project_l3`

Only active records are returned. Personal Level 2 rows are enriched with the Level 1 parent folder name, while Project Level 2 and Level 3 use their existing parent-folder fields. The two-panel Folder Manager UI remains available so adjacent structure levels can be reviewed side-by-side.

Security boundaries:

- The browser sends only the Supabase **publishable** key.
- The `folder-standards` Edge Function accepts only the five allowlisted standard-folder tables.
- The Edge Function is read-only and filters to `is_active = true`.
- The Edge Function validates the calling application key and restricts browser origins.
- Supabase secret/service-role keys are read only from the Edge Function environment and never sent to the browser.

The legacy `notion-proxy/` implementation remains in the repository for historical compatibility, but Folder Management no longer uses Notion as its standard-folder source.

### Folder Manager composition

`folder-manager-core.html` preserves the mature folder-management implementation. `folder-manager.html` loads that core and applies the Supabase adapter before execution. `folder-manager-supabase-config.js` supplies the fixed standard-table catalog and converts the Supabase response into the existing grid model. This isolates the data-source migration from the proven local file/folder operations.

## Validation

Run the dependency-free repository checks:

```bash
npm run check
```

The validator checks:

- JavaScript syntax in every inline script and in the legacy Notion Worker;
- duplicate HTML IDs and references to missing IDs;
- required metadata and local links;
- presence of core repository documentation;
- Supabase Folder Manager adapter configuration and the five-table allowlist;
- behavior of SharePoint URL normalization, folder extraction, filename cleanup, OCR-text extraction, and URL encoding.

The same command runs in GitHub Actions for every push and pull request. Because File System Access depends on browser permissions and real local handles, destructive or file-moving workflows still require a manual smoke test with disposable data.

## Deployment

### GitHub Pages

The static pages can be hosted directly from the repository:

1. Open the repository's **Settings -> Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the default branch and the repository root (`/`).
4. Save and wait for the Pages URL to become available.

The `folder-standards` Edge Function must be deployed to the matching Supabase project. The browser configuration in `folder-manager-supabase-config.js` must point to that function and use a publishable key from the same project.

### Offline or internal distribution

You may copy the root HTML files to an internal web server. Folder/file operations can still be local, but the standard-folder library requires connectivity to Supabase unless you replace the adapter with an internal data source. For fully offline use of the other tools, vendor the Google Font, PDF.js, SheetJS, and Tesseract.js assets locally and update the corresponding URLs. Review your organization's document-handling and third-party service policies first.

## Project structure

```text
.github/                                      GitHub Actions and contribution templates
notion-proxy/                                 Legacy read-only Notion Cloudflare Worker
supabase/functions/folder-standards/index.ts  Read-only Supabase standard-folder API
scripts/validate.mjs                          Dependency-free repository validator
index.html                                    Tool launcher
folder-manager.html                           Folder Manager Supabase bootstrap
folder-manager-core.html                      Preserved Folder Manager core implementation
folder-manager-supabase-config.js             Supabase table catalog and grid adapter
file-naming-convention.html                   Naming audit and register cross-check
child-number-generator.html                   Child number generation
aconex-search-generator.html                  Aconex search query generation
sharepoint-link-cleaner.html                  SharePoint sharing-link cleanup
sharepoint-url-builder.html                    Batch SharePoint URL generation and optional OCR
```

## Privacy and security

Selected local files are processed in the browser and are not uploaded by Folder Management. The standard-folder panel retrieves only the allowlisted standard metadata from Supabase through the Edge Function. External CDN providers can still receive ordinary web-request metadata when their assets are loaded.

SharePoint links, file names, and OCR images are processed locally; the URL Builder loads the OCR runtime and language data from jsDelivr only when OCR is requested. Do not include real project documents, customer data, secret keys, tokens, or credentials in issues or pull requests. See [SECURITY.md](SECURITY.md) for private reporting and credential guidance.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), run `npm run check`, and submit a focused pull request. Bug and feature request templates are available when opening an issue.

The [system audit report](docs/FULL_SYSTEM_AUDIT.md) documents the page/module dependency map, runtime fixes, shared UI system, validation evidence and remaining review boundaries. All pages share `styles/tool-ui.css` and `scripts/tool-ui.js`; page-specific layout stays in the original HTML. Core typography uses a local/system font stack.

Optional browser regression checks run with `npm run test:browser` on Node 22+ and Edge/Chromium (`AUDIT_BROWSER` can override the executable). They use temporary browser-owned files, mocked Administration Register writes and read-only live Folder Standard requests. Screenshots and results go to the OS temporary directory, not the repository. No production register entries are created.

## Third-party names

Oracle and Aconex are trademarks or registered trademarks of their respective owners. This independent project is not affiliated with or endorsed by Oracle. The Aconex name is used only to describe compatibility with [Oracle Aconex](https://www.oracle.com/construction-engineering/aconex/).

## License

Released under the [MIT License](LICENSE).
