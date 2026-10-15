"""Refresh published blog URLs after Pages finishes; credentials stay in env."""
import json
import os
from pathlib import Path
from urllib.parse import quote
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://www.mm9527.top'


def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    zone = os.environ.get('CLOUDFLARE_ZONE_ID')
    if not token or not zone:
        raise SystemExit('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be configured locally.')
    base = 'https://api.cloudflare.com/client/v4/zones/' + zone
    headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
    with urllib.request.urlopen(urllib.request.Request(base, headers=headers), timeout=30) as response:
        metadata = json.load(response)
    if not metadata.get('success') or metadata['result']['name'] != 'mm9527.top':
        raise SystemExit('The configured zone does not match this blog.')
    paths = {'/', '/index.html', '/404.html', '/search.xml', '/article-index.json', '/site-version.json', '/sw.js', '/manifest.webmanifest', '/robots.txt'}
    for page in json.loads((ROOT / 'site-source/pages.json').read_text('utf-8')):
        path = '/' + quote(page['output'], safe='/')
        paths.update([path, path.removesuffix('index.html')])
    urls = [HOST + path for path in sorted(paths)]
    for start in range(0, len(urls), 30):
        body = json.dumps({'files': urls[start:start + 30]}).encode()
        request = urllib.request.Request(base + '/purge_cache', data=body, headers=headers, method='POST')
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
        if not result.get('success'):
            raise SystemExit('The cache refresh was rejected by Cloudflare.')
    print(f'Cloudflare accepted refresh requests for {len(urls)} blog URLs.')


if __name__ == '__main__':
    main()
