# GINKA design system
## Authority and workflow
GINKA original game visual language + Obsidian Minimal reading experience + UI UX Pro Max review process. 唯一正式栈为 Astro SSG / TypeScript / 原生 CSS 与 JavaScript；禁止重新引入 Hexo/NexT/PJAX。原作模式固定游戏色彩，以下 day/moonlit tokens 只约束 reader 模式。 Read this master first, then the matching page override. The checked-in implementation is authoritative for runtime values. This is a project-specific adaptation of the upstream skill, not a claimed search-generator result.
Upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill at cc7b20d85d64d8fa022292cfad731995d3cd4eeb. Review order: accessibility, touch/interaction, performance, style consistency, responsive layout, typography/color, motion, feedback, navigation. Dials: variance 4, motion 3, density 5. Do not import generated generic palette blindly.
## Semantic color
| Token | Day | Moonlit | Role |
|---|---|---|---|
| --ink | #263748 | #e2e9f0 | headings |
| --body-text | #344454 | #c2ccd7 | reading |
| --muted | #596c7e | #9aaabc | metadata |
| --blue | #356c91 | #9ac9e8 | links/focus |
| --bg-canvas | #f4f7fa | #111923 | canvas |
| --paper | #fcfdfd | #192431 | reading surface |
| --rule | #dce4eb | #334353 | decorative separators |
| --code-bg | #f6f8fa | #121c29 | code |
| --code-bar | #f0f2f4 | #1b2837 | code tools |

Normal text >=4.5:1, large text >=3:1, required control boundaries/focus >=3:1. Decorative rules are not the only indication of an interactive state. Validate actual backgrounds including overlays and iframe themes, not just token pairs. No arbitrary new component palette; use semantic tokens. Keep art's original colors. Code highlighting remains GitHub Light / Dark Dimmed.
## Typography and geometry
Noto Sans SC/system Chinese sans for body, Noto Serif SC for editorial headings, JetBrains Mono for code, Cormorant Garamond only for small editorial numerals. Body 16px on desktop/mobile; reading line-height 1.85 and maximum 72ch (Chinese reading width is additionally constrained by layout). Code 14px. Metadata 12–13px where practical. Heading hierarchy by spacing and weight. Spacing scale 4/8/12/16/24/32/48/64px, control radius 4px, panels 6px, tags 3px. Existing artbook exceptions documented on page. No horizontal page scrolling; code/tables scroll locally.
## Interaction
Desktop compact controls may remain 30–40px where readable; touch target 44px, aim for 8px spacing without clipping. Every icon-only control has accessible name, meaningful focus and disabled/pressed state. Use real buttons/links, no invented UI. Fixed header must not obscure focused content. Hover is never the only way to operate. Keep useful scrollbars, hide only decorative ones when scrolling is still obvious. Provide loading, error, retry, empty and offline states; never hide a failed feature permanently.
## Motion
Feedback 160ms, panel 240ms; original hero exceptions in home override. Native scrolling, no endless decorative effects, honor reduced motion, pause offscreen/hidden. Astro ClientRouter must not reset persistent music/theme or leave stale locks. No new framework or animation library.
## Release gate
Check 320/390/768/1024/1440/1920 and transition widths, day/moonlit/system, keyboard and touch, focus not obscured, text/controls contrast, overflow, long comments/code, loading/retry, Astro navigation and offline. Run root npm test, npm run typecheck, npm run build, npm run check, real browser tests and live comments. Do not call fixtures live tests. Do not publish new extracted assets without permission. Do not merge/deploy until the intended gate is reviewed.
