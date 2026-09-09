# Cloudflare Deployment Cache Purge Design

## Goal

Automatically purge the Cloudflare cache for the public blog hostnames after a
successful GitHub Pages deployment, without purging the independent Meting API
cache and without turning a cache-purge failure into a deployment failure.

## Scope

- Add one Node.js command-line helper dedicated to Cloudflare cache purging.
- Invoke the helper after successful production deployments from both
  `npm run deploy` and the production options in `deploy.bat`.
- Purge only `mm9527.top` and `www.mm9527.top` by hostname.
- Document the required local environment variables and least-privilege API
  token setup.
- Add offline regression coverage for success and warning-only failure paths.

Resource localization is intentionally a separate follow-up design because it
changes published frontend dependencies rather than deployment orchestration.

## Architecture

Create `tools/deploy/purge-cloudflare-cache.js` as the single owner of the
Cloudflare API interaction. The script reads `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ZONE_ID`, sends a `POST` request to
`/client/v4/zones/{zone_id}/purge_cache`, and submits the hostname payload:

```json
{
  "hosts": ["mm9527.top", "www.mm9527.top"]
}
```

The script exposes its core operation for dependency-injected tests and runs it
through a small CLI wrapper when executed directly. Node.js 20's built-in
`fetch` is sufficient, so no dependency is added.

`package.json` adds a reusable `cache:purge` command. The existing `deploy`
command invokes it only after the build and `hexo deploy` complete successfully.
The two production branches in `deploy.bat` call the same npm command instead
of duplicating API logic. Local preview and build-only commands never purge
production caches.

## Credentials and Security

- The API token and zone ID are supplied only through environment variables.
- No secret, token, account email, or API response authorization header is
  written to tracked files or logs.
- The token should have only the zone-scoped `Cache Purge` permission for
  `mm9527.top`.
- The implementation does not use the legacy Global API Key.

## Error Handling

Missing variables, request failures, non-success HTTP responses, malformed API
responses, and Cloudflare responses with `success: false` all produce a concise
warning. The CLI still exits with status code `0`, preserving the completed
GitHub Pages deployment as requested.

A successful purge prints the affected hostnames. Logged errors must not include
the token or complete request headers.

## Testing

Add an offline Node regression check that injects a fake `fetch` implementation
and verifies:

1. A valid configuration sends one authenticated `POST` to the correct zone
   endpoint with the two-hostname payload.
2. Missing credentials skip the request and return a warning-only result.
3. Network and Cloudflare API failures return a warning-only result.
4. The token never appears in captured output.

The regression check is exposed as an npm check command and included in the
project's normal `npm run check` sequence.

## Documentation

Update the production deployment documentation with environment-variable names,
the least-privilege token requirement, expected success/warning messages, and a
note that Meting caches are deliberately preserved.

## Success Criteria

- Every successful production deployment attempts one hostname-scoped purge.
- Local preview/build flows do not call Cloudflare.
- Purge failures never change a successful deployment into a failed deployment.
- Meting cache entries are not included in the purge request.
- No Cloudflare credential is committed or printed.
- All existing checks and the new regression check pass.
