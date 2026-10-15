"""Dependency-free static build from a shared layout and lossless page fragments."""
import argparse
from collections import Counter
import hashlib
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit
import xml.etree.ElementTree as ET
from html_ranges import HTMLRanges, replace_ranges

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'site-source'


class PlainText(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.feed(source)

    def handle_data(self, text):
        self.parts.append(text)


def text(source):
    return re.sub(r'\s+', ' ', ' '.join(PlainText(source).parts)).strip()


def render(template, values):
    return re.sub(r'{{ ([a-z_]+) }}', lambda match: values[match[1]], template)


def article_data(page):
    metadata, main = page['metadata'], page['main']
    match = re.search(r'data-name="page"[^>]*>(.*?)</script>', metadata, re.S)
    config = json.loads(match[1])
    if not config['isPost']:
        return None
    tree = HTMLRanges(main)
    body = tree.find(itemprop='articleBody')
    tags_node = next((node for node in tree.nodes if node.attrs.get('class') == 'post-tags'), None)
    tags = re.findall(r'<a\b[^>]*>(.*?)</a>', main[tags_node.open_end:tags_node.close_start], re.S) if tags_node else []
    description = re.search(r'<meta name="description" content="([^"]*)"', metadata)
    published = re.search(r'<meta property="article:published_time" content="([^"]*)"', metadata)
    return {'title': config['title'], 'url': urlsplit(config['permalink']).path,
            'description': text(description[1]) if description else text(main[body.open_end:body.close_start])[:150],
            'date': published[1][:10] if published else '',
            'tags': [text(tag).lstrip('# ').strip() for tag in tags],
            'content': text(main[body.open_end:body.close_start])}


def related_html(current, articles):
    frequencies = Counter(tag.lower() for article in articles for tag in article['tags'])
    current_tags = {tag.lower() for tag in current['tags']}
    def score(article):
        shared = current_tags & {tag.lower() for tag in article['tags']}
        return (sum(1 / frequencies[tag] for tag in shared), article['date'], article['url'])
    candidates = sorted((article for article in articles if article['url'] != current['url']), key=score, reverse=True)[:3]
    cards = []
    for article in candidates:
        common = [tag for tag in article['tags'] if tag.lower() in current_tags]
        reason = ' · '.join(common[:3]) if common else '继续探索'
        cards.append(f'<a class="journal-related-card" href="{escape(article["url"], quote=True)}">'
                     f'<span>{escape(reason)}</span><h3>{escape(article["title"])}</h3>'
                     f'<p>{escape(article["description"][:130])}</p><time datetime="{article["date"]}">{article["date"]}</time></a>')
    return '<section class="journal-related" aria-label="相关题解"><h2>继续阅读</h2><div>' + ''.join(cards) + '</div></section>'


def responsive_images(source, manifest):
    replacements = []
    for node in HTMLRanges(source).nodes:
        if node.tag != 'img':
            continue
        original = node.attrs.get('src') or node.attrs.get('data-sidebar-src')
        if original not in manifest:
            continue
        variants = manifest[original]
        srcset = ', '.join(f'{variant["src"]} {variant["width"]}w' for variant in variants)
        if 'journal-hero-art' in node.attrs.get('class', ''):
            sizes = '(max-width: 767px) calc(100vw - 24px), (max-width: 1184px) calc(100vw - 64px), 1120px'
        elif original.endswith('profile.webp'):
            sizes = '300px'
        else:
            sizes = '(max-width: 767px) calc(100vw - 24px), 700px'
        prefix = 'data-sidebar-' if 'data-sidebar-src' in node.attrs else ''
        tag = source[node.start:node.open_end]
        tag = tag[:-1] + f' {prefix}srcset="{srcset}" {prefix}sizes="{sizes}">'
        replacements.append((node.start, node.open_end, tag))
    return replace_ranges(source, replacements)


def version_assets(source):
    def replace(match):
        asset = match[1]
        path = ROOT / asset.lstrip('/')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:10]
        return '"' + asset + '?v=' + digest + '"'
    return re.sub(r'"(/(?:css/[^"?]+\.css|js/(?:ginka-[^"?]+|bookmark|third-party/(?:fancybox|search/local-search))\.js))(?:\?v=[a-z0-9]+)?"', replace, source)


def build(check=False):
    layout = (SOURCE / 'templates/layout.html').read_text('utf-8')
    sidebar = (SOURCE / 'templates/sidebar.html').read_text('utf-8')
    manifest = json.loads((ROOT / 'images/ginka/responsive/manifest.json').read_text('utf-8'))
    pages = []
    for item in json.loads((SOURCE / 'pages.json').read_text('utf-8')):
        page = json.loads((SOURCE / item['source']).read_text('utf-8'))
        if 'main_file' in page:
            page['main'] = (SOURCE / page['main_file']).read_text('utf-8')
        pages.append((item, page))
    articles = [article for _, page in pages if (article := article_data(page))]
    generated = {}
    for item, page in pages:
        values = dict(page)
        current = article_data(page)
        if current:
            tree = HTMLRanges(values['main'])
            footer = next(node for node in tree.nodes if node.attrs.get('class') == 'post-footer')
            values['main'] = replace_ranges(values['main'], [(footer.start, footer.start, related_html(current, articles))])
        values['sidebar'] = render(sidebar, values)
        result = render(layout, values)
        result = responsive_images(result, manifest)
        if 'rel="canonical"' not in result:
            canonical = 'https://www.mm9527.top/' + quote(item['output'].removesuffix('index.html'), safe='/')
            result = result.replace('</head>', f'<link rel="canonical" href="{canonical}"></head>')
        if item['output'] == 'index.html':
            hero = next(node for node in HTMLRanges(result).nodes if node.attrs.get('class') == 'journal-hero-art')
            preload = '<link rel="preload" as="image" href="/images/ginka/hero-silver.webp" fetchpriority="high" imagesrcset="' + hero.attrs['srcset'] + '" imagesizes="' + hero.attrs['sizes'] + '">'
            result = result.replace('</head>', preload + '</head>')
        generated[item['output']] = version_assets(result).encode()
    index = [{key: value for key, value in article.items() if key != 'content'} for article in articles]
    generated['article-index.json'] = (json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    search = ET.Element('search', {'format': 'text'})
    for article in articles:
        entry = ET.SubElement(search, 'entry')
        for key in ['title', 'url', 'content', 'date']:
            ET.SubElement(entry, key).text = article[key]
        ET.SubElement(entry, 'tags').text = ' / '.join(article['tags'])
    generated['search.xml'] = ET.tostring(search, encoding='utf-8', xml_declaration=True)
    release = hashlib.sha256(b''.join(key.encode() + generated[key] for key in sorted(generated))).hexdigest()[:16]
    generated['site-version.json'] = (json.dumps({'version': release, 'pages': len(pages), 'articles': len(articles)}) + '\n').encode()
    stale = []
    for filename, payload in generated.items():
        target = ROOT / filename
        if not target.exists() or target.read_bytes() != payload:
            stale.append(filename)
            if not check:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
    print(f'{len(pages)} pages, {len(articles)} articles; {len(stale)} ' + ('out of date.' if check else 'outputs updated.'))
    if check and stale:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
