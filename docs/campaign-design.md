# Campaign and combat pass

The player follows the torn sentence through rifts, not a chronological timeline.
Each stage recovers the next word. Stage IDs, the 25-word order, character likenesses,
and the existing save key remain stable.

## Chapter route

| Chapter | Stages | Campaign purpose |
| --- | --- | --- |
| The Fracture | 1–5 | Learn threat reading, cover, civilian protection, shields, and projectile denial. |
| The Keepers | 6–10 | Break defensive lines, read ambushes, and manage guarded boss exchanges. |
| False Signals | 11–15 | Distinguish long-range threats, moving targets, and civilians across contrasting settings. |
| The Infection | 16–20 | Combine precision, armored threats, ambushes, and supply timing. |
| Close the Rift | 21–25 | Recombine learned encounters, then face the Echo's alternating aimed and orb attacks. |

Every stage has a unique encounter order and a concrete objective. The encounter
building blocks are reusable, but their order, setting, entrances, roles, supplies,
and boss counter define each route in `src/campaign.js`. A short reload interval
separates encounters. The chapter map places five stages in each chapter row.

## Combat contract

- Every enemy attack uses an aim countdown, including throwers.
- Easy, Normal, and Hard allow at most one, two, and three concurrent aim/shoot
  states respectively. Nearby enemies also yield to an already aiming neighbor.
- Bosses guard body hits during their aim countdown. Their recovery is a firing
  window; cyan-core hits in phases two and three bypass that guard.
- Duelists throw steel; precision bosses take single aimed shots; barrage bosses
  fire fans; pulse bosses use slower orbs; summoners receive one guard at the
  phase-two transition; the Echo alternates aimed fire and orb volleys.
- Projectiles live long enough to reach their target at their actual speed.
  Cover and shooting them remain valid counters.
- Civilian markers are consistently blue and successful exits award 250 points.
- Shot accuracy counts successful trigger pulls, so pellets and piercing cannot
  inflate it beyond 100%. Best grades survive lower-grade replays.

## Visual decisions

Existing painted scenes and likenesses are retained. No new raster downloads are
needed for this pass. The gilded keep is now a courtyard breach, matching its
painted scene, and Cabinet Kingdom takes place in cabinet aisles. Rome uses its
own civilian art. Period throws use a steel projectile silhouette; energy attacks
use cyan orbs; gun attacks retain their warm muzzle flash. Civilian and threat
markers differ in text, shape, and color. The boss core is drawn at its actual hit
coordinates rather than being displaced by the sprite transform.

## Save compatibility

Recovered fragments are tracked by stage ID, preserving repeated words such as
NOT and YOUR. Older saves migrate from their unlock frontier and recorded grades.
The final word remains visible after stage 25. Replays preserve the best grade,
and the checkpoint advances to the next stage.

## Validation and limits

Run `node --test tests/*.test.cjs` and `node scripts/build-asset-aliases.cjs --check`.
The deterministic test harness executes the actual engine with mocked browser and
canvas primitives. It checks campaign structure, attack slots, boss guards,
projectile cover, rescues, armor, scoring, legacy saves, chapter hit targets, and
full scripted pistol clears of all 25 stages on Easy, Normal, and Hard.

These are code-level regression checks. They do not establish visual quality,
human difficulty, touch comfort, audio balance, FPS, or real-browser correctness.
The modified build still needs browser playtesting; local Chromium launch is
blocked by this execution environment's socket permissions.

Before merging, play stages 1, 3, 8, 13, 15, 20, and 25 on desktop and a touch
device; inspect all 25 stage cards and chapter map targets; check readable cue
sizes in portrait/landscape, fullscreen, and reduced effects; verify that boss
cores line up with shots; and load an existing save, complete a repeated-word
stage, replay it, and finish the last word. Tune human pacing from those results.
