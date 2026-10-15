"""Subset the bundled Font Awesome icons. Requires fonttools[woff]."""
import hashlib
import json
from pathlib import Path
import re

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'vendor/@fortawesome/fontawesome-free/7.0.0'
OUTPUT = ROOT / 'vendor/ginka-icons'


def main():
    project = [p for p in ROOT.rglob('*') if p.is_file() and p.suffix in ('.html', '.js', '.css')
               and not {'vendor', '.git', '.playwright-mcp', 'node_modules', '.artifacts'}.intersection(p.relative_to(ROOT).parts)
               and p != ROOT / 'css/ginka-icons.css']
    text = '\n'.join(p.read_text(encoding='utf-8') for p in project)
    used = set(re.findall(r'\bfa-[a-z][a-z0-9-]*', text))
    unicodes = {int(value, 16) for value in re.findall(r'\\([ef][0-9a-f]{3})\b', text, re.I)}
    stylesheet = (SOURCE / 'css/all.min.css').read_text(encoding='utf-8')

    def keep_icon(match):
        selectors, value = match.groups()
        if not used.intersection(re.findall(r'\.([\w-]+)', selectors)):
            return ''
        unicodes.add(int(value[1:], 16) if value.startswith('\\') else ord(value))
        return match[0]

    stylesheet = re.sub(r'([^{}]+)\{--fa:"(\\[a-f0-9]+|[^"\\])"\}', keep_icon, stylesheet)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    font_sizes = {}
    for source in (SOURCE / 'webfonts').glob('*.woff2'):
        font = TTFont(source, recalcTimestamp=False)
        options = subset.Options()
        options.flavor = 'woff2'
        options.recalc_timestamp = False
        options.name_IDs = ['*']
        options.name_legacy = True
        options.name_languages = ['*']
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        target = OUTPUT / source.name.replace('.woff2', '-subset.woff2')
        font.save(target)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()[:10]
        font_sizes[source.name] = {'before': source.stat().st_size, 'after': target.stat().st_size, 'sha256': digest}
        stylesheet = stylesheet.replace('../webfonts/' + source.name, '/vendor/ginka-icons/' + target.name + '?v=' + digest)
    (ROOT / 'css/ginka-icons.css').write_bytes(stylesheet.encode('utf-8'))
    manifest = {
        'source': 'Font Awesome Free 7.0.0',
        'license': 'https://fontawesome.com/license/free',
        'scan': 'project HTML, CSS and JavaScript; excludes vendor and browser output',
        'classes': sorted(used), 'unicodes': sorted(unicodes), 'fonts': font_sizes,
        'cssSha256': hashlib.sha256(stylesheet.encode()).hexdigest(),
    }
    (OUTPUT / 'manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
    print('Icon CSS:', len(stylesheet.encode()), 'bytes; fonts:', font_sizes)


if __name__ == '__main__':
    main()
