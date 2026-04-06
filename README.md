# Cloudflare Pages Deploy Action

A GitHub Action to deploy to Cloudflare Pages with full GitHub integration — PR comments, deployment badges, emoji reactions, and timezone support.

Built as a drop-in replacement for `phojie/cloudflare-pages-action`.

## Usage

```yaml
- name: Deploy
  uses: multiplai-tech/cloudflare-pages-action@v1.0.0
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    appId: ${{ secrets.MULTIPLAI_APP_ID }}
    privateKey: ${{ secrets.MULTIPLAI_APP_PRIVATE_KEY }}
    installationId: ${{ secrets.MULTIPLAI_APP_INSTALLATION_ID }}
    projectName: main-ai-coaches-admin
    workingDirectory: apps/admin
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
    directory: dist
    branch: ${{ github.ref == 'refs/heads/main' && 'main' || format('admin-{0}', github.event.number) }}
    wranglerVersion: 3
    timezone: Asia/Manila
    reactions: |
      hooray
```

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `apiToken` | ✅ | Cloudflare API token |
| `accountId` | ✅ | Cloudflare account ID |
| `projectName` | ✅ | Cloudflare Pages project name |
| `directory` | ✅ | Built assets directory to deploy |
| `workingDirectory` | | Directory to run wrangler from (default: `.`) |
| `branch` | | Branch name on Cloudflare Pages |
| `gitHubToken` | | GitHub token for PR comments and deployment status |
| `appId` | | GitHub App ID (for custom bot identity) |
| `privateKey` | | GitHub App private key |
| `installationId` | | GitHub App installation ID |
| `wranglerVersion` | | Wrangler version (default: `3`) |
| `reactions` | | Emoji reactions, one per line (e.g. `hooray`) |
| `timezone` | | Timezone for timestamps (default: `UTC`) |

## Outputs

| Output | Description |
|--------|-------------|
| `url` | The Cloudflare Pages preview URL |

## Authentication Priority

1. If `appId` + `privateKey` + `installationId` are provided → uses GitHub App (custom bot identity)
2. If only `gitHubToken` is provided → uses GITHUB_TOKEN bot
3. If neither → skips PR comments and deployment status

## Building

```bash
npm install
npm install -g @vercel/ncc
ncc build src/index.js -o dist
```
