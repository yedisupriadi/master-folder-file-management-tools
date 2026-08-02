# Contributing

Thank you for helping improve Master Folder & File Management Tools. Small, focused pull requests are easiest to review.

## Local setup

No application dependencies or build step are required. Serve the repository through a local HTTP server:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/> in a current Chromium-based browser. Node.js 20 or newer is only needed for repository validation:

```bash
npm run check
```

## Development guidelines

- Keep each tool usable as a standalone HTML page.
- Preserve the Indonesian and English interface strings when changing user-facing text.
- Do not commit Notion tokens, app keys, `.dev.vars`, `.env` files, or customer documents.
- Treat file-system operations as high risk. Test copy, move, rename, flatten, and delete behavior on disposable sample folders.
- Add a card to the `TOOLS` array in `index.html` when adding a new tool.
- Prefer browser-native APIs and avoid adding runtime dependencies unless they clearly improve the project.

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] The changed page was smoke-tested in Chrome or Edge.
- [ ] Both language modes and light/dark themes were checked when UI text or styling changed.
- [ ] Destructive operations were tested only with disposable data.
- [ ] Documentation was updated for behavior, setup, or compatibility changes.
- [ ] No secrets or real project documents are included.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
