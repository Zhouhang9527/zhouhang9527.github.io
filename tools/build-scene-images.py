import os
from PIL import Image

ROOT = r"E:\30500\Downloads\GINKA-study\assets"
EVENT = os.path.join(ROOT, "cr_event", "_hxv4_hash", "94D4A97C61498621")
BG2 = os.path.join(ROOT, "bgimage2", "_hxv4_hash", "94D4A97C61498621")
OUT = r"D:\GINKA-Blog\source\images\ginka\scenes"

# slug: (day file, night file, archive dir)
SETS = {
    "hero-katana": ("00000041_F37D7BAC040B4EF477FD99004837D59546A5730A5C06F0FA7675B992C38DAEEC.png",
                    "00000043_8BB01977465D32767F5D57EB071F448D769CF4214AFD4A29B1B19E33D045F3F1.png", EVENT),
    "shop-street": ("00000006_075A1474792FB567C763D5F7F23EC6E965389B8F08F47C6981097BC50E0337AD.png",
                    "00000007_66101581FD93AEBE7A640B73BDCB9C30EABECB09360AACD2211D4AA346E3A7D6.png", BG2),
    "torii-close": ("00000036_29AAD6EC84EB3CA718C0D5B528504D520813C803A73299D0BC1A8D9AF13ADBA2.png",
                    "00000037_6A5911E08A2E799C76C44FD399F583B5D53C4B2E3A75571218D6F0FAB52265B7.png", BG2),
    "torii-sea": ("00000042_EE830FBDBB555B2A95CB7E1330497736B57F2ADCA85B572B49968F307AE98A2F.png",
                  "00000045_DB82340667B2FB0B1A478F4CC2F0752C88C7741B5150C2CFB442A29B74C78B6C.png", BG2),
    "window-room": ("00000023_3AC6839B16185178173B32EDE121F0FE08A33F186B58AFB74639356E0EA59721.png",
                    "00000024_5FEEC37464B150409B2706747B556A698478AC9B87628F045433F62576BB64A6.png", BG2),
    "island-street": ("0000003e_6F001594093780572306B4FC2115060F90336BD096B96F91478CF0421DA7382B.png",
                      "0000003f_6857669EDBD6DF21F3A357C8F10BEB5D4A0D34AA5898EADFF7F6BC708D078AB7.png", BG2),
    "classroom": ("0000001c_792A0E79D2DE83B5F566DC0E45CD5D8442E3FC5A44F61C02926F0914F6BDA5B1.png",
                  "0000001a_FEFCD5747C8E22D5BBDAF52CFD91BB50B34D4B36EC302B3DA6436FA980AC1DC1.png", BG2),
    "house": ("0000002f_FFC561035F5B5B1F266D8A6BCE4D50E5080BE4DC7BB6A6BDFCA88FD768683370.png",
              "00000032_F79ACC5DB77A31D72B5449EA077BCA0C576A558B8D68DD516B9DC351EE9D501E.png", BG2),
    "beach": ("0000002b_DD14E88A5B602C1CC49F8CD2947C4E477E384F54D173168B01E77BC849F90F57.png",
              "0000002d_954FD2DB1E02966279BF8127A221D8E5740A64D5D6E334E6B97150AC262CE706.png", BG2),
    "courtyard": ("0000000d_FA12482D0F787CB5956FFAF61D51403F5A236E14DEDBC265AB9E9AEE4D92B3B0.png",
                  "0000000e_CD88A08A5CCAE9D4D82429E3229C8F2E867A4B3D65AF7F7652272E5548A29D44.png", BG2),
    "panorama": ("00000058_F3EFF5EE10E7894BD50E3D21E206027CD445C62B5CBFF449CD6C089983B1026A.png",
                 "00000059_09596BC8C42B615195101FD6275B2C823A4DFD887976A27C7CC62190E92DC17F.png", BG2),
    "night-sky": ("00000042_EE830FBDBB555B2A95CB7E1330497736B57F2ADCA85B572B49968F307AE98A2F.png",
                  "0000004f_2DA04BEF70A198F58B833EEE178E9333FDFF1AE8F607042779E83FF7BB950CA4.png", BG2),
}

WIDTHS = (320, 640, 960, 1280, 1440)
os.makedirs(OUT, exist_ok=True)

# 先清掉上一轮基于 bgimage(1680) 的旧文件，避免同日/夜图混分辨率
for name in os.listdir(OUT):
    if name.endswith(".webp"):
        os.remove(os.path.join(OUT, name))

rows = []
for slug, (day, night, base) in SETS.items():
    for variant, name in (("day", day), ("night", night)):
        path = os.path.join(base, name)
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        with Image.open(path) as im:
            im = im.convert("RGB")
            sw, sh = im.size
            made = []
            for width in WIDTHS:
                if width > sw:
                    continue
                height = round(sh * width / sw)
                target = os.path.join(OUT, f"{slug}-{variant}-{width}.webp")
                im.resize((width, height), Image.LANCZOS).save(target, "WEBP", quality=83, method=6)
                made.append((width, os.path.getsize(target)))
            rows.append((slug, variant, sw, sh, made))

for slug, variant, sw, sh, made in rows:
    print(f"{slug:15} {variant:6} {sw}x{sh}  " + ", ".join(f"{w}:{s // 1024}KB" for w, s in made))
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f"\nfiles={len(os.listdir(OUT))} total={total / 1048576:.1f}MB")
