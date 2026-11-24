# GINKA dialogue

The real Giscus comment list and editor constitute the entire dialogue area, aligned to the article text. No introductory scene, fictional speaker, or decorative message is rendered. Previously extracted local UI assets remain available for reference only.

Giscus uses the existing repository, category and pathname mapping in _config.next.yml. The old hexo-next-giscus plugin injection is disabled; source/js/ginka-comments.js loads the official client only when the comment container approaches the viewport. It has a real nonzero placeholder, a retry action, and PJAX-scoped observation. No inline script exception is required. Theme URLs are validated and the built-in theme remains available as fallback.

Run npm run check:dialogue, npm run check:inline, and the browser regression after a clean build. Verify comments, theme switch, navigation and login in a real browser; never post test comments to the production repository.

## Dialogue log

Both Giscus theme files target the current upstream Comment, Reply, and CommentBox class structure. Previously published comments are grouped in a single Backlog-inspired dark reading panel with transparent rows, thin separators, real author names, avatars and timestamps. Replies retain their actual nesting, and the composer remains an independent game-style gradient textbox. No opening message, synthetic dialogue, voice playback, fake navigation or scroll lock is introduced. The exact original Backlog atlas is not confirmed; the layout is a provisional CSS interpretation, not an asset-level reproduction. The existing checked-in butterfly icon is embedded in the CSS, not newly extracted game UI. Only the real loading indicator is shown while comments load; reduced motion disables rotation. Live Giscus uses an HTTPS CSS URL; a local HTTP-only server cannot directly supply that stylesheet to giscus.app.

The checked-in public CSS is pinned in `ginka_giscus_theme_base` to an immutable jsDelivr revision. This makes the same theme available to HTTP local previews and HTTPS deployments without exposing the local game files. Update the pin after changing either CSS file. If the CDN cannot be reached, the loader retains the native theme rather than breaking the comment widget.

The composer uses the upstream form, not a decorative overlay: its write/preview tabs become a butterfly name-line toolbar, the textarea and Markdown preview sit directly on the gradient, and the bottom actions are quiet game-style text controls. No fake user name or new actions are introduced. The CSS fixture covers editor visibility, the toolbar line, disabled state and text input; live GitHub login and posting remain separate verification.
