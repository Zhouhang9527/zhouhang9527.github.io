# GINKA dialogue theme

The existing Giscus discussion mapping and authentication are unchanged. The external iframe is themed through the official CSS URL and setConfig message, not parent DOM access.

- The custom theme is loaded automatically on HTTPS if the CSS is available with the correct content type and cross-origin response header (Access-Control-Allow-Origin: * or https://giscus.app). Local HTTP previews intentionally use the Giscus built-in light/dark_dimmed themes unless configured with a publicly reachable HTTPS CSS directory.
- For preview, set `ginka_giscus_theme_base` in a local Hexo config override to an HTTPS directory URL ending in / containing giscus-day.css and giscus-moonlit.css, e.g. a public jsDelivr URL for this exact commit. Remove this override before production if serving the CSS from the site itself. Ensure CORS permits giscus.app.
- Do not publish game UI assets without authorization; these frames use only CSS.

Run `node tools/checks/ginka-dialogue-regression.js` for the isolated theme initialization, iframe handshake and music token regression before building.

## Required browser checks

1. Build from a clean checkout and compare day/moonlit article, index, sidebar, search, right click and comment states at 390 and 1440px.
2. Confirm the comment stylesheet URL returns HTTP 200, text/css, and suitable CORS; check the iframe computed background and text colors.
3. Load a comment-enabled article in both modes before scrolling to Giscus, then toggle theme after it loads, navigate via PJAX, and return. Verify no duplicate iframe or lost input. Test sign in and Markdown preview without posting test comments to production.
4. Check missing custom CSS falls back to built-in light/dark_dimmed and the outer dialogue frame remains readable.
5. Confirm audio is not recreated by theme switch and existing article data remains intact.

## Upstream theme credits

Both giscus theme stylesheets are based on the upstream Giscus light and dark_dimmed theme files with the original MIT notice preserved. GitHub Primer copyright (c) 2018 GitHub Inc.

MIT License

Copyright (c) 2021 Sage M. Abdullah
Copyright (c) 2018 Jeremy Danyow
Copyright (c) 2018 Chris Veness

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

