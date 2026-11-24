# VN skin implementation
Status: functional provisional skin; original screenshot/atlas calibration pending.
- Shared panel: GamePanel; stage.css owns typography, colours, geometry, state, timing.
- Title: full CG selection remains driven by vn-scenes.json; no character overlay.
- Load: local recent reads (100 max), bookmarks and completed paths; v1 state migrates old records in place. No fabricated slots or comments.
- Gallery: shared scene manifest; original private images not added to public build.
- Config: theme through existing controller, motion system/reduced, shared music and explicit reset.
- Navigation: native links, Astro ClientRouter, keyboard arrows/Home/End inside menu and choice lists.
- Motion: 160ms control feedback, 260ms panel arrival; reduced-motion disables both. These are estimates, not measured game timings.
- Asset calibration required: title menu sprites, atlas coordinates and state geometry; map stage CGs and progress sequence; save/config frame and backdrop; backlog/editor and gallery controls; original timing/sound cues. Record the reference screenshot and dimensions before replacing fallback CSS. Do not invent an original state from a visual guess.
- Public asset license review still required before release.

## Identified reference assets
- visual-index/data-03.jpg data-101: blue geometric EXTRA backdrop candidate (gallery local preview). The surrounding data-099/100/102 appear related but their exact screen assignments are not established.
- visual-index/data-01.jpg data-021: original grayscale transition rule; local threshold wipe, 320ms provisional timing, no interaction lock, cancels on navigation/reduced motion.
- bgimage2-03.jpg bgimage2-085/086/087: island overview evening/day/night candidates, not confirmed progress-map UI. Do not conflate time-of-day variants with story progression.
- Browser acceptance includes library, gallery modal and reduced-motion config. Run against a real built preview before publishing.

## Reading mode and resume
- `ginka.vn.mode.v1`: explicit game/reader choice. Homepage INDEX opens the journal; article TITLE returns to game mode. Archive routes retain the same URL and switch only the presentation.
- v1 reading state is extended with bounded section-relative positions. Resume is explicit (CONTINUE / LOAD), never automatic on normal links, direct URLs, anchors or browser history.
- Position records store article fraction and heading-relative fraction, not raw viewport pixels. No cloud synchronization. Domain parser and migration tests run before build.
