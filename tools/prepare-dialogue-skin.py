"""Find original UI assets locally and install a selected frame for private preview."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "source/images/ginka/scenes/local-preview"

def scan(args):
    candidates = []
    for group in ("data", "fgimage", "steam"):
        folder = args.assets / group
        if not folder.is_dir():
            continue
        for path in sorted(folder.rglob("*")):
            if path.suffix.lower() not in {".png", ".webp", ".tga", ".bmp"}:
                continue
            try:
                with Image.open(path) as im:
                    w, h = im.size
                    if w < 48 or h < 16:
                        continue
                    rgba = im.convert("RGBA")
                    lo, hi = rgba.getchannel("A").getextrema()
                    alpha = lo < 255 and hi > 0
                    # Include wide strips and UI atlases; do not treat these as
                    # confirmed dialogue frames until the contact sheet is reviewed.
                    wide = w / h >= 2.2
                    small = max(w, h) <= 768
                    if not (alpha or wide or small):
                        continue
                    score = 4 * alpha + 3 * wide + 2 * (h <= 400) + small
                    candidates.append((score, path, w, h, alpha))
            except (OSError, ValueError):
                continue
    candidates.sort(key=lambda x: (-x[0], str(x[1])))
    args.output.mkdir(parents=True, exist_ok=True)
    index = []
    per = 48
    for start in range(0, len(candidates), per):
        chunk = candidates[start:start + per]
        sheet = Image.new("RGB", (1200, math.ceil(len(chunk) / 4) * 140), "#e5ebf2")
        draw = ImageDraw.Draw(sheet)
        for i, (_, path, w, h, alpha) in enumerate(chunk):
            n = start + i + 1
            x, y = (i % 4) * 300, (i // 4) * 140
            with Image.open(path) as im:
                tile = ImageOps.contain(im.convert("RGBA"), (288, 105))
            # Show transparency against a checkerboard, not a misleading black background.
            for yy in range(0, 104, 12):
                for xx in range(0, 288, 12):
                    draw.rectangle((x+6+xx,y+4+yy,x+6+xx+11,y+4+yy+11), fill="#aebdca" if (xx//12+yy//12)%2 else "#ffffff")
            sheet.paste(tile, (x+6+(288-tile.width)//2, y+4+(104-tile.height)//2), tile)
            draw.text((x+6,y+113), f"UI-{n:04d}   {w}x{h}   alpha={alpha}", fill="#192431")
            index.append({"id": f"UI-{n:04d}", "path": str(path.resolve()), "width": w, "height": h, "alpha": alpha})
        sheet.save(args.output / f"ui-{start//per+1:02d}.jpg", quality=88)
    (args.output / "inventory.json").write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(index)} candidates; contact sheets and inventory: {args.output}")
    if not index:
        print("No raster candidates. Inspect local PSB/TLG extraction output before choosing a frame.")

def install(args):
    rows = json.loads(args.inventory.read_text(encoding="utf-8"))
    row = next((x for x in rows if x["id"] == args.id), None)
    if row is None:
        raise SystemExit("Unknown candidate ID")
    with Image.open(row["path"]) as im:
        im = im.convert("RGBA")
        if args.crop:
            x, y, w, h = args.crop
            if min(x,y) < 0 or min(w,h) <= 0 or x+w > im.width or y+h > im.height:
                raise SystemExit("Invalid crop rectangle")
            im = im.crop((x,y,x+w,y+h))
        t,r,b,l = args.slice
        if min(t,r,b,l) <= 0 or max(t,r,b,l) > 2048 or t+b >= im.height or l+r >= im.width:
            raise SystemExit("Slice must preserve a nonempty center")
        OUT.mkdir(parents=True, exist_ok=True)
        im.save(OUT / "dialogue-frame.webp", "WEBP", lossless=True, method=6)
    (OUT / "dialogue-skin.json").write_text(json.dumps({"slice": args.slice}, indent=2), encoding="utf-8")
    print("Original frame installed for local preview only:", row["path"])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    a = sub.add_parser("scan")
    a.add_argument("--assets", type=Path, required=True)
    a.add_argument("--output", type=Path, required=True)
    b = sub.add_parser("install")
    b.add_argument("--inventory", type=Path, required=True)
    b.add_argument("--id", required=True)
    b.add_argument("--crop", nargs=4, type=int, metavar=("X","Y","W","H"))
    b.add_argument("--slice", nargs=4, type=int, required=True, metavar=("TOP","RIGHT","BOTTOM","LEFT"))
    args = parser.parse_args()
    (scan if args.command == "scan" else install)(args)

if __name__ == "__main__":
    main()
