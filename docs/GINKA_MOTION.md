# Art direction: a single quiet sword glint

This change deliberately removes continuous sweeping lights, particle dots, mouse parallax, magnetic button motion and ripple effects on the home hero. The original CG supplies the composition. The only decorative entrance is a short optical glint aligned with the blade, hidden under the text readability overlay. The sword glint is intentionally desktop only. Theme switching holds the last decoded responsive CG and fades it away for 400ms once the next image has decoded. Article content is not animated.

## Local original assets

Run `python tools/prepare-hero-effects.py --assets "E:/30500/Downloads/GINKA-study/assets"` with Pillow installed, then set `GINKA_LOCAL_SCENES=1` and start the Hexo local server. The exact original data-065/080/134 paths are built into the script. The masks are converted to transparent, downsized WebP files in the ignored local-preview folder. Normal builds use SVG/CSS equivalents and do not publish the extra game resources.

## Verification

- On a desktop home page, one 700ms trace and one 450ms star glint; never repeat, never cover the face or title. Verify placement at 1024, 1440 and 1920 widths.
- On mobile or reduced-motion settings: no decorative sword or bokeh motion; theme changes are immediate with reduced motion.
- Toggle theme quickly, while loading, and on a slow connection. The old image must be removed after the new one decodes. Verify there is never more than one outgoing layer, and no ongoing animation after PJAX departure.
- Scroll off the hero, open the drawer or search, or background the page. Decorative motion stops. Audio and comment behavior are unchanged.
- Build clean without the local preview flag and verify the local-preview folder is excluded. No new dependencies.
