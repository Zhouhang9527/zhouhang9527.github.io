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
