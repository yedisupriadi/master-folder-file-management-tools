# Changelog

All notable changes to this project will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

### Changed

- Expanded project and Notion Worker documentation for public use.
- Hardened the Notion Worker with required app-key authentication, input validation, no-store responses, and declared required secrets.
- Corrected the local development launcher to serve the repository root.
- Administration Document Number formula now resolves canonical `department_code` and `doc_code` fields directly, avoiding dependence on display-label parsing.

[Unreleased]: https://github.com/yedisupriadi/master-folder-file-management-tools/compare/main...HEAD