# VN skin implementation

> 当前开发计划与验收状态统一维护于 [TODO.md](TODO.md)；本文保留设计、实现或素材接入契约。
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

## Reader actions and backlog
000007b9 provides original English Load / Log / System / Save action buttons with normal, hover and pressed states. Save captures the actual current article position, not a fabricated save image. The original Backlog controls and Back diamond use 00000738 and 00000734. A full-window backlog presentation is entered explicitly with Log; the single existing Giscus iframe stays in place, background siblings become inert, Escape or Back restores focus. Reader mode retains ordinary inline comments. The black base 00000737 is a candidate visually matched to the Backlog group. Private PNGs never enter public output; inner Giscus markup remains cross-origin and is not a pixel-identical game transcript.

## PBD evidence and afterstory
Title 000007cc.pbd.json directly establishes 166×38 logical buttons, x=62, y=240+44*i, exact three-state crops and offsets, and NEW at (11,295). Full logical transparent button sprites are composed by local middleware instead of guessing glyph positions. LOAD and BACKLOG geometry records reference 00000790 and 00000735. Blog NEXT maps to /afterstory/, unlocked after all currently published articles are marked read, permanently until local progress reset; EXTRA title entry unlocks with the same blog flag. This is a deliberate blog adaptation, not a claim that sf.clear and sf.title_next are set together in the original. First visit removes NEW. No afterstory text has been supplied, so the unlocked route explicitly states that content is unpublished. Game surfaces use fixed palette independent of blog reader theme. Timing data is recorded from custom.ks; title animation sequencing still requires implementation/verification.

Title entry now executes the 300ms background, 500ms logo, 500ms hold, 200ms menu sequence and 500ms return, with reduced motion and click/focus skip. The original wipe13 texture and title call audio are not yet mapped; logo uses a temporary opacity reveal. BACKLOG desktop pageup/pagedown/top/end use PBD exact 28×29 atlas slices rather than scaled touch controls. The PBD name/text rectangles are recorded separately; cross-origin Giscus still owns comment text.

## In-game message and quick menu
000007ba (game_window) and 000007b7 (game_qmenu) define the original message frame, small bottom controls, full right-side quick menu, and the exact atlas crop/rotation/offset for each state. Logical sprites are composited by local middleware. The article remains real HTML; the bottom message overlay displays the actual current heading and reading progress, never fake dialogue. SAVE/LOAD, QSAVE/QLOAD (independent local quick record), previous/next heading, auto-scroll, skip to end, log, system, hide and hold have blog-specific functions. Voice replay/save remain disabled because there is no voice narration. ConfirmDialog uses native modal semantics and original base/yes/no art from 0000077e. Reset deletes quick record too. Exact relative geometry is retained on desktop, mobile uses responsive controls. Cross-page quick load, LOAD and SYSTEM use Astro client navigation to preserve the persistent audio element; smoke coverage was added, but real browser execution remains unverified. No original game files are copied into public output.

## Mascot and original voice pack
ATRI is unmounted and its loader is removed from the Astro layout. GINKA mascot runs only when a verified private pack is available. It uses complete aligned base/blink/mouth images (not fabricated face crops), CSS breathing and optional amplitude-driven mouth switching via Web Audio. Clicking advances through curated original voiced lines, with a 30ms character reveal and original message frame; in game-mode article the existing PBD message frame displays the dialogue instead of a bubble. Voice replay/save buttons are enabled once a real allowed line has been selected; SOUND contains separate voice volume, mute, replay and saved lines. Original audio and text are not copied into the blog repository. Afterstory lines require the local main-clear flag. Missing private pack is a graceful unavailable state, not a fabricated voice or portrait. See MASCOT-PACK.md for local extraction and schema.

## Video reference and PBD extraction (asset revision 30b43e7)
- Private reference/README.md, layouts/title.json, layouts/dialogue.json and asset-matches/title_menu.json establish only title/dialogue coverage. Locked NEXT is absent in the observed title, EXTRA is grey, START hover is white text. The per-control pixel projection is not a reliable replacement for original PBD bounds. Keep locked NEXT's logical slot but hide its label in original preview; retain explanatory public fallback. No changed hover sprite until atlas/pixel comparison.
- Dialogue bottom window, name, button strip, wait indicator and particles are observed; no exact bounds or text reveal timing measured. Do not copy video overlays/subtitles into game UI. Other nine screens have no video evidence; script/PBD remains authoritative.
- tools/pbd-ui.mjs decodes typed PBD nodes and normalizes control kind, bounds, states, crop, rotation, offset, logical size, storage and opaque actions. Original evals/exp remain data. Per-file language variants remain separate (automatic merge not implemented). tools/extract-pbd-ui.mjs scans the identified UI container incrementally, emits source hashes and errors outside blog repo only. Real source checks: 000007cc: 16 controls; 000007ba: 18; 0000077e: 5; 00000790: 32; 000007b7: 14; 00000735: 22; 00000740: 62. The generator is not wired into the browser yet; local full batch and geometry parity remain pending.

### Shared control rendering
`src/lib/vn-control.ts` converts source rectangles relative to their logical parent and resolves only named sprite states in private mode. Title row geometry, bottom and quick controls and confirmation sprite states share it. `composeLogicalSprite` preserves the original control canvas and offset for both title and logical sprites. The current game controls remain native links/buttons; arbitrary original script actions are not evaluated. Generic text/slider/base/layer controls are still pending.

### Manual save slots
SAVE opens `/library/?mode=save` with a session-local snapshot of the actual current article, title and section-relative position. LOAD defaults to 150 independent manual slots (15 pages of ten); quick save remains a single independent blog record, recent/bookmarked/completed lists are still available. Overwrite/delete/load are confirmed; corrupt records are discarded and the same-tab restore ticket is consumed once. SAVE header currently uses readable text, not the original LOAD wordmark; no screenshot is invented. Browser and original UI verification pending.

### Voiced dialogue history
BACKLOG contains separate real comments and private original dialogue views. The dialogue tab is available only with a valid local pack; the Giscus container remains in the same DOM location and is restored on close. Only successfully started audio playback contributes a bounded history of line IDs, timestamps and route context; text is resolved from the validated private pack on demand. Afterstory gating applies to history, replay and favorites. Replay and V.SAVE use the existing voice controller, and resetting reading progress removes dialogue history. Actual voice-pack testing remains pending.

### Original source audit and title departure
Against private revision 30b43e7, 249 comparisons of title, bottom message controls, quick menu and confirmation geometry/crops/rotation/offsets/logical sizes matched exactly. `npm run audit:original -- <private-repo>` reproduces these checks, adds original action and NEW badge checks, and fails on mismatches without exporting scripts. Reader controls use an exact SystemAction allowlist, not dynamic evaluation. `custom.ks` 00000210.txt, title_hide/title_fadeout (1000ms) and 00000891.txt's START/NEXT branch establish the original scene departure; the blog now fades to black for START/NEXT using the verified duration, with Escape/second click/reduced-motion and cancellation support. The persistent blog BGM is not faded or replaced by a guessed original track. The reference video's 1300–1500ms interval is a candidate detection window, not a measured total duration. No new private resources in the blog.
