# Scene palette and local preview

The day palette uses cool cloud white and sea blue; the moonlit palette uses muted navy/slate and light silver rather than saturated blue cards. Main article content stays free of scene backgrounds.

Route art is centralized in scripts/ginka-scene-map.json. The checked-in scene pairs are used by default; the exact original image paths selected from the private visual index are embedded in tools/prepare-local-scenes.py. Local extras remain ignored and are excluded from generated production routes.

Local preview (PowerShell):

```powershell
python -m pip install Pillow
python tools/prepare-local-scenes.py --assets "E:/30500/Downloads/GINKA-study/assets"
$env:GINKA_LOCAL_SCENES = "1"
npx hexo server -p 4004
```

The original game artwork is for private local study only unless the rights holder authorizes redistribution. Do not publish the local-preview directory, and do not deploy from a running preview. The generator only writes that directory; it does not delete existing assets.

Check all route covers in day and moonlit modes, including PJAX navigation and the persistent drawer. Verify the opposite theme cover is not fetched by the browser until switching themes; the masthead uses one selected CSS background, not two img requests.
