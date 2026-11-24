import io

p = 'source/css/ginka-runtime.css'
s = io.open(p, encoding='utf-8').read()
before = s

repl = []

repl.append((
"""#music-player-main {
  background: linear-gradient(145deg,
    rgba(255, 255, 255, 0.94) 0%,
    rgba(233, 244, 255, 0.88) 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.72) !important;
  backdrop-filter: blur(18px) saturate(165%) !important;
  -webkit-backdrop-filter: blur(18px) saturate(165%) !important;
  box-shadow: 0 16px 36px rgba(91, 155, 213, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}

#music-player-main:hover {
  box-shadow: 0 16px 40px rgba(91, 155, 213, 0.23), 0 8px 18px rgba(0, 0, 0, 0.1) !important;
}""",
"""#music-player-main {
  background: var(--music-panel) !important;
  border: 1px solid var(--music-border) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow: 0 10px 28px #0a12201f !important;
}

#music-player-main:hover {
  box-shadow: 0 12px 32px #0a122029 !important;
}"""))

repl.append((
"""#music-title {
  color: #284560 !important;
  font-weight: 700 !important;
  text-shadow: none;
}""",
"""#music-title {
  color: var(--music-title) !important;
  font-weight: 700 !important;
  text-shadow: none;
}"""))

repl.append((
"""  background: rgba(255, 255, 255, 0.62) !important;
  border-color: rgba(154, 196, 232, 0.4) !important;
  color: #3b7ab2 !important;
}""",
"""  background: var(--music-surface) !important;
  border-color: var(--music-border) !important;
  color: var(--music-accent) !important;
}"""))

repl.append((
"""  color: #3b7ab2 !important;
}""",
"""  color: var(--music-accent) !important;
}"""))

repl.append((
"""  border: 1px solid rgba(154, 196, 232, 0.4);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  box-shadow: 0 2px 8px rgba(91, 155, 213, 0.1);
  flex-shrink: 0;
}""",
"""  border: 1px solid var(--music-border);
  background: var(--music-surface);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: none;
  flex-shrink: 0;
}"""))

repl.append((
"""  -webkit-appearance: none;
  background: rgba(91, 155, 213, 0.28);
  outline: none;
  cursor: pointer;
}""",
"""  -webkit-appearance: none;
  background: var(--music-track);
  outline: none;
  cursor: pointer;
}"""))

repl.append((
"""  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(145deg, #5b9bd5 0%, #7eb8e6 100%);
  box-shadow: 0 2px 7px rgba(59, 122, 178, 0.32);
}

#music-volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(91, 155, 213, 0.28);
}

#music-volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(145deg, #5b9bd5 0%, #7eb8e6 100%);
  box-shadow: 0 2px 7px rgba(59, 122, 178, 0.32);
}""",
"""  border: 1px solid var(--music-bg);
  background: var(--music-accent);
  box-shadow: none;
}

#music-volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--music-track);
}

#music-volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--music-bg);
  background: var(--music-accent);
  box-shadow: none;
}"""))

repl.append((
"""#music-play-mode-toggle.is-active {
  background: rgba(126, 184, 230, 0.36) !important;
  border-color: rgba(91, 155, 213, 0.56) !important;
  box-shadow: 0 6px 14px rgba(91, 155, 213, 0.2) !important;
}""",
"""#music-play-mode-toggle.is-active {
  background: var(--music-hover) !important;
  border-color: var(--music-accent) !important;
  color: var(--music-accent) !important;
  box-shadow: none !important;
}"""))

repl.append((
"""  color: rgba(61, 96, 128, 0.85);
  font-weight: 500;""",
"""  color: var(--music-muted);
  font-weight: 500;"""))

repl.append((
"""  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background: linear-gradient(145deg,
    rgba(255, 255, 255, 0.93) 0%,
    rgba(232, 244, 255, 0.88) 100%);
  backdrop-filter: blur(20px) saturate(175%);
  -webkit-backdrop-filter: blur(20px) saturate(175%);
  box-shadow: 0 16px 34px rgba(91, 155, 213, 0.18), 0 10px 20px rgba(0, 0, 0, 0.12);
  z-index: 52;""",
"""  border-radius: 18px;
  border: 1px solid var(--music-border);
  background: var(--music-panel);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 16px 34px #0a122033;
  z-index: 52;"""))

repl.append((
"""  color: #5b9bd5;
  border-bottom: 1px solid rgba(91, 155, 213, 0.22);""",
"""  color: var(--music-title);
  border-bottom: 1px solid var(--music-border);"""))

repl.append((
"""  border: 1px solid rgba(91, 155, 213, 0.22);
  background: rgba(91, 155, 213, 0.12);
  color: #5b9bd5;""",
"""  border: 1px solid var(--music-border);
  background: var(--music-surface);
  color: var(--music-title);"""))

repl.append((
"""  scrollbar-color: rgba(91, 155, 213, 0.5) transparent;""",
"""  scrollbar-color: var(--music-border) transparent;"""))

repl.append((
"""  border-radius: 999px;
  background: linear-gradient(180deg, rgba(126, 184, 230, 0.8), rgba(91, 155, 213, 0.8));
}""",
"""  border-radius: 999px;
  background: var(--music-border);
}"""))

repl.append((
"""  background: rgba(255, 255, 255, 0.5);
  color: #2f4358;
  text-align: left;""",
"""  background: transparent;
  color: var(--music-text);
  text-align: left;"""))

repl.append((
""".music-playlist-item:hover {
  background: rgba(91, 155, 213, 0.18);
  border-color: rgba(91, 155, 213, 0.24);
  transform: translateY(-1px) translateX(1px);
  box-shadow: 0 8px 18px rgba(91, 155, 213, 0.14);
}""",
""".music-playlist-item:hover {
  background: var(--music-hover);
  border-color: var(--music-border);
  transform: none;
  box-shadow: none;
}"""))

repl.append((
""".music-playlist-item.is-active {
  background: linear-gradient(135deg, rgba(91, 155, 213, 0.3), rgba(126, 184, 230, 0.22));
  border-color: rgba(91, 155, 213, 0.42);
  box-shadow: 0 10px 22px rgba(91, 155, 213, 0.2);
}""",
""".music-playlist-item.is-active {
  background: var(--music-hover);
  border-color: var(--music-accent);
  box-shadow: none;
}"""))

repl.append((
""".music-playlist-title {
  font-size: 12px;
  font-weight: 700;
  color: #2f4358;
}""",
""".music-playlist-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--music-title);
}"""))

repl.append((
""".music-playlist-meta {
  font-size: 12px;
  color: #55738f;
}""",
""".music-playlist-meta {
  font-size: 12px;
  color: var(--music-muted);
}"""))

repl.append((
"""  border: 1px solid rgba(91, 155, 213, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.55);
  color: #386d99 !important;""",
"""  border: 1px solid var(--music-border);
  border-radius: 4px;
  background: var(--music-surface);
  color: var(--music-text) !important;"""))

repl.append((
"""body #journal-sidebar .music-source-retry:hover,
body #journal-sidebar .music-source-retry:focus-visible {
  background: rgba(91, 155, 213, 0.16);
}""",
"""body #journal-sidebar .music-source-retry:hover,
body #journal-sidebar .music-source-retry:focus-visible {
  background: var(--music-hover);
  color: var(--music-accent) !important;
}"""))

repl.append((
"""  border: 1px solid rgba(255, 255, 255, 0.76);
  background: linear-gradient(145deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(232, 244, 255, 0.9) 100%);
  backdrop-filter: blur(20px) saturate(175%);
  -webkit-backdrop-filter: blur(20px) saturate(175%);
  box-shadow: 0 16px 34px rgba(91, 155, 213, 0.18), 0 9px 18px rgba(0, 0, 0, 0.12);""",
"""  border: 1px solid var(--music-border);
  background: var(--music-panel);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 16px 34px #0a122033;"""))

repl.append((
"""  color: rgba(59, 122, 178, 0.95);
  font-size: 12px;""",
"""  color: var(--music-muted);
  font-size: 12px;"""))

repl.append((
"""#music-lyrics-track {
  font-weight: 700;
  color: #2c465f;""",
"""#music-lyrics-track {
  font-weight: 700;
  color: var(--music-title);"""))

repl.append((
"""  color: rgba(48, 68, 88, 0.82);
  font-size: 14px;""",
"""  color: var(--music-text);
  font-size: 14px;"""))

repl.append((
"""  font-weight: 500;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}""",
"""  font-weight: 500;
  text-shadow: none;
}"""))

repl.append((
"""  color: #1f5d95;
  opacity: 1;
  transform: scale(1.01);
  font-weight: 700;
  text-shadow: 0 0 10px rgba(91, 155, 213, 0.2);
}""",
"""  color: var(--music-accent);
  opacity: 1;
  transform: scale(1.01);
  font-weight: 700;
  text-shadow: none;
}"""))

miss = 0
for old, new in repl:
    if old not in s:
        miss += 1
        print('MISS:', old.strip().split('\n')[0][:70])
        continue
    s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('misses=', miss, 'changed=', s != before)
