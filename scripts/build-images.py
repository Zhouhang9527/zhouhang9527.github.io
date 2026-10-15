"""Optional Pillow build step. Committed responsive assets need no runtime encoder."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source_dir = ROOT / 'images/ginka'
target_dir = source_dir / 'responsive'
target_dir.mkdir(exist_ok=True)
manifest = {}
for source in sorted(source_dir.iterdir()):
    if source.suffix.lower() not in {'.webp', '.jpg'}:
        continue
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        variants = []
        for width in [320, 640, 960, 1440]:
            if width >= image.width:
                continue
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            target = target_dir / f'{source.stem}-{width}.webp'
            resized.save(target, 'WEBP', quality=82, method=6)
            variants.append({'width': width, 'src': '/' + target.relative_to(ROOT).as_posix(),
                             'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        variants.append({'width': image.width, 'src': '/' + source.relative_to(ROOT).as_posix(),
                         'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
        manifest['/' + source.relative_to(ROOT).as_posix()] = variants
(target_dir / 'manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode())
print(f'Prepared responsive variants for {len(manifest)} illustrations.')
