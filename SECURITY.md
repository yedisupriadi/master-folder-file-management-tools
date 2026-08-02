# Security Policy

## Supported version

Security fixes are applied to the latest revision on the default branch. Older snapshots and downloaded copies are not maintained.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability or an exposed credential. Use [GitHub private vulnerability reporting](https://github.com/yedisupriadi/master-folder-file-management-tools/security/advisories/new) when it is available. If private reporting is unavailable, contact the repository owner privately through the contact method listed on their GitHub profile.

Include the affected page or Worker route, impact, reproduction steps, and any suggested mitigation. Remove customer data, access keys, document contents, and other sensitive information from the report.

## Data and credential model

- The HTML tools process selected files locally in the browser. They do not upload file contents to this repository.
- The optional Notion integration sends database requests to the operator's Cloudflare Worker.
- `NOTION_TOKEN` and `APP_KEY` must be stored as Cloudflare Worker secrets and must never be committed.
- The browser-side app key is stored in `localStorage` and is visible to anyone who can use that browser profile. It is an access gate, not a replacement for identity-aware access control.
- For sensitive deployments, restrict `ALLOWED_DB` and protect the Worker with Cloudflare Access or an equivalent authentication layer.

If a credential is exposed, revoke or rotate it immediately, review Worker and Notion access logs, and remove it from Git history before publishing.
