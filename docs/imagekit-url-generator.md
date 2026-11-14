# Tool #8 — ImageKit URL Generator

Tool #8 lists all image URLs in one ImageKit folder using a read-only API relay, then provides thumbnails, search, copy and CSV export.

Architecture:

    GitHub Pages (imagekit-url-generator.html)
       -> POST with temporary Tool Access Token
    Supabase Edge Function (imagekit-url-generator)
       -> ImageKit private key from Supabase secrets
    ImageKit GET /v1/files (path, fileType=image, limit=250, skip)

**Never enter your ImageKit private key on GitHub Pages.** It must stay server-side.

## Step 1 — Create a restricted ImageKit API key

1. Sign in to https://imagekit.io/dashboard
2. Go to Developer Options → API Keys.
3. Create a **restricted private API key**, allowing only **Media management: Read only**.
4. Save it in a secure password manager. It is not a public key and must never be committed to the repository.

## Step 2 — Generate a separate Tool Access Token

This access token is **not** your ImageKit private key; it controls who can use the tool.

On Windows, open PowerShell and run:

    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    [Convert]::ToBase64String($bytes)

Copy the output (44 characters) to your password manager. Do not paste it in GitHub.

## Step 3 — Configure Supabase secrets

The repository already uses Supabase project reference **slqplzovrotfiohcijap** for Folder Management. Reusing this project avoids adding another SaaS service, provided that you own it and approve this scope.

1. Open https://supabase.com/dashboard and select your intended project.
2. Open **Edge Functions → Secrets**.
3. Add two secrets (spell names exactly):
   - IMAGEKIT_PRIVATE_KEY = restricted ImageKit private key from Step 1.
   - IMAGEKIT_URL_TOOL_TOKEN = separate random access token from Step 2 (at least 32 characters).
4. Save secrets. They are stored server-side, not in GitHub or the browser.

Note: Supabase secrets are project-scoped, so other functions in the same Supabase project technically have access to them. Consider a separate project when stronger isolation is required.

## Step 4 — Deploy only the Tool #8 Edge Function

**Dashboard method:** Add an Edge Function named **imagekit-url-generator** containing the code in supabase/functions/imagekit-url-generator/index.ts. Disable Supabase JWT verification for this function because it uses its own dedicated access-token check.

**CLI method:** After the PR is reviewed and merged, open PowerShell from the repository root in VS Code and run:

    npx supabase --help
    npx supabase login
    npx supabase functions deploy imagekit-url-generator --project-ref slqplzovrotfiohcijap --no-verify-jwt

Check npx supabase functions deploy --help if your CLI flags have changed. Do not deploy other functions or run database migrations. The function requires the independent access token even though JWT verification is disabled.

The function URL for the existing project is:

    https://slqplzovrotfiohcijap.supabase.co/functions/v1/imagekit-url-generator

If you deployed to a different Supabase project, update the endpoint field in Tool #8.

## Step 5 — Generate URLs

1. Open **Tool #8** from the homepage.
2. Verify the Supabase Edge Function URL.
3. Paste the separate **Tool Access Token**, not your ImageKit key.
4. Click **Muat Folder** to list folders at root (/), or enter e.g. /261002/ in Folder Path.
5. Click **Generate URLs**. The tool loads 250 assets per request until complete.
6. View/search files, copy one URL, copy all URLs, copy filtered URLs or export a UTF-8 CSV.

The table displays 100 rows per page; CSV/export includes the entire loaded result. Only immediate folder images are listed (not subfolders). Private files can require signed delivery URLs and may not render in the preview.

## Troubleshooting

| Issue | Action |
| --- | --- |
| 404 / Failed to fetch | Deploy the function, then check its name, Supabase project and URL. |
| 401 Access token invalid | Paste the separate Tool Access Token, not ImageKit API Key. |
| 503 Not configured | Check the two Supabase secrets and token length. |
| ImageKit credentials invalid | Check ImageKit restricted Media Read permissions. |
| CORS/403 | Open from https://yedisupriadi.github.io or localhost; any other deployment origin must be explicitly reviewed and allowlisted. |
| Zero results | Confirm ImageKit folder path; subfolders are not recursively searched. |
| 429 | ImageKit rate-limited the request; browser retries twice then surfaces the error. |
| Image does not load | Check ImageKit private/signed URL media delivery settings. |

## Security and QA

- Browser never handles or saves the ImageKit private key.
- Separate Tool Access Token stays in page memory (not localStorage).
- Server validates token, origin, method, action, path and pagination before calling ImageKit.
- ImageKit API is read-only (GET list/files); no upload, rename or delete.
- The read-only ImageKit key can still list other folders in the same account; do not share the tool token with strangers.
- Origin allowlisting and CORS are not authentication; the secret token provides access control.
- For multiple individual users, replace the shared token with proper Supabase Auth / RBAC.
- Rotate the token if leaked; revoke the restricted ImageKit key if exposed.
- Run npm run check and a browser smoke test with a disposable ImageKit folder. Automated checks do not exercise a live account.

Official documentation:
- https://imagekit.io/docs/api-keys
- https://imagekit.io/docs/api-overview
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/guides/functions/function-configuration
