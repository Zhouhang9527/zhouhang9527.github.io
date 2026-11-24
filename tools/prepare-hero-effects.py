"""Convert the three verified GINKA effect masks into local-only transparent sprites."""
import argparse
from pathlib import Path
from PIL import Image

SETS = {
    "hero-streak": ("_hxv4_hash/72A487EDE974DA88/00000287_87D7207B807EDDEA1070018FCA7085C986EA55C6B6902C10CE014FFDA23D36A3.png", 192),
    "hero-glint": ("_hxv4_hash/72A487EDE974DA88/00000296_A9649F18AF44E95695A09266623BF7A64D22302F05FEB1737EB906378B894744.png", 256),
    "hero-bokeh": ("_hxv4_hash/DC053D3771F57E78/000002d3_771CFC09E6D14D396D9296C77C51D1F8ECB8E0CEE57049CC0FF7507281D493D9.png", 640),
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path, required=True)
    args = parser.parse_args()
    out = Path(__file__).resolve().parents[1] / "source/images/ginka/scenes/local-preview"
    missing = [name for name, _ in SETS.values() if not (args.assets / "data" / name).is_file()]
    if missing:
        parser.error("Missing exact assets:\n" + "\n".join(missing))
    out.mkdir(parents=True, exist_ok=True)
    for slug, (name, width) in SETS.items():
        with Image.open(args.assets / "data" / name) as im:
            mask = im.convert("L")
            mask = mask.resize((width, round(mask.height * width / mask.width)), Image.Resampling.LANCZOS)
            sprite = Image.new("RGBA", mask.size, (230, 244, 255, 0))
            sprite.putalpha(mask)
            target = out / (slug + ".webp")
            sprite.save(target, "WEBP", lossless=True, method=6)
            print(target.name, target.stat().st_size)

if __name__ == "__main__":
    main()
