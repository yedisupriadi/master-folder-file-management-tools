# Administration Document Registered-File Flow v1

This first register-backed naming implementation connects Folder Management Tool to the governed TGM Administration Document Register.

## Effective profile

`TGM Administration Document`

- Register: `tgm_administration_document_register`
- Authoritative business identifier: `document_number`
- Filename source: `letter_id`
- Physical filename transformation: replace file-system-invalid characters while preserving the register value itself

## Creation flow

1. Open a local folder in Folder Management Tool.
2. Select or bind `TGM Administration Document`.
3. Sign in with an authenticated `@trigammametri.co.id` account.
4. Choose Department, Administration Document Type, Year Release, and Document Title.
5. Supabase allocates the next three-digit Sequence Number atomically within Department + Document Type + Year.
6. The governed register formula generates `document_number` and `letter_id`.
7. The global `document_identity_registry` rejects a duplicate Document Number across participating registers.
8. The tool shows the generated filename and can rename an existing file in the open folder while preserving its extension.

## Compliance scan

For this profile, **Scan Current Files** no longer validates only delimiter/field shape. It reads active Administration Document Register records and compares each file base name to the register-derived, filesystem-safe `letter_id`.

## Current boundary

The register record is authoritative. v1 does **not** yet persist a relationship between the register row and the physical file location. That storage/link model will be designed separately so it can support SharePoint, OneDrive, server/NAS, CDE, Supabase Storage, or other platforms without coupling the register to one storage product.
