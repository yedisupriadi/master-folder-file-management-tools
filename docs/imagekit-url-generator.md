# Tool #8 — Multi-Account ImageKit URL Manager

Tool #8 displays image URLs from **one ImageKit account or all registered accounts**, covering **all folders and subfolders** automatically.

It uses the existing static GitHub Pages website and a read-only Supabase Edge Function as a server-side proxy. There are **no new database tables, migrations, or third-party dependencies**.

Architecture:

    GitHub Pages / imagekit-url-generator.html
      -> POST {action:"accounts"} with Tool Access Token
    Supabase Edge Function / imagekit-url-generator
      -> Returns public account id + display label (NEVER the private API key)
      -> POST {action:"files",accountId:"tgm",skip:0}
    ImageKit GET https://api.imagekit.io/v1/files
      -> type=file, fileType=image, skip, limit=250
      -> NO path parameter, so the entire account's Media Library is searched

When **All Accounts** is selected, the browser queries each account separately, follows all pagination pages, combines results with AccountID+FileID identity, and derives folder metadata from the API filePath. A failure for one account does **not** discard other accounts; the page reports failures, and the CSV file name receives PARTIAL when any account failed or the run was cancelled.

## Step 1 — Generate a read-only ImageKit private API key per account

1. Open https://imagekit.io/dashboard and switch to the desired ImageKit account.
2. Developer Options → API Keys → create a **restricted API key**.
3. Grant only **Media Management: Read only** permission.
4. Record the private key in a secure password manager, then repeat for your other ImageKit accounts.
5. Never share private keys in a chat, screenshot, GitHub repository or the browser URL Manager page.

ImageKit public keys are not sufficient for listing private Media Library assets.

## Step 2 — Generate one separate Tool Access Token

This token is **not an ImageKit key**. It protects the backend from public visitors. One Tool Access Token grants access to **all registered accounts**; it is intended for one trusted owner or a small trusted team.

Open Windows PowerShell:

    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    [Convert]::ToBase64String($bytes)

Save the generated token in your password manager.

## Step 3 — Add multi-account secrets in Supabase

Use https://supabase.com/dashboard and select the authorized Supabase project. This repository currently has an endpoint defaulting to **slqplzovrotfiohcijap**, because Folder Management already uses that project.

Navigate to **Edge Functions → Secrets**. Add the following values (names exact):

1. IMAGEKIT_URL_TOOL_TOKEN = your 44-character token from Step 2.
2. IMAGEKIT_PRIVATE_KEY_TGM = the restricted private key for ImageKit account TGM.
3. IMAGEKIT_PRIVATE_KEY_TERRAVET = the restricted private key for ImageKit account Terravet.
4. IMAGEKIT_PRIVATE_KEY_TNL = the restricted private key for ImageKit account TNL.
5. IMAGEKIT_ACCOUNTS = JSON array of account *descriptors* below (no actual API keys in this JSON):

    [{"id":"tgm","label":"TGM","secretName":"IMAGEKIT_PRIVATE_KEY_TGM"},{"id":"terravet","label":"Terravet","secretName":"IMAGEKIT_PRIVATE_KEY_TERRAVET"},{"id":"tnl","label":"TNL","secretName":"IMAGEKIT_PRIVATE_KEY_TNL"}]

Enter the JSON as **one line** in the secret value field. Edit the registry and secret variables to match your actual accounts. Do not create fictitious keys or accounts in Supabase; the above is a configuration example.

- Account id: lowercase, begins with a letter, 2–40 characters, and can contain a–z, 0–9, underscore and hyphen.
- Account label: readable display name, up to 80 characters.
- secretName: a separate environment variable named IMAGEKIT_PRIVATE_KEY_ followed by uppercase letters, numbers or underscores.
- Up to 30 accounts per configured registry.
- The backend rejects missing keys, duplicates, malformed JSON, and unknown account IDs.

**Single-account backward compatibility:** If IMAGEKIT_ACCOUNTS is absent, the function uses legacy secret IMAGEKIT_PRIVATE_KEY under account id default. Once you add IMAGEKIT_ACCOUNTS, the explicit registry replaces the fallback and every referenced secret must be configured.

**Security note:** Supabase environment secrets are project-scoped. Other functions in the same Supabase project can technically read them, so a separate project is appropriate if stronger tenant isolation is required. The static website never receives the private keys.

## Step 4 — Deploy only the ImageKit Edge Function

The existing website and other tools do not need to be redeployed separately, but **the Edge Function must be deployed** with the new backend source.

### Recommended: Supabase Dashboard

1. Open the intended Supabase project.
2. Open Edge Functions and choose the function named imagekit-url-generator (create it if absent).
3. Update the function source using the repository file at:
   supabase/functions/imagekit-url-generator/index.ts
4. Deploy the function.
5. Disable built-in JWT verification for this function; it independently enforces IMAGEKIT_URL_TOOL_TOKEN on each POST request. Do **not** remove that token check.

### Alternative: CLI after reviewing the changes

Inside the local repository folder in VS Code PowerShell, use the documented CLI (check help for current flags):

    npx supabase --help
    npx supabase functions deploy --help
    npx supabase login
    npx supabase functions deploy imagekit-url-generator --project-ref slqplzovrotfiohcijap --no-verify-jwt

This command deploys ONLY imagekit-url-generator. It does not migrate a database or change other functions. If you use a different project, replace the project ref and the endpoint URL in the Tool #8 page.

## Step 5 — Use Tool #8

1. Open https://yedisupriadi.github.io/master-folder-file-management-tools/imagekit-url-generator.html
2. Enter your **Tool Access Token**, not any ImageKit private key.
3. Click **Muat Daftar Akun / Load Accounts**; it shows account labels from the secured backend.
4. Select **Semua Akun / All Accounts** (default), or one account.
5. Click **Fetch All Image URLs**. The tool calls each ImageKit account and retrieves pages of up to 250 files until complete.
6. Use the **Folder filter** and search field, or copy a URL, copy all URLs, copy filtered URLs, or export CSV.

CSV columns: AccountID, AccountName, FolderPath, FileName, ImageURL, FileID, FilePath, CreatedAt, Width, Height, SizeBytes, Private.

A file URL can be private and require an ImageKit signed URL to display. This tool does not expose signed URLs or modify private files; private-image previews are disabled. CSV output contains the original URL and private flag.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Load Accounts returns 404 / Failed to fetch | Edge Function not deployed, wrong project ref, or network issue. |
| 401 Access token invalid | The separate IMAGEKIT_URL_TOOL_TOKEN is missing/wrong; do not use ImageKit private key in browser. |
| 503 Registry not configured | Check IMAGEKIT_ACCOUNTS JSON and every IMAGEKIT_PRIVATE_KEY_* secret. |
| ImageKit credentials invalid | Check the selected account's restricted key and read-only permission. |
| 403 Origin not allowed | Open from the approved GitHub Pages domain or localhost. |
| No files for one account | Check that the account has images and the API key belongs to that account. |
| 429 rate limited | The tool retries twice, then marks that account as failed. |
| PARTIAL in downloaded CSV name | One or more accounts failed; the remaining accounts were exported, not a complete data set. |
| URLs do not show previews | Check file privacy/delivery settings; private files require signed URLs. |

## Security and operational limitations

- No private API keys or access tokens are embedded in GitHub Pages or stored in browser localStorage.
- The browser submits a separate user-supplied Tool Access Token to the allowlisted Supabase endpoint; server verifies it before calling ImageKit.
- The backend performs read-only ImageKit GET API calls, and accepts only accounts/files actions.
- Origin/CORS is not authentication. The shared token grants access to all registered accounts. For multiple independent users, implement per-user login, RBAC and account-specific authorization before wider rollout.
- API calls from the browser are sequential **per account**, limiting request bursts and keeping account failures independent.
- No live credentials are used by automated tests. Run npm run check and then a smoke test with real, owner-authorized account keys after deployment.
- CSV exports are snapshots; a later upload requires clicking Fetch again. Avoid excessively frequent refreshes for large libraries.

Official references:
- https://imagekit.io/docs/api-keys
- https://imagekit.io/docs/api-overview
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/function-configuration
- https://supabase.com/docs/guides/functions/deploy
