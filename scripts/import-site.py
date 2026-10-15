"""One-time migration from published Hexo HTML to lossless source fragments."""
import difflib
import json
from pathlib import Path
import re
from html_ranges import HTMLRanges, replace_ranges

ROOT = Path(__file__).resolve().parents[1]


def main():
    source_root = ROOT / 'site-source'
    if (source_root / 'pages.json').exists():
        raise SystemExit('Source fragments already exist. Edit site-source and run build-site.py; do not import generated pages again.')
    (source_root / 'templates').mkdir(parents=True, exist_ok=True)
    pages, shell = [], None
    for page in sorted(ROOT.rglob('index.html')):
        if set(page.relative_to(ROOT).parts) & {'node_modules', 'vendor', '.git', '.playwright-mcp', '.artifacts', 'site-source'}:
            continue
        source = page.read_text('utf-8')
        if '<main class="main">' not in source:
            continue
        source = re.sub(r'<(h1|p)( class="site-title"[^>]*)>(.*?)</\1>', r'<span\2>\3</span>', source)
        source = re.sub(r'<link rel="preload"[^>]*as="image"[^>]*>', '', source)
        extra_meta = []
        title_end = source.index('</title>')
        def move_meta(match):
            if match.start() <= title_end:
                return match.group()
            extra_meta.append(match.group())
            return ''
        source = re.sub(r'<meta (?:property="og:image"|name="twitter:image")[^>]*>', move_meta, source)
        tree = HTMLRanges(source)
        main = tree.find(id='main-content')
        sidebar = tree.find('aside')
        metadata_start = source.index('<meta name="description"')
        metadata_end = source.index('</title>') + len('</title>')
        values = {'metadata': source[metadata_start:metadata_end] + ''.join(extra_meta), 'main': source[main.start:main.end], 'sidebar': source[sidebar.start:sidebar.end]}
        candidate = replace_ranges(source, [(metadata_start, metadata_end, '{{ metadata }}'),
                                          (main.start, main.end, '{{ main }}'), (sidebar.start, sidebar.end, '{{ sidebar }}')])
        if shell is None:
            shell = candidate
        if candidate != shell:
            differences = [(op, candidate[b1:b2][:120]) for op, _, _, b1, b2 in difflib.SequenceMatcher(None, shell, candidate, autojunk=False).get_opcodes() if op != 'equal']
            raise ValueError(f'Unrecognized layout variation in {page}: {differences}')
        relative = page.relative_to(ROOT).as_posix()
        record = 'pages/' + relative.replace('/index.html', '').replace('index.html', 'home') + '.json'
        target = source_root / record
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((json.dumps(values, ensure_ascii=False, indent=2) + '\n').encode())
        pages.append({'output': relative, 'source': record})
    (source_root / 'templates/layout.html').write_bytes(shell.encode())
    (source_root / 'pages.json').write_bytes((json.dumps(pages, ensure_ascii=False, indent=2) + '\n').encode())
    print(f'Imported {len(pages)} pages into a common layout.')


if __name__ == '__main__':
    main()
