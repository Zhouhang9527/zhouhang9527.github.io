# GINKA dialogue

One compact game-style introduction precedes the normal theme-aware Giscus iframe. The dialogue frame never grows with comments. The original local PNG crop is documented in GINKA_SCENES.md; normal builds use the same structure with CSS art.

Giscus uses the existing repository, category and pathname mapping in _config.next.yml. The old hexo-next-giscus plugin injection is disabled; source/js/ginka-comments.js loads the official client only when the comment container approaches the viewport. It has a real nonzero placeholder, a retry action, and PJAX-scoped observation. No inline script exception is required. Theme URLs are validated and the built-in theme remains available as fallback.

Run npm run check:dialogue, npm run check:inline, and the browser regression after a clean build. Verify comments, theme switch, navigation and login in a real browser; never post test comments to the production repository.
