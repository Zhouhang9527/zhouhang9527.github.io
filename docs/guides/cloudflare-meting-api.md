# Self-hosted Meting API

The blog uses a minimal Meting-compatible API hosted on the Aliyun server and
published through a Cloudflare named Tunnel. No account cookie, API token, or
tunnel credential is shipped to the browser or stored in this repository.

## Production endpoint

```text
https://meting.mm9527.top/api
```

Playlist request:

```text
https://meting.mm9527.top/api?server=netease&type=playlist&id=5190514967
```

The public API only exposes the Meting-compatible `/api` route and a health
response at `/`. The upstream source is the mikus fork of MetingAPI, pinned at
commit `4d4995abfe53b577ba64501dae7acc8be3ff2f09` when deployed.

## Server layout

The deployment lives in `/home/deploy/ginka-meting` and runs these containers:

- `ginka-meting`: Node 22 service, bound only to `127.0.0.1:3030` on the host.
- `ginka-meting-tunnel`: Cloudflare named Tunnel for `meting.mm9527.top`.

Both services use `restart: unless-stopped`. Tunnel credentials are kept under
`/home/deploy/.cloudflared` on the server and mounted read-only into the tunnel
container. They must never be copied into the blog configuration.

The public Node entrypoint is mirrored at
`tools/deploy/meting-node-public.js`. It keeps a bounded in-memory response
cache and emits matching browser/CDN cache headers:

- `playlist`: 5 minutes, with 1 minute stale-while-revalidate.
- `lrc` and `pic`: 1 day, with 1 hour stale-while-revalidate.
- `url`, forced refreshes and errors: `no-store`.

The refresh button adds `_refresh` to bypass both browser and service caches.
Never add `url` responses to an edge cache because their signed redirects
expire.

An optional NetEase login cookie is read from
`/home/deploy/.secrets/netease-cookie`. The file is mode `600`, is mounted
read-only, and is never returned by the API. Without it, NetEase may return
short preview files even for otherwise playable songs.

Run `update-netease-cookie.bat` from the repository root to update `MUSIC_U`
without echoing it or placing it in a command argument. The script writes over
SSH standard input and verifies the resulting media length automatically.

To inspect the deployment:

```bash
cd /home/deploy/ginka-meting
docker compose -f compose.production.yml ps
docker logs --tail 50 ginka-meting
docker logs --tail 50 ginka-meting-tunnel
```

## Blog configuration

The only browser-visible endpoint configuration is in `_config.yml`:

```yaml
ginka_music:
  online:
    api_base: https://meting.mm9527.top/api
    platform: netease
    type: playlist
    playlist_id: '5190514967'
    timeout_ms: 8000
    cache_ttl_ms: 1800000
```

Local tracks in the same configuration remain the always-available fallback.

## Verification

The production endpoint was verified for:

- HTTPS and `Access-Control-Allow-Origin: *` on playlist and lyric responses.
- A 96-track playlist response for playlist `5190514967`.
- Real media playback resolution rather than only an HTTP-successful JSON call.
- Twelve sampled tracks returning `206 Partial Content`, a valid
  `Content-Range`, and media CORS from the final NetEase CDN response.
- Cover image HTTPS, CORS, and byte-range support.

Run the repository checks after changing the endpoint:

```bash
npm run check:music-sources
npm run build:release
```

## Limits

NetEase can change or revoke individual media URLs, and account or regional
restrictions may make some tracks unavailable. The frontend therefore resolves
URLs on demand, retries one failed online track once, skips bounded failures,
and switches to the local playlist after repeated online failures. Playlist
metadata is cached for 30 minutes; resolved media URLs are not treated as
permanent assets.
