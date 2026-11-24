"""Opt-in local GINKA scene previews; do not commit or distribute generated art."""
import argparse
from pathlib import Path
from PIL import Image

SETS = {
    "window-room": [
        "_hxv4_hash/94D4A97C61498621/00000023_3AC6839B16185178173B32EDE121F0FE08A33F186B58AFB74639356E0EA59721.png",
        "_hxv4_hash/94D4A97C61498621/00000024_5FEEC37464B150409B2706747B556A698478AC9B87628F045433F62576BB64A6.png"
    ],
    "classroom": [
        "_hxv4_hash/94D4A97C61498621/0000001c_792A0E79D2DE83B5F566DC0E45CD5D8442E3FC5A44F61C02926F0914F6BDA5B1.png",
        "_hxv4_hash/94D4A97C61498621/0000001a_FEFCD5747C8E22D5BBDAF52CFD91BB50B34D4B36EC302B3DA6436FA980AC1DC1.png"
    ],
    "corridor": [
        "_hxv4_hash/94D4A97C61498621/00000018_F3B756CE1D5D99B6DEBC4270E729E4BB20CE952FB1B1DB81CC99E48EB8D2573C.png",
        "_hxv4_hash/94D4A97C61498621/00000019_67CA654BD4C4CB5EE25AA02CA308627722AC40F458C75AB8652A6AEDECEC5905.png"
    ],
    "island-street": [
        "_hxv4_hash/94D4A97C61498621/0000003e_6F001594093780572306B4FC2115060F90336BD096B96F91478CF0421DA7382B.png",
        "_hxv4_hash/94D4A97C61498621/0000003f_6857669EDBD6DF21F3A357C8F10BEB5D4A0D34AA5898EADFF7F6BC708D078AB7.png"
    ],
    "house": [
        "_hxv4_hash/94D4A97C61498621/0000002f_FFC561035F5B5B1F266D8A6BCE4D50E5080BE4DC7BB6A6BDFCA88FD768683370.png",
        "_hxv4_hash/94D4A97C61498621/00000032_F79ACC5DB77A31D72B5449EA077BCA0C576A558B8D68DD516B9DC351EE9D501E.png"
    ],
    "courtyard": [
        "_hxv4_hash/94D4A97C61498621/0000000d_FA12482D0F787CB5956FFAF61D51403F5A236E14DEDBC265AB9E9AEE4D92B3B0.png",
        "_hxv4_hash/94D4A97C61498621/0000000e_CD88A08A5CCAE9D4D82429E3229C8F2E867A4B3D65AF7F7652272E5548A29D44.png"
    ],
    "torii-sea": [
        "_hxv4_hash/94D4A97C61498621/00000042_EE830FBDBB555B2A95CB7E1330497736B57F2ADCA85B572B49968F307AE98A2F.png",
        "_hxv4_hash/94D4A97C61498621/00000045_DB82340667B2FB0B1A478F4CC2F0752C88C7741B5150C2CFB442A29B74C78B6C.png"
    ]
}
WIDTHS = (640, 960, 1280)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", required=True, type=Path, help="Local GINKA-study/assets directory")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    out = root / "source/images/ginka/scenes/local-preview"
    sources = [(slug, mode, args.assets / "bgimage2" / name)
               for slug, names in SETS.items()
               for mode, name in zip(("day", "night"), names)]
    missing = [str(src) for _, _, src in sources if not src.is_file()]
    if missing:
        parser.error("Missing exact source files:\n" + "\n".join(missing))
    out.mkdir(parents=True, exist_ok=True)
    for slug, mode, src in sources:
        with Image.open(src) as image:
            image = image.convert("RGB")
            for width in WIDTHS:
                height = round(image.height * width / image.width)
                target = out / f"{slug}-{mode}-{width}.webp"
                image.resize((width, height), Image.Resampling.LANCZOS).save(target, "WEBP", quality=82, method=6)
                print(target.name)
    print("Local preview only. Set GINKA_LOCAL_SCENES=1 and run hexo server. Do not commit these files.")

if __name__ == "__main__":
    main()
