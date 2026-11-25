# GINKA private mascot pack

> 当前开发计划与验收状态统一维护于 [TODO.md](TODO.md)；本文保留设计、实现或素材接入契约。

Place this pack in the private assets repository at reference/mascot/manifest.json, or explicitly set GINKA_MASCOT_MANIFEST to an absolute manifest path. Keep all referenced files inside that directory. The local preview mounts only validated assets on loopback and never copies them into dist.

The recovered KAG/TJS index currently establishes UI behavior but does not contain a verified dialogue/voice/portrait crosswalk. Do not guess hashed resource identities, synthesize lines, or crop a character from a title CG. Resolve the PSB scene strings and their associated voice storage IDs, render transparent original character poses from the recovered animation/character resources, and verify the result against the original game. Choose a small spoiler-free subset of genuine GINKA lines with exact text and corresponding audio; post-clear lines must be marked afterstory. Use complete aligned images for base, closed eyes and speaking mouth, all same canvas size. Missing blink/mouth may be null; never mark unrelated frames as expression differences. Audio is original recording converted locally to Ogg/WAV/MP3/M4A, not voice synthesis.

Manifest structure (placeholders only, not a usable pack):

```json
{
  "version": 1,
  "defaultPose": "neutral",
  "poses": {
    "neutral": {
      "character": "child",
      "phase": "main",
      "outfit": "verified outfit ID",
      "expression": "verified expression ID",
      "gesture": "verified gesture ID",
      "motion": [],
      "base": "poses/neutral.png",
      "blink": null,
      "mouth": null,
      "source": "verified original resource ID + frame"
    }
  },
  "lines": [
    {
      "id": "line-001",
      "speaker": "actual speaker",
      "text": "exact recovered original line",
      "pose": "neutral",
      "phase": "main",
      "voice": "voice/line-001.ogg",
      "source": "original script ID + record offset",
      "voiceSource": "original voice storage ID + extracted path",
      "verified": true
    }
  ]
}
```

A local agent must replace every placeholder with verified data. Do not distribute the pack publicly without authorization. The public build contains the shell and settings only, not original voice, dialogue or portraits. Validate with npm run dev:original -- <private-repo> and exercise portrait animation, next/replay/save, independent volume and post-clear gating. The mouth animation uses RMS-driven full-frame switching, not Live2D deformation or phoneme synchronization.

## Character variants
Every pose must declare character=child or adult, outfit, expression, gesture, and phase. These are independent dimensions; do not infer outfit or age from a hashed path. Use stable IDs such as child_<outfit>_<expression>_<gesture> after visual verification. Each pose may include an optional ordered motion array of {"image":"poses/frame.png","ms":120} entries representing verified full-frame original animation; idle frames play after voice ends, while blink/mouth use aligned expression frames. No unverified character/outfit combinations are synthesized. Program settings filter the actual dialogue pool by character and outfit; afterstory variants are excluded until main clear. Lines bind to a concrete pose and exact voice ID. For the extraction agent, produce a contact sheet grouped by character/outfit/gesture, and evidence linking original scenario line and voice, including phase. Keep adult/child nonsexual, spoiler-safe samples. Do not put placeholder text in the real pack.

## Playback lifecycle
Selected-pose images are predecoded; idle motion skips unavailable frames, blink and mouth are mutually exclusive, and switching lines cancels prior animation. First NEXT during text reveal completes that line, subsequent NEXT advances. Hiding a tab pauses voice and finishes reveal; it does not automatically resume audio. Closing the mascot restores launcher focus if focus was inside it. View changes rebind the dialogue to the existing reader or mascot message window. The 30ms reveal and blink intervals remain provisional, not measured original timing. Private reference/animations/dialogue.text_reveal.json at 30b43e7 has duration_ms=null; reference/asset-matches/sound_events.json is unconfirmed. No actual mascot pack was available for validation.

## Canvas validation
The local manifest loader reads PNG IHDR and WebP VP8/VP8L/VP8X dimensions, rejects invalid image headers and requires blink, mouth and motion frames to have the same pixel canvas as their pose base. The served manifest includes derived `canvas: {width,height}` per pose. This checks geometry only; alpha, anchor alignment, expression identity, frame decoding and provenance still need actual original-asset review. Synthetic fixture tests do not certify original portraits.

## 2026-11-25: original layered raster stand (v2)
Private revision 390eae6, reference/mascot/character-rendering-analysis.md and reports/validation.md: .sinfo dress/base/diff, facegroup brow/eye/mouth/cheek, fgalias, AffineSourceStand / StandInfo / getDiffRect. USE_EMOTE=0; no confirmed Live2D model. Text/speaker/voice storage ID recovered, but file mapping and pose semantics remain unverified. Evidence-only v1 (available=false, status=evidence_only, defaultPose=null, empty poses/lines) is accepted as unavailable, serves only a sanitized status, and cannot prevent unrelated original UI preview from starting.

Version 1 complete frames remain compatible. Version 2 uses the same fields except each pose must have verified=true, phaseSource (evidence for its phase), and a nonempty ordered layers array instead of full-frame blink/mouth/motion. Base is the original full canvas (can contain transparent regions). Each layer has slot (pose, face, brow, eye, mouth, cheek, foreground; unique), image (private PNG/WebP), x/y integer placement on base canvas, blend (over or replace, explicit from evidence), source (resource and rectangle evidence), and optional alternate (same part fields, only eye/mouth). Replacement clears the declared image rectangle before drawing; use only where verified, not inferred. Layer array order is the original draw order, not a guessed global order. Sparse layers must fit the base canvas; cropped-outside-canvas sources require pre-normalization. Canvas redraw starts from base, then draws every selected layer; eye/mouth alternatives are independent. No synthesized breathing for v2; automatic blink timing and affine motion remain disabled/pending verified timing and geometry. RMS mouth animation is a blog approximation, not measured original lip sync.

Version 2 line requires verified=true, original source, verified pose, phaseSource, and voice path + voiceSource when mapped. If only the actual text/pose/phase are verified, voice may explicitly be null; no voice history, replay, or save for that line, and no synthetic voice. Do not use silent dialogue to bypass spoiler or pose verification. The current evidence-only pack is still unavailable, not a silent usable pack. The four candidate PNGs have no proven semantic mapping. No original data copied to blog. Fixture checks cover geometry only; real browser composition and playback remain pending.

## Blog-only motion overlay
User-approved subtle dynamic enhancement on top of original raster layering: v2 uses a rigid 1.5px vertical idle cycle (6s), without independent face/limb deformation. If and only if a verified eye alternate exists, a provisional 4–7.5s blink interval with 145ms closed state is allowed; mouth amplitude and blinking are independent, both redraw the same canvas. Reduced-motion and hidden-tab handling pause or disable these effects. These numbers are blog design choices, not original timing; original affine/timing evidence still takes precedence when available.

## Browser integration fixture
`npm run check:mascot-browser` starts a temporary loopback Astro dev instance using generated colored pixels and a test tone only. It checks actual sparse canvas pixels, silent dialogue, voice playback/history/save, phase gating, close/focus and desktop/mobile widths. CI runs it independently before whole-site navigation acceptance. Runtime defers private image downloads until interaction, reuses the decoded current layered pose and filters wardrobe by available lines; media callbacks ignore stale element events. The fixture is not original game verification.

## Original sparse base geometry
Private revision e6891e3 establishes 543/543 exact native filename-hash matches across all six original PBD layer tables (small/medium/large for both forms). v2 optionally accepts a verified `canvas: {width,height}` and `baseRect: {x,y,width,height}` on each pose, allowing the original cropped base image to be drawn at its PBD position without re-encoding. The base rectangle must match the actual decoded image header and remain inside the original canvas; optional layer `width,height` also check original dimensions. Draw order remains explicit. The private source mapping does not by itself certify original visual or audio playback parity.

## Real named assets and wardrobe
Private source revision a3cce50 now contains 20 same-record original voice/stand lines in the default v2 manifest, with 18 poses and ten verified outfit IDs. A pose may have `outfitLabel` for its display name; the stable outfit ID is scoped to character, so child and adult d1 do not collide. Only available lines contribute selectable outfits; afterstory lines remain behind the blog main-clear gate. Actual private full PNG/audio decode passed for both initial and expanded packs in the corresponding workflow steps; original browser acceptance is not yet confirmed. Public VN CI 45538401647 passed typecheck, build, separate synthetic mascot browser at 390/1440, and whole-site acceptance. No original assets in public repository.
