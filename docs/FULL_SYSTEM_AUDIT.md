# Full system audit and UI standardization

Baseline: `main` at `f171cbc`, fetched and verified on 2026-09-10. Implementation branch: `feature/full-ui-system-audit`. No database, RPC, RLS, Edge Function, folder taxonomy, or numbering allocation changes.

## Scope and dependency inventory

All eight root HTML files were inventoried. All now load `styles/tool-ui.css` and `scripts/tool-ui.js` with relative URLs. No application framework, package dependency, build step, or service worker was introduced.

| Page | Application dependencies | State, backend and filesystem |
| --- | --- | --- |
| `index.html` | Inline tool directory and navigation | Shared language/theme preferences; links to the six tools |
| `folder-manager.html` | Fetches core, flatten, naming, register, register-actions, register-fieldcheck; injects these inside the core IIFE; loads Supabase adapter | Browser folder handles, profile/binding/ignore preferences, Supabase Folder Standards and Administration Register |
| `folder-manager-core.html` | Preserved standalone legacy engine, inline rendering, tree, toolbar, spreadsheet and two library panels | File System Access API; legacy Notion proxy configuration when accessed directly |
| `file-naming-convention.html` | Five inline script blocks, folder audit, spreadsheet register, PDF and duplicate inspection | Local file handles, optional PDF.js/worker and SheetJS CDN loading, browser preferences |
| `child-number-generator.html` | Inline range/parser/generator/export logic | Local input and clipboard; independent of governed Administration Document Number allocation |
| `aconex-search-generator.html` | Inline input normalization, Aconex query generation and export | Local input and clipboard |
| `sharepoint-link-cleaner.html` | Inline normalization and folder extraction | Local URLs, clipboard, session handoff to URL Builder |
| `sharepoint-url-builder.html` | Inline filename/URL generation, optional Tesseract OCR | Local input/images, optional OCR CDN, session handoff |

Folder Manager dependency order:

```text
folder-manager.html
  -> shared storage/preferences and CSS
  -> fetch core + five extension sources
  -> transform legacy library terminology
  -> insert extensions before the core IIFE closes
  -> Supabase adapter configures the five governed table IDs
  -> core DOMContentLoaded initializes filesystem/browser/grid/library panels
  -> adapter enhances type/level selectors and loads standards
  -> naming profiles bind to current folder context
  -> register auth and masters -> governed creation RPC
  -> fieldcheck scans register pages -> diagnoses fields -> remediation actions
  -> renderAll / setLang wrappers update context, labels and result visibility
```

Additional repository surfaces reviewed:

- Six root JS modules: Supabase configuration, flatten, naming, register, actions, fieldcheck.
- `supabase/functions/folder-standards/index.ts`: five-table allowlist, active-row filters, parent relations, origin/client-key checks and server credential boundary. Left unchanged.
- `notion-proxy/worker.js` and `wrangler.toml`: read-only proxy, authentication, database allowlist, query pagination and CORS. Left unchanged.
- `.github/workflows/validate.yml`: Node 22 and `npm run check`; the expanded check command automatically includes the new regressions.
- `scripts/validate.mjs`, existing Folder Standard, SharePoint and Worker tests, README, contributing/security guidance and Administration Register flow documentation.
- All existing `<style>` blocks and extension-injected CSS. Shared root/theme declarations were consolidated; page-specific layout rules remain in their original pages.
- No application service worker was found. PDF.js and Tesseract use optional library workers. Hosting still requires HTTP(S), including localhost or GitHub Pages.

## Findings and fixes

| Severity | Problem / root cause | Fix | Affected files |
| --- | --- | --- | --- |
| Critical | Register rename could copy a file onto itself and then remove it when native `move()` was unavailable. Collision checks trusted stale UI entries. | No-op guard, live target probe, one shared rename path, operation lock before awaits, fail on permission errors. | register, register-actions, flatten |
| Important | Register scans fetched one response page, allowing later records to be misclassified as unregistered. | Follow server count/range and actual returned page sizes; reject incomplete responses. | register, fieldcheck |
| Important | Parallel master requests could refresh the same rotating session independently; late refresh could revive a signed-out session. | Share the in-flight refresh promise, check session identity before saving, avoid unnecessary second refresh on 401. | register |
| Important | Fieldcheck candidates used `dept`/`type`; Register Existing File expected `deptCode`/`typeCode`. | Preserve compatible candidate properties; verified master preselection. | fieldcheck |
| Important | Register rows have no `issues` array, but language changes passed them to the ordinary renderer. | Route register rows to fieldcheck; restore three-column headers for ordinary profiles. | naming, fieldcheck |
| Important | A scan or directory read could render after the user navigated elsewhere. | Capture folder/profile/session context, version directory reads, discard stale results and clear scans on filesystem refresh. | core, naming, fieldcheck |
| Important | Slow Folder Standard requests could replace a newly selected type/level. | Version library requests and verify the selected table before rendering. | core |
| Important | Repeated create clicks could allocate multiple governed records. | Busy guard and disabled controls while awaiting the existing RPC; never generate numbers in JS. | register |
| Important | Existing Letter ID profiles were migrated to a different two-field meaning; exact Letter IDs without a TGM prefix were ignored. | Preserve single-field `letter_id`; accept unique exact authoritative filename matches before candidate parsing. | fieldcheck |
| Important | Normalized fields could all pass despite a wrong delimiter/physical filename; sanitized titles could remain partial after rename. | Require the generated canonical filename for PASS; compare title metadata using the same filesystem sanitization as filename generation. | fieldcheck |
| Important | Selecting a replacement profile was immediately reset to the bound profile. | Keep selection available for rebinding; retain the effective binding badge and bound-profile scan precedence. | naming |
| Important | Copy collision suffixes were appended after extensions; permission errors were treated as missing destinations. | Preserve extensions and fail closed on unexpected probe/ancestry errors. | core, flatten |
| Important | A batch plan could be previewed for one directory and confirmed in another. | Capture preview destination and require a new preview after navigation. | core |
| Important | Corrupt or unavailable browser storage could break startup or dynamic controls. | Shared in-memory fallback with a visible persistence notice; validate JSON container shapes and preferences; synchronize storage events. | all pages, UI helper, naming, adapter, register-actions |
| Minor | Failed OCR script nodes were retained, causing retry listeners to wait forever on an already failed load. | Remove failed loader nodes before retry. | URL Builder |
| Minor | Boot error details were inserted as HTML. | Append exception details as a text node. | Folder Manager loader |
| Minor | Missing favicons caused incidental 404 console messages. | Local/data SVG favicons. | loader, SharePoint pages, shared icon asset |
| Minor | Unlabelled injected controls, mouse-only clear/tree controls, missing focus and dialog semantics. | Associate labels, provide accessible names, keyboard activation, visible focus, table scope, status announcements and preview dialog keyboard behavior. | UI helper, shared CSS, naming |

No confirmed backend defect required a production change. The existing RPC remains the only Administration Document Number allocator. Global uniqueness and sequence policy remain database responsibilities.

## Presentation and architecture

- System/Inter fallback typography with a 12/13/14/16/24px scale; removed Google Fonts requests.
- Shared semantic light/dark colors, spacing, radii and shadows. Legacy variable aliases preserve existing renderer contracts.
- Compact primary, secondary, success, warning and danger button treatments; consistent forms, tables, badges and focus rings.
- Existing outline SVGs retained; shared outline helper replaces remaining clear/chevron controls and the decorative folder picker graphic. Branding assets remain intact.
- Extension layout CSS moved out of naming/register JS into the shared stylesheet. Old overwritten exact-only scan/render implementations removed.
- Register result columns remain File, Register Match, Status, Field Check, Suggested Filename and Action. Partial diagnostics are expanded; passing diagnostics can be opened. Status text remains explicit.
- Tables scroll horizontally; long suggested names wrap. Smaller screens retain the same functional sections and controls. Desktop navigation, toolbar, browser, two library panels, spreadsheet and register layout remain recognizable.
- No page-level business logic was moved to a framework or backend replacement.

## Regression evidence

Automated checks:

- HTML metadata, duplicate static IDs, local links/assets, inline script syntax and seven standalone client scripts.
- Compilation of the actual core + all injected extension source in the shared IIFE scope.
- Existing Folder Standard boundary checks, SharePoint behavior tests and 13 Notion Worker tests.
- Register tests: PASS / PARTIAL MATCH / UNREGISTERED / NOT GOVERNED / IGNORED; `020A -> 020` sequence diagnostics; independent title mismatch; ambiguous candidate rejection; canonical filename formatting; Letter ID identity; pagination; stale navigation; shared refresh and logout races.
- Filesystem fault tests: no-op rename, live collisions, permission denial, writable abort, source retention, copy-before-delete, duplicate operation prevention and extension preservation.
- Unavailable-storage fallback.

Browser checks use headless Edge and a dependency-free CDP runner. Screenshots and machine-readable results are written outside the repository to the OS temporary directory:

- All eight pages in light/dark, ID/EN, at 1440px; overflow checked at 1280, 1920 and 768px. No application exceptions, broken local assets, duplicate DOM IDs or unlabelled visible native form controls in the completed smoke run.
- Live **read-only** Folder Standard requests for Personal L1/L2 and Project L1/L2/L3.
- Real browser-owned filesystem handles in an isolated profile: choose folder, create folder, navigation/up, copy/cut/paste, collision names, delete, batch hierarchy creation, register rename and content preservation.
- Mocked Administration Register responses: scans across multiple pages, matched-record remediation restrictions, Ignore/Restore, master preselection, one RPC for repeated create clicks, backend-returned numbering, physical rename and ordinary profile binding/header restoration.
- Browser extensions are disabled in the isolated profile to avoid unrelated extension messaging errors.

Run `npm run check`. On a machine with Edge/Chromium and Node 22+, run `npm run test:browser`; set `AUDIT_BROWSER` to the browser executable if needed. The browser runner uses ports 8734/9334 and an isolated temporary browser profile. It never selects user directories or submits a production register write.

## Known limitations and review boundaries

- Production sign-in, RLS authorization and real register creation were not exercised with a user's account. Register writes and auth fixtures are isolated; final acceptance of those production permissions requires authenticated review.
- Browser-owned filesystem tests exercise actual handles but do not prove every OS directory-picker permission, network drive behavior or browser vendor implementation. Use disposable OS folders for final interactive acceptance.
- File System Access does not provide an exclusive-create transaction spanning external applications. Live collision checks reduce overwrite risk but cannot lock files against unrelated OS writers. Copy/delete fallback cannot provide transactional rollback if source deletion fails; refresh before retrying. Case-only rename collisions are rejected rather than risking deletion.
- Legacy browser-local folder binding/ignore keys remain based on the displayed root/path. Separate physical roots with identical names can share those legacy keys; an identity-backed migration requires a separately designed compatibility flow. No hidden taxonomy/profile migration was introduced.
- Optional PDF, spreadsheet and OCR features retain their existing CDN dependencies; the complete range of document formats/OCR inputs was not exhaustively tested. Core UI fonts and styles work without those CDNs.
- Arbitrary non-register Supabase naming-field lookups remain explicitly marked REVIEW as in the original implementation; no invented lookup standard was added.
- The direct core HTML retains its legacy Notion compatibility behavior; the public Folder Manager loader remains the Supabase-governed entry point.
- This is not a formal screen-reader certification or a proof that no undiscovered defect exists. Existing page-specific layout CSS and domain terminology remain where needed to preserve workflows.

## Before / after

Before: independent palettes and font loading, per-module CSS injection, partially stale scan headers/results, truncated register reads, decorative symbols and inconsistent interaction feedback.

After: the same working layout uses shared presentation tokens; scans identify authoritative records across pages, preserve identity semantics, expose independent field findings and offer appropriate remediation. Keyboard/focus support and file-operation guards improve predictable daily use.

## Files changed

Application: `aconex-search-generator.html`, `child-number-generator.html`, `file-naming-convention.html`, `folder-manager-core.html`, `folder-manager.html`, `folder-manager-flatten.js`, `folder-manager-naming.js`, `folder-manager-register.js`, `folder-manager-register-actions.js`, `folder-manager-register-fieldcheck.js`, `folder-manager-supabase-config.js`, `index.html`, `sharepoint-link-cleaner.html`, `sharepoint-url-builder.html`.

Shared assets: `styles/tool-ui.css`, `styles/tool-icon.svg`, `scripts/tool-ui.js`.

Validation: `package.json`, `scripts/validate.mjs`, `scripts/test-sharepoint-tools.mjs`, `scripts/test-register.mjs`, `scripts/test-filesystem.mjs`, `scripts/browser-audit.mjs`, `scripts/browser-fixtures.js`.

Documentation: this report, `README.md`, `CHANGELOG.md`.

## Reference verification

The [Supabase changelog](https://supabase.com/changelog) was reviewed for relevant breaking changes. Session-refresh behavior was checked against [Supabase session documentation](https://supabase.com/docs/guides/auth/sessions). No SDK or backend upgrade was needed.
