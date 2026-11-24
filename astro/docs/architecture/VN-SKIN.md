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

## Additional game surfaces
Search has its own route and shares the existing Pagefind loader with the search dialog. MUSIC reads the persistent audio controller and delegates controls to it; the playlist remains in the existing sidebar. BACKLOG exposes the real Giscus iframe and original pathname mapping, without inventing dialogue or introducing an iframe DOM hack. Fullscreen is an explicit browser action. Taxonomy pages use the game choices in game mode and the artbook list in reader mode.

## Map
Map screen uses original complete island overview frames bgimage-124, 125, 126 in optional private preview. Completion phase drives the selected full scene, independently of day/night theme. This is an explicitly provisional adaptation; original map overlays and scenario timing still require the UI/script archive.

## Original script verification (private asset revision e4b85e4)
- 0000063b: backlog open/page/close crossfade 300ms; backlog jump crossfade 1000ms (alternate branch 500ms).
- 00000672: load open/page/close 300ms crossfade.
- 00000681: option open/page/close 300ms crossfade.
- 0000068c: save open/page/close 300ms crossfade.
- 0000064a / 0000069c: CG / sound open/page 300ms crossfade.
- 00000690: scenario selection open/page/close 300ms crossfade.
- 000001f2: original full title logo overlay, bottom-left. This is a UI overlay, not character compositing.
Normal navigation now uses the confirmed crossfade duration; rule-mask transition is opt-in for research rather than applied to all screens. Exact title menu layout and full animation sequencing remain unverified.

## PC option UI calibration
Reference: 2023 PC version review https://weekly.ascii.jp/elem/000/004/165/4165221/2/ and https://oniji.hatenablog.com/entry/2023/11/11/210000 (DISPLAY, PROGRAM, TEXT, DIALOG screenshots). The option screen uses navy header, cyan tab strip, twin-column cyan group captions, white selected controls, diamond footer and the matching local geometric background. Seven tabs follow the original visual taxonomy; only actual blog features are implemented, not simulated VN text/voice/skip settings. Exact button sprite atlas, positions and typography still require measurement. SOUND is part of SYSTEM, not a title menu route; legacy /music-room/ redirects. The persistent player remains mounted in the sidebar but its old UI is hidden, and the option screen delegates real controls, volume and playlist selection. Title primary links follow the game/continue/load/option/extra structure; blog-specific map/search/index/about are reachable from EXTRA.

### Verified option assets
- data-099 (0000077c): actual 1280x720 option background, including HELP WINDOW at x755/y14 and cyan tabs at y111–150.
- 0000077d: original 593x158 controls atlas. The caption and the three button states are sampled via CSS background crops. The fallback skin is retained for the public build; neither file is copied.
- The local desktop layout scales the complete original frame and aligns header, tab strip and footer to its canvas. Touch reflow and adapted settings group placement are intentional departures, not pixel-parity claims.

## Title, choices, load, backlog assets (e4b85e4)
- titleMenu 000007ce: packed 223×245 English title label atlas. Use original menu order and estimated PC screenshot coordinates x72/y250, row 44, at 1280×720. Hover sprites are direct crops; normal text is a browser approximation. Screenshot reference: https://www.9game.cn/news/9224089.html (2023 title capture).
- NEXT appears after completing a blog article when another unread article is available; EXIT switches to reader mode, never closes the browser. INFORMATION opens about; music remains in SOUND.
- choice 000007ca: three 768×87 original choice states; normal/selected/hover, with actual article links.
- saveFrame 000007b6: original 189×123 SAVE DATA frame, with a scene preview, real article title/time/progress, not a screenshot of the article. Gallery backdrop reused as a candidate for load, exact load layout unverified.
- backlogAtlas 00000738: original BACKLOG/SCENE SELECT control sheet; original arrow sprites and candidate dark background 000007b2 are used on the host-side comment surface. Giscus remote iframe content is not modified by private asset URLs. Comment identity, moderation and editor remain native.
- Desktop original title frame hides the journal below it; EXIT returns to the journal. Public fallback remains usable without private assets. Mobile reflow is intentional. Original title hover, save and backlog geometry require browser screenshot validation.

### Native title label unpacking
Pixel inspection of 000007ce confirmed 6073 opaque exact-magenta packing pixels, separate from transparent and antialiased glyph pixels. Both black normal and blue-backed highlight labels now use independently cropped original PNGs. CONTINUE and SYSTEM are packed 90 degrees counter-clockwise and are unpacked clockwise. The private middleware removes only exact opaque magenta, not arbitrary pink/red or translucent edges; source files are unchanged. PNG decoder/crop round-trip fixtures run before build. The earlier note about browser-text normal labels is superseded for desktop local original preview. Mobile and public fallback retain accessible text.

## LOAD native row geometry
- 000007ac is the system base with HELP WINDOW, not the earlier EXTRA backdrop candidate.
- 000007ad contains 589px wide horizontal record and No Data sprites. 0000079d contains English LOAD header, tab states and Back button. Crops are registered in privateUI.slices and emitted only by localhost middleware.
- LOAD displays ten entries per page, actual recent/bookmarked/completed records first, then inactive No Data slots. Two columns × five rows on desktop are a geometry-based adaptation; precise game record ordering and positions require a reference screenshot. Mobile uses one column.
- Gallery uses the original EXTRA base and distinct gallery heading atlas. No new music route.

### OPTION original labels
00000779 contains all seven English tab labels and three visual states, plus Back, Restore Defaults and Back to Title. The atlas is unpacked into individual keyed sprites; tab activation, focus and selection remain native controls. Five original header wordmarks are recovered from 00000741, 00000749, 00000763, 0000076a, 00000772; TEXT and SOUND headings remain text pending exact unpacking. Footer START was removed as a non-original redundant entry. Gallery Back uses the original English diamond artwork. Visual calibration remains pending a browser comparison.
