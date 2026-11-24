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
