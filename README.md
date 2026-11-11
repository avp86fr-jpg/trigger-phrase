# METAWINNERS: TRIGGER PHRASE

Fan-made old-school arcade light-gun shooter in the browser.

**Play:** [https://avp86fr-jpg.github.io/trigger-phrase/](https://avp86fr-jpg.github.io/trigger-phrase/)

Chaos's 25-word seed just rugged the timeline. Click to shoot. Hold cover to reload. Don't type the phrase.

## How to play

- Click or tap — shoot
- Right-click, Space, C, or Shift (or the COVER button) — hide and reload
- Esc / P — pause
- M — mute
- F / FULL SCREEN — toggle fullscreen
- Shoot incoming projectiles to deny them, or hold cover until they pass.
- Blue badges mark civilians: protect them for a safe-exit bonus.
- Boss countdowns are guarded. Fire during recovery, or hit the cyan core in later phases.

25 stages in five chapters, six boss attack families, and a comic-strip story. Easy, Normal, and Hard. No account, no wallet, play chips only.

## Disclaimer

Fan-made tribute. Not affiliated with MetaWinners, MetaWin, HIT, or any studio. Official character likenesses are used as reference only. Play chips only — this is a game, not a wallet, a drop, or a form. Never type a real seed phrase into a website.

## Local run

Serve this folder with any static server (for example `python3 -m http.server`) and open `index.html`.

## Asset optimization checks

After adding or changing game images, run `node scripts/build-asset-aliases.cjs`.
This regenerates `src/asset-aliases.js` from SHA-256 hashes of the current art.
Only byte-identical files share a URL; original files and animation pose keys remain available.

Run `node scripts/build-asset-aliases.cjs --check` and `node --test tests/*.test.cjs`
before deploying. The tests check alias freshness and byte equality, loader failure/retry
behavior, parallel startup, and all 25 stage loading/render paths with mocked browser
primitives. Printed asset budgets are source-file totals, not measured network timings or FPS.

## Campaign design and validation

See [campaign-design.md](docs/campaign-design.md) for the chapter route, encounter
and boss design, save compatibility, and browser playtest checks. Stage IDs,
word order, and the existing save key are preserved. The campaign follows the
recovered sentence through rifts rather than moving chronologically.
