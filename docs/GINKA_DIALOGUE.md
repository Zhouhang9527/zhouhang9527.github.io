# GINKA dialogue

One compact game-style introduction precedes the normal theme-aware Giscus iframe. The dialogue frame never grows with comments. The original local PNG crop is documented in GINKA_SCENES.md; normal builds use the same structure with CSS art.

Giscus uses the existing repository, category and pathname mapping in _config.next.yml. The old hexo-next-giscus plugin injection is disabled; source/js/ginka-comments.js loads the official client only when the comment container approaches the viewport. It has a real nonzero placeholder, a retry action, and PJAX-scoped observation. No inline script exception is required. Theme URLs are validated and the built-in theme remains available as fallback.

Run npm run check:dialogue, npm run check:inline, and the browser regression after a clean build. Verify comments, theme switch, navigation and login in a real browser; never post test comments to the production repository.

## Dialogue log

Both Giscus theme files target the current upstream Comment, Reply, and CommentBox class structure. The actual remote comments use a dark dialogue gradient, butterfly name line, retained avatar and time, and readable Markdown; replies and reply editors stay inside the same dialogue surface. Both the real comment list and the global/reply editor retain the same dark game-dialogue surface in day and moonlit; the surrounding widget still follows the site theme. The existing checked-in butterfly icon is embedded in the CSS, not newly extracted game UI. The original local intro is separate; its corner is now a circular loading indicator, not a triangle. Only active loading animates; reduced motion disables rotation. Live Giscus uses an HTTPS CSS URL; a local HTTP-only server cannot directly supply that stylesheet to giscus.app.

The checked-in public CSS is pinned in `ginka_giscus_theme_base` to an immutable jsDelivr revision. This makes the same theme available to HTTP local previews and HTTPS deployments without exposing the local game files. Update the pin after changing either CSS file. If the CDN cannot be reached, the loader retains the native theme rather than breaking the comment widget.

The composer uses the upstream form, not a decorative overlay: its write/preview tabs become a butterfly name-line toolbar, the textarea and Markdown preview sit directly on the gradient, and the bottom actions are quiet game-style text controls. No fake user name or new actions are introduced. The CSS fixture covers editor visibility, the toolbar line, disabled state and text input; live GitHub login and posting remain separate verification.
