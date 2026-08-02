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

### Changed

- Expanded project and Notion Worker documentation for public use.
- Hardened the Notion Worker with required app-key authentication, input validation, no-store responses, and declared required secrets.
- Corrected the local development launcher to serve the repository root.

[Unreleased]: https://github.com/yedisupriadi/master-folder-file-management-tools/compare/main...HEAD
