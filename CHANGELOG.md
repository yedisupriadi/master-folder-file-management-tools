# Changelog

All notable changes to this project will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### System audit and shared UI

- Shared light/dark design tokens, local typography, outline icon helpers, compact controls, table/status styling, keyboard focus and accessible labels across all eight pages.
- Consolidated naming/register extension styles into the shared stylesheet and removed overwritten legacy register scan renderers.
- Fixed register pagination, concurrent auth refresh, stale scan results, repeated create clicks, fieldcheck-to-remediation mappings and ordinary-profile header restoration.
- Preserved Letter ID identity during legacy profile migration and added canonical physical-filename validation alongside field diagnostics.
- Guarded rename no-ops, live collisions and permission failures; abort failed writable streams, preserve copy extensions and validate batch-preview destinations.
- Added storage fallback, OCR loader retry recovery, local favicons, filesystem/register regressions and a dependency-free browser test runner.
- Documented the audit and verification boundaries in `docs/FULL_SYSTEM_AUDIT.md`. Database-governed numbering, uniqueness, RPCs, RLS, folder standards and backend functions are unchanged by this audit.

### Added

- Aconex multi-document-number search query generator.
- SharePoint Link Cleaner for converting sharing links into clean file and folder URLs.
- URL Builder for batch-generating SharePoint file URLs, exporting CSV/TSV, and optionally extracting file names from screenshots with browser-based OCR.
- Direct handoff of the first cleaned folder URL from SharePoint Link Cleaner to URL Builder.
- Dependency-free validation for HTML metadata, local links, DOM IDs, and JavaScript syntax.
- Automated Cloudflare Worker behavior tests and GitHub Actions validation.
- Contribution, security, conduct, issue, and pull request guidance.
- Collapsible Standard Folder Library and Batch Folder sections in Folder Management Tool, with browser-persisted expand/collapse state.
- File Naming Convention Implementation v1 inside Folder Management Tool: reusable naming profiles, configurable delimiter and fields, manual field validation rules, Supabase source references, folder-profile binding, and current-folder compliance scanning.
- Governed `TGM Administration Document` naming profile linked to `tgm_administration_document_register`, including authenticated quick-create, automatic sequence allocation, generated filename, existing-file rename, and register-aware compliance scanning.
- Supabase global `document_identity_registry` and atomic Administration Document creation RPC to preserve cross-register Document Number uniqueness.
- Administration Document filename source selector for choosing either `document_number` or `letter_id` as the complete physical filename base, with preview and register-aware scanning.
- Actionable Administration Document scan results with `PASS`, `RENAME REQUIRED`, `UNREGISTERED`, `NOT GOVERNED`, and `IGNORED` classifications, plus Rename, View Record, Register Existing File, Ignore, and Restore actions.
- Register Existing File remediation that pre-fills Department, Document Type, Year, and title from a recognizable filename candidate while preserving Supabase-controlled Document Number allocation.
- Multi-field Administration Document filename profiles supporting either a single governed field or `document_number + document_title` with a configurable delimiter.
- Per-field scan diagnostics, including Document Number sub-checks for Organization, Department, Document Type, Sequence, and Year, plus a register-driven Suggested Filename column.

### Changed

- Expanded project and Notion Worker documentation for public use.
- Hardened the Notion Worker with required app-key authentication, input validation, no-store responses, and declared required secrets.
- Corrected the local development launcher to serve the repository root.
- Administration Document Number formula now resolves canonical `department_code` and `doc_code` fields directly, avoiding dependence on display-label parsing.
- Administration Document register integration no longer treats `letter_id` as the physical filename by default; the Naming Profile explicitly selects the register field used as filename.
- Added visual spacing between Batch Folder from Spreadsheet and File Naming Convention sections.
- Administration Document scans now treat supporting files without a recognizable TGM document-number pattern as `NOT GOVERNED` instead of generic failures.
- Administration Document reconciliation now uses conservative composite matching so a file can be classified as `PARTIAL MATCH` when the authoritative register record is identifiable but one or more filename fields differ; in that case the remediation is rename/view rather than creating a duplicate register record.

[Unreleased]: https://github.com/yedisupriadi/master-folder-file-management-tools/compare/main...HEAD
