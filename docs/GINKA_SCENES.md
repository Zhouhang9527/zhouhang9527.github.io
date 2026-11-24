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

## Original dialogue frame

The remote contact sheets only cover wide previews, not the small/transparent UI assets. Scan the full local extraction:

```powershell
python tools/prepare-dialogue-skin.py scan --assets "E:/30500/Downloads/GINKA-study/assets" --output "../ginka-ui-review"
```

Review the generated JPG contact sheets and inventory to identify the actual message window (or crop it from a UI atlas). The install command accepts its confirmed UI ID and four nine-slice distances: `python tools/prepare-dialogue-skin.py install --inventory PATH --id UI-ID --slice TOP RIGHT BOTTOM LEFT`. Optional `--crop X Y W H` extracts a selected rectangle. Do not guess the ID or slice values. The original frame appears in local preview only, with the Giscus editor and comments on the readable theme background. Production keeps the CSS frame unless an independently authorized asset integration is provided.
